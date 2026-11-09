import { useEffect, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { OUT_EXPO, SPRING } from "../motion";
import { APP_URL, LINE_CTA, LINE_URL, PRIMARY } from "../content";
import { Button, ICONS, SCREENS } from "../ui";
import { ILLUSTRATION, photo, type PhotoSlot } from "../photos";
import { BillPrint } from "./BillPrint";
import paper from "../assets/screens/paper.webp";

/**
 * Hero after fastwork.com, kept calm: twelve straight cards ring the headline on wide screens, three sit under
 * it below 1280px. Only the cash bill carries depth, it is the page's one bright element. Nothing moves on its
 * own except the word in the headline (and the cards it names), which pauses under the pointer or focus and stops
 * after two loops.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const WORDS = ["สต็อก", "ใบจอง", "บิลเงินสด"] as const;
const HOLD_MS = 3000;

// Two full loops, then it rests on the first word (WCAG 2.2.2: moving content stops by itself)
const MAX_STEPS = WORDS.length * 2;

/** The headline word steps every 3s, holds while `paused` (pointer over or focus inside the hero), and stops after two loops. */
function useWordCycle(paused: boolean): number {
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || paused || step >= MAX_STEPS) return;
    const id = window.setTimeout(() => setStep(step + 1), HOLD_MS);
    return () => window.clearTimeout(id);
  }, [step, reduce, paused]);
  return reduce ? 0 : step % WORDS.length;
}

/**
 * The slot keeps the width of the longest word (all three are stacked in one grid cell, invisibly), so the
 * words around it never move. The wave hangs under it at the same width.
 */
function RotatingWord({ index }: { index: number }) {
  return (
    <span data-rotating-word className="relative inline-grid font-semibold text-[#e2640f]">
      {WORDS.map((w) => (
        <span key={w} className="invisible col-start-1 row-start-1 whitespace-nowrap">{w}</span>
      ))}
      <AnimatePresence initial={false}>
        <motion.span
          key={index}
          className="col-start-1 row-start-1 text-center whitespace-nowrap"
          initial={{ opacity: 0, y: "0.45em", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: OUT_EXPO } }}
          exit={{ opacity: 0, y: "-0.35em", filter: "blur(6px)", transition: { duration: 0.35, ease: EASE } }}
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
      <svg
        data-word-wave
        aria-hidden
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-[1.12em] h-[0.2em] w-full overflow-visible"
      >
        {/* the underline draws itself again under each new word */}
        <motion.path
          key={index}
          d="M2 11C60 2 136 2 198 7"
          fill="none"
          stroke="#ff8032"
          strokeWidth="4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="xl:[stroke-width:5]"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1, transition: { duration: 0.9, ease: OUT_EXPO, delay: 0.1 } }}
        />
      </svg>
    </span>
  );
}

/* ---------------------------------------------------------------- the cards */

type Kind = "photo" | "screen";

/** A crop of a 393×852 app screen: `top` is the share of the screen scrolled past. */
function ScreenCrop({ src, top, eager = true }: { src: string; top: number; eager?: boolean }) {
  return <img src={src} alt="" loading={eager ? "eager" : "lazy"} className="w-full" style={{ transform: `translateY(-${top * 100}%)` }} />;
}

/**
 * One frame for every card: picture on top, caption below. `lead` makes it the one card with depth and dark
 * text, and replaces the picture (the printing bill, BillPrint).
 */
export function HeroCard({
  kind,
  src,
  top = 0.05,
  title,
  sub,
  lead,
  eager = false,
  className = "",
  style,
  focus = false,
  rank = 0,
  depth,
}: {
  kind: Kind;
  src?: string;
  top?: number;
  title: string;
  sub?: ReactNode;
  lead?: ReactNode;
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
  /** lifted forward while the headline names what this card shows */
  focus?: boolean;
  /** entrance order, nearest the headline first */
  rank?: number;
  /** pointer offset for this card's layer, wide screens only */
  depth?: { x: MotionValue<number>; y: MotionValue<number> };
}) {
  const delay = 0.25 + rank * 0.07;
  // the entrance waits its turn; later focus changes spring straight away
  const [entered, setEntered] = useState(false);
  return (
    <motion.div
      data-hero-card
      data-lead={lead ? "" : undefined}
      data-focus={focus ? "" : undefined}
      className={`hero-card flex shrink-0 flex-col gap-2 rounded-2xl border border-line bg-white p-2 ${lead ? "z-10 shadow-[0_24px_48px_-12px_rgb(15_23_42/0.2)]" : ""} ${className}`}
      style={{ ...style, x: depth?.x, y: depth?.y }}
      initial={{ opacity: 0, scale: 0.86, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: focus ? 1.045 : 1, filter: "blur(0px)" }}
      transition={{
        opacity: { duration: 0.9, ease: OUT_EXPO, delay },
        filter: { duration: 0.9, ease: OUT_EXPO, delay },
        scale: { ...SPRING, delay: entered ? 0 : delay },
      }}
      onAnimationComplete={() => setEntered(true)}
    >
      <div data-hero-img className="overflow-hidden rounded-lg bg-subtle">
        {lead ??
          (kind === "photo" ? (
            src && <img src={src} alt="" loading={eager ? "eager" : "lazy"} className="size-full object-cover" />
          ) : (
            src && <ScreenCrop src={src} top={top} eager={eager} />
          ))}
      </div>
      <p className="px-1 pb-1 text-sm leading-snug">
        <span className={`block ${lead ? "text-lg font-semibold text-ink" : "font-medium text-muted"}`}>{title}</span>
        {sub && <span className={`block text-muted ${lead ? "text-base" : ""}`}>{sub}</span>}
      </p>
    </motion.div>
  );
}

const ILLUS = ILLUSTRATION ? "ภาพประกอบ" : undefined;

type Spot = {
  id: string;
  kind: Kind;
  src: string | undefined;
  top?: number;
  title: string;
  sub?: ReactNode;
  // place on the 1440×900 design: left, top, card width, picture height
  x: number;
  y: number;
  w: number;
  h: number;
  // below 1280px: place in the row, width and picture height on phones, then from 768px
  row?: { order: 1 | 3; w: number; h: number; wMd: number; hMd: number };
};

const pic = (slot: PhotoSlot) => photo(slot);

// HERO_LEFT and HERO_RIGHT in design/build_landing_v3.py. Screens are mapped to the app shots the landing has.
const SPOTS: Spot[] = [
  { id: "front", kind: "photo", src: pic("type-front"), title: "ขายส่งหน้าร้าน", sub: ILLUS, x: -56, y: 76, w: 216, h: 210, row: { order: 1, w: 150, h: 170, wMd: 220, hMd: 210 } },
  { id: "stock", kind: "screen", src: SCREENS.stock.src, top: 0.06, title: "สต็อกแยกไซซ์ สี", sub: "ในแอป", x: -56, y: 372, w: 216, h: 230 },
  { id: "new", kind: "photo", src: pic("type-new"), title: "ล็อตใหม่เข้าร้าน", sub: ILLUS, x: -56, y: 688, w: 216, h: 200 },
  { id: "home", kind: "screen", src: SCREENS.home.src, top: 0.05, title: "ยอดขายวันนี้", sub: "ในแอป", x: 176, y: -40, w: 204, h: 240, row: { order: 3, w: 150, h: 170, wMd: 220, hMd: 210 } },
  { id: "variants", kind: "photo", src: pic("type-variants"), title: "หลายรุ่น หลายสี", sub: ILLUS, x: 176, y: 286, w: 204, h: 230 },
  { id: "reserve", kind: "screen", src: SCREENS.reserve.src, top: 0.17, title: "จองไว้ก่อน", sub: "ของไม่ถูกขายซ้ำ", x: 176, y: 602, w: 204, h: 150 },
  { id: "line", kind: "photo", src: pic("type-line"), title: "รับออเดอร์ทาง LINE", sub: ILLUS, x: 1064, y: -10, w: 204, h: 130 },
  { id: "confirm", kind: "screen", src: SCREENS["bill-confirm"].src, top: 0.36, title: "ยืนยันออเดอร์", sub: "ตัดสต็อกให้เอง", x: 1064, y: 650, w: 204, h: 170 },
  { id: "counter", kind: "photo", src: pic("closing"), title: "เคาน์เตอร์หน้าร้าน", sub: ILLUS, x: 1288, y: -10, w: 216, h: 130 },
  { id: "low", kind: "screen", src: SCREENS.home.src, top: 0.45, title: "ของใกล้หมด", sub: "รู้ก่อนลูกค้าถาม", x: 1396, y: 230, w: 216, h: 230 },
  { id: "count", kind: "photo", src: pic("hero"), title: "เช็กสต็อกด้วยมือถือ", sub: ILLUS, x: 1288, y: 650, w: 216, h: 170 },
];

// HERO_LEAD: the cash bill, the one bright card
const LEAD = { x: 1064, y: 212, w: 316, h: 340, row: { w: 207, h: 216, wMd: 300, hMd: 288 } };

/** CSS variables that place a card (see .hero-card in index.css). */
function place(s: { x: number; y: number; w: number; h: number; row?: { w: number; h: number; wMd: number; hMd: number } }): CSSProperties {
  return {
    "--x": `${s.x + s.w / 2 - 720}px`,
    "--y": `${s.y - 450}px`,
    "--xw": `${s.w}px`,
    "--xh": `${s.h}px`,
    "--rw": `${s.row?.w ?? s.w}px`,
    "--rh": `${s.row?.h ?? s.h}px`,
    "--rw-md": `${s.row?.wMd ?? s.w}px`,
    "--rh-md": `${s.row?.hMd ?? s.h}px`,
  } as CSSProperties;
}

// Which headline word each card belongs to: 0 สต็อก, 1 ใบจอง, 2 บิลเงินสด. The lead bill is 2.
const TOPIC: Record<string, number> = { stock: 0, low: 0, count: 0, new: 0, variants: 0, reserve: 1, line: 1, front: 1, home: 2, confirm: 2, counter: 2 };
// Entrance order: the cards nearest the headline come first, then outward
const centre = (s: Spot) => Math.hypot(s.x + s.w / 2 - 720, s.y + s.h / 2 - 450);
const RANK = Object.fromEntries([...SPOTS].sort((a, b) => centre(a) - centre(b)).map((s, i) => [s.id, i + 1]));
// How far each card drifts with the pointer: outer cards are "closer" and move more
const DEPTH = Object.fromEntries(SPOTS.map((s) => [s.id, 10 + Math.min(1, centre(s) / 760) * 22]));

/** One pointer-driven layer for a card: the spring-smoothed pointer times the card's depth. */
function useLayer(px: MotionValue<number>, py: MotionValue<number>, depth: number) {
  const x = useTransform(px, (v) => v * -depth);
  const y = useTransform(py, (v) => v * -depth);
  return { x, y };
}

function LayeredCard({ spot, px, py, focus }: { spot: Spot; px: MotionValue<number>; py: MotionValue<number>; focus: boolean }) {
  const depth = useLayer(px, py, DEPTH[spot.id]);
  return (
    <HeroCard
      kind={spot.kind}
      src={spot.src}
      top={spot.top}
      title={spot.title}
      sub={spot.sub}
      eager={!!spot.row}
      className={spot.row ? `mt-8 md:mt-10 xl:mt-0 ${spot.row.order === 1 ? "order-1" : "order-3"}` : "hidden xl:flex"}
      style={place(spot)}
      focus={focus}
      rank={RANK[spot.id]}
      depth={depth}
    />
  );
}

/** Headline lines rise out of a blur one after another */
const line = (i: number) => ({
  initial: { opacity: 0, y: 22, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 1, ease: OUT_EXPO, delay: 0.05 + i * 0.09 },
});

export function Hero() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = useWordCycle(hovered || focused);
  const reduce = useReducedMotion();
  // pointer position from the centre, -0.5..0.5, eased by a soft spring
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, { stiffness: 50, damping: 18, mass: 0.8 });
  const py = useSpring(rawY, { stiffness: 50, damping: 18, mass: 0.8 });
  const leadDepth = useLayer(px, py, 6);
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse" || !window.matchMedia("(min-width: 1280px)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - r.left) / r.width - 0.5);
    rawY.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    rawX.set(0);
    rawY.set(0);
    setHovered(false);
  };
  return (
    <section
      id="top"
      onPointerMove={onMove}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={onLeave}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className="wash-hero relative overflow-hidden px-5 pt-[104px] pb-12 md:pt-[124px] xl:flex xl:min-h-[max(100svh,800px)] xl:items-center xl:py-24"
    >
      <div className="appear flex w-full flex-col items-center">
        <div data-hero-copy className="relative z-20 flex w-full max-w-[600px] flex-col items-center gap-6 text-center xl:w-[640px] xl:max-w-none">
          <h1 className="text-[34px] leading-[1.25] font-medium text-ink md:text-[44px] xl:text-[52px]">
            <span className="sr-only">จัดการสต็อก ใบจอง และบิลเงินสดของร้าน จบในมือถือเครื่องเดียว</span>
            <span aria-hidden className="block">
              <motion.span {...line(0)} data-line-one className="flex items-baseline justify-center gap-2 leading-[1.36] whitespace-nowrap md:gap-4">
                <span>จัดการ</span>
                <RotatingWord index={active} />
                <span className="hidden md:inline">ของร้าน</span>
              </motion.span>
              <motion.span {...line(1)} className="block md:hidden">ของร้าน</motion.span>
              <motion.span {...line(1)} className="block">จบในมือถือเครื่องเดียว</motion.span>
            </span>
          </h1>
          <motion.p {...line(2)} className="text-base leading-[1.6] text-muted md:text-lg">
            {/* nowrap keeps Thai line-breaking from splitting a phrase mid-word */}
            เว็บแอปจัดการร้านบนมือถือ สำหรับร้านค้าส่ง<span className="whitespace-nowrap">ชุดชั้นใน</span>และเสื้อผ้าขนาดเล็ก
            <br className="hidden md:block" />{" "}
            <span className="whitespace-nowrap">เช็กสต็อกแยกรุ่น สี ไซซ์</span> กันของให้ลูกค้าที่จองไว้ พร้อม
            <span className="whitespace-nowrap">ออกบิลเงินสด</span>ที่<span className="whitespace-nowrap">ตัดสต็อกให้เอง</span>
          </motion.p>
          <motion.div {...line(3)} className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button href={APP_URL} size="lg" arrow>{PRIMARY}</Button>
            <Button href={LINE_URL} kind="outline" size="lg" icon={ICONS.message}>{LINE_CTA}</Button>
          </motion.div>
          <motion.p {...line(4)} className="text-base text-muted tabular-nums">
            <span className="whitespace-nowrap">เริ่มด้วยแพ็กเกจ Free 0 บาท</span> · <span className="whitespace-nowrap">สินค้า 20 รหัส · 50 บิลต่อเดือน</span>
          </motion.p>
        </div>

        {/* Below 1280px: a row of three under the copy, running past both edges. From 1280px: the ring. */}
        <div
          aria-hidden
          className="pointer-events-none mt-20 flex items-start justify-center gap-2 md:gap-8 xl:absolute xl:inset-0 xl:mt-0 xl:block [--cs:.84] [--ps:1] min-[1400px]:[--cs:1] min-[1680px]:[--cs:1.1] min-[1680px]:[--ps:1.08]"
        >
          {SPOTS.map((s) => (
            <LayeredCard key={s.id} spot={s} px={px} py={py} focus={!reduce && TOPIC[s.id] === active} />
          ))}
          <HeroCard
            kind="screen"
            title="บิลเงินสด"
            sub={<>ตามแบบฟอร์มร้าน<span className="hidden xl:inline"> ตัดสต็อกให้เอง</span></>}
            lead={<BillPrint src={paper} alt={SCREENS.bill.alt} crop={0} stampTop={74} />}
            className="order-2"
            style={place(LEAD)}
            focus={!reduce && active === 2}
            rank={0}
            depth={leadDepth}
          />
        </div>
      </div>
    </section>
  );
}
