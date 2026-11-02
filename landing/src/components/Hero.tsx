import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { APP_URL, LINE_CTA, LINE_URL, PRIMARY } from "../content";
import { EASE, OUT_QUINT } from "../motion";
import { Button, ICONS, Phone, SCREENS } from "../ui";
import { ILLUSTRATION, photo } from "../photos";
import cardStock from "../assets/screens/card-stock.webp";
import cardReserve from "../assets/screens/card-reserve.webp";

/**
 * Hero after fastwork.com: a light stage, the headline in the middle with one handwritten word that cycles,
 * and real app screens + shop photos orbiting in around it. On scroll the cards scatter off the sides.
 */

const WORDS = ["สต็อก", "ใบจอง", "บิลเงินสด"] as const;
type Word = 0 | 1 | 2;
// drops in from above 0.6s, holds 2.5s, drops out below 0.3s
const WRITE = 0.6;
const HOLD = 2.5;
const FADE = 0.3;

/** The handwritten word. The slot's width follows each word, so the line glides instead of jumping. */
function RotatingWord({ index }: { index: Word }) {
  const measure = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState<number[]>([]);
  useLayoutEffect(() => {
    const read = () =>
      setWidths([...(measure.current?.children ?? [])].map((c) => (c as HTMLElement).getBoundingClientRect().width));
    read();
    document.fonts?.ready.then(read);
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return (
    <>
      <span ref={measure} aria-hidden className="pointer-events-none invisible absolute font-hand whitespace-nowrap">
        {WORDS.map((w) => (
          <span key={w} className="absolute px-[0.12em]">{w}</span>
        ))}
      </span>
      {/* clipped to its own line box so each word slides through a window, top to bottom */}
      <motion.span
        className="relative inline-block align-baseline [clip-path:inset(0_-0.3em)]"
        animate={{ width: widths[index] ?? "auto" }}
        initial={false}
        transition={{ duration: 0.45, ease: OUT_QUINT }}
      >
        &nbsp;
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            className="absolute inset-x-0 bottom-0 px-[0.12em] text-center font-hand whitespace-nowrap text-[#e2640f]"
            initial={{ y: "-0.9em", opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: WRITE, ease: OUT_QUINT } }}
            exit={{ y: "0.9em", opacity: 0, filter: "blur(4px)", transition: { duration: FADE, ease: [0.55, 0, 1, 0.45] } }}
          >
            {WORDS[index]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
}

function useWordCycle(): Word {
  const [i, setI] = useState<Word>(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const id = window.setTimeout(() => setI(((i + 1) % WORDS.length) as Word), (FADE + WRITE + HOLD) * 1000);
    return () => window.clearTimeout(id);
  }, [i, reduce]);
  return reduce ? 0 : i;
}

/* ---------------------------------------------------------------- the cards */

function Tag() {
  return ILLUSTRATION ? (
    <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">ภาพประกอบ</span>
  ) : null;
}

/** The AI photo has a blank, camera-facing phone; the real home screen is laid onto its glass (measured at 1024×1280). */
function HandPhone({ width }: { width: number }) {
  const src = photo("hero");
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand-tint" style={{ width, aspectRatio: "4 / 5" }}>
      {src && <img src={src} alt="" className="absolute inset-0 size-full object-cover" />}
      <img
        src={SCREENS.home.src}
        alt=""
        className="absolute object-cover object-top"
        style={{ left: "34.57%", top: "22.97%", width: "30.96%", height: "51.17%", borderRadius: "11.4% / 5.5%" }}
      />
      <Tag />
    </div>
  );
}

function PhotoCard({ slot, width }: { slot: "type-variants" | "type-front"; width: number }) {
  const src = photo(slot);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand-tint" style={{ width, aspectRatio: "4 / 5" }}>
      {src && <img src={src} alt="" className="size-full object-cover" />}
      <Tag />
    </div>
  );
}

function ShotCard({ src, width }: { src: string; width: number }) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-white p-1.5" style={{ width }}>
      <img src={src} alt="" className="w-full rounded-[14px]" />
    </div>
  );
}

type Card = {
  id: string;
  word?: Word; // lifts while the headline shows this word
  side: -1 | 1;
  dx: number; // card centre, px from the copy's centre
  dy: number;
  rot: number; // resting tilt
  startRot: number; // tilt on the orbit ring before it swings out
  scatterY: string;
  body: ReactNode;
};

// The cards ring the copy (headline ≈ 680px, subtitle 640px at xl) with a 50–100px gap, like fastwork.com's
// orbit. Positions and sizes are for a 1440px screen; the stage's --ps / --cs adapt them to other widths.
const CARDS: Card[] = [
  { id: "hand", side: -1, dx: -525, dy: -150, rot: -6, startRot: 36, scatterY: "-22vh", body: <HandPhone width={220} /> },
  { id: "stock", word: 0, side: -1, dx: -545, dy: 125, rot: 4, startRot: -72, scatterY: "6vh", body: <ShotCard src={cardStock} width={240} /> },
  { id: "variants", side: -1, dx: -365, dy: 272, rot: -4, startRot: 108, scatterY: "18vh", body: <PhotoCard slot="type-variants" width={170} /> },
  { id: "reserve", word: 1, side: 1, dx: 485, dy: -272, rot: 5, startRot: -36, scatterY: "-22vh", body: <ShotCard src={cardReserve} width={280} /> },
  { id: "front", side: 1, dx: 548, dy: 0, rot: -4, startRot: 72, scatterY: "4vh", body: <PhotoCard slot="type-front" width={196} /> },
  { id: "bill", word: 2, side: 1, dx: 445, dy: 235, rot: 6, startRot: -108, scatterY: "16vh", body: <Phone screen="bill" height={290} /> },
];

/** Lifted, orange-ringed while the headline is on this card's word. */
function Lift({ on, rot, children }: { on: boolean; rot: number; children: ReactNode }) {
  return (
    <div
      className={`rounded-3xl transition-[translate,scale,box-shadow] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${on ? "-translate-y-2.5 scale-[1.04] shadow-[0_0_0_3px_#ff8032,0_24px_48px_-12px_rgb(226_100_15/0.35)]" : "shadow-float"}`}
      style={{ rotate: `${rot}deg` }}
    >
      {children}
    </div>
  );
}

/**
 * fastwork.com's "orbit-card" entrance: every card starts on a small ring at the centre (scale ≈ 0.39, its own
 * start angle, transparent) and swings out along an arc to its spot while the ring opens; delays are 8–64ms.
 */
function OrbitCard({ card, index, active, progress }: {
  card: Card;
  index: number;
  active: Word;
  progress: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const swing = useRef<HTMLDivElement>(null);
  const x = useTransform(progress, [0, 1], ["0vw", `${card.side * 48}vw`]);
  const y = useTransform(progress, [0, 1], ["0vh", card.scatterY]);

  useLayoutEffect(() => {
    const el = swing.current;
    // a child's layout effect runs before the parent's ref is attached, so find the stage in the DOM
    const box = el?.closest("[data-orbit-stage]")?.getBoundingClientRect();
    if (!el || !box || reduce) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return; // hidden below xl
    const dx = r.left + r.width / 2 - (box.left + box.width / 2);
    const dy = r.top + r.height / 2 - (box.top + box.height / 2);
    const r1 = Math.hypot(dx, dy);
    const a1 = Math.atan2(dy, dx);
    const a0 = a1 - (150 * Math.PI) / 180;
    const r0 = r1 * 0.39;
    const at = (p: number) => {
      const a = a0 + (a1 - a0) * p;
      const rad = r0 + (r1 - r0) * p;
      const ox = Math.cos(a) * rad - dx;
      const oy = Math.sin(a) * rad - dy;
      el.style.transform = `translate(${ox}px, ${oy}px) rotate(${card.startRot * (1 - p)}deg) scale(${0.39 + 0.61 * p})`;
      el.style.opacity = String(Math.min(1, p * 3));
    };
    at(0);
    // wait for the card's images so the swing is seen with its picture, not as an empty frame
    let ctl: ReturnType<typeof animate> | undefined;
    let cancelled = false;
    Promise.all([...el.querySelectorAll("img")].map((img) => img.decode().catch(() => undefined))).then(() => {
      if (cancelled) return;
      ctl = animate(0, 1, { duration: 1.8, ease: OUT_QUINT, delay: 0.25 + [8, 36, 64][index % 3] / 1000 + index * 0.04, onUpdate: at });
    });
    return () => {
      cancelled = true;
      ctl?.stop();
    };
  }, [card.startRot, index, reduce]);

  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      // the copy sits 24px below the hero's middle (pt-28 vs pb-16)
      style={{ left: `calc(50% + ${card.dx}px * var(--ps))`, top: `calc(50% + 24px + ${card.dy}px * var(--ps))`, x: reduce ? 0 : x, y: reduce ? 0 : y }}
    >
      <div style={{ scale: "var(--cs)" }}>
        <div ref={swing} className="will-change-transform">
          <div className="hero-float" style={{ animationDelay: `${-index * 1.1}s` }}>
            <Lift on={card.word === active} rot={card.rot}>{card.body}</Lift>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Below xl there is no room around the copy: three cards fan out under the buttons instead. */
function Fan({ active }: { active: Word }) {
  // It usually sits below the first screen, so it plays when scrolled into view: the photo rises,
  // then the two side cards swing out from behind it.
  const rise = (delay: number, from: { x?: number; rotate?: number } = {}) => ({
    initial: { opacity: 0, y: 48, scale: 0.85, ...from },
    whileInView: { opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 1.1, ease: OUT_QUINT, delay },
  });
  return (
    <div aria-hidden className="relative mx-auto mt-12 h-[330px] w-full max-w-[420px] md:h-[400px] xl:hidden">
      <motion.div className="absolute top-14 left-0 md:top-16" {...rise(0.35, { x: 110, rotate: 10 })}>
        <Lift on={active === 0} rot={-8}><ShotCard src={cardStock} width={150} /></Lift>
      </motion.div>
      <motion.div className="absolute top-20 right-0 md:top-20" {...rise(0.45, { x: -110, rotate: -10 })}>
        <Lift on={active === 2} rot={8}><Phone screen="bill" height={230} className="md:hidden" /><Phone screen="bill" height={270} className="hidden md:block" /></Lift>
      </motion.div>
      <motion.div className="absolute top-0 left-1/2 -translate-x-1/2" {...rise(0.15)}>
        <Lift on={false} rot={0}><div className="md:hidden"><HandPhone width={200} /></div><div className="hidden md:block"><HandPhone width={250} /></div></Lift>
      </motion.div>
    </div>
  );
}

export function Hero() {
  const active = useWordCycle();
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });
  return (
    <section ref={section} id="top" className="relative flex min-h-svh items-center overflow-hidden bg-white px-5 pt-28 pb-16 md:pt-32">
      {/* soft brand glow behind the headline */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-[18%] left-1/2 size-[520px] -translate-x-[70%] rounded-full bg-brand/12 blur-[90px] md:size-[680px]" />
        <div className="absolute top-[30%] left-1/2 size-[420px] -translate-x-[10%] rounded-full bg-orange/14 blur-[90px] md:size-[560px]" />
      </div>

      {/* Laid out for 1440px. Narrower screens pull the ring in (--ps) and shrink the cards (--cs) by different
          amounts, so the gap to the copy holds while the cards still fit inside the edge. */}
      <div
        data-orbit-stage
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden [--cs:.8] [--ps:.92] xl:block min-[1400px]:[--cs:1] min-[1400px]:[--ps:1] min-[1680px]:[--cs:1.1] min-[1680px]:[--ps:1.08]"
      >
        {CARDS.map((c, i) => (
          <OrbitCard key={c.id} card={c} index={i} active={active} progress={scrollYProgress} />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center text-center">
        <motion.h1 className="text-[34px] leading-[1.35] font-bold md:text-6xl md:leading-[1.3]" {...rise(0.2)}>
          <span className="sr-only">จัดการสต็อก ใบจอง และบิลเงินสดของร้าน จบในมือถือเครื่องเดียว</span>
          <span aria-hidden>
            จัดการ <RotatingWord index={active} /> ของร้าน
            <br />
            <span className="text-brand">จบในมือถือเครื่องเดียว</span>
          </span>
        </motion.h1>
        <motion.div className="mt-6 flex flex-col items-center" {...rise(0.4)}>
          <p className="max-w-[780px] text-[17px] xl:max-w-[640px] leading-relaxed text-muted md:text-xl md:leading-relaxed">
            {/* nowrap keeps Thai line-breaking from splitting a phrase mid-word */}
            เว็บแอปจัดการร้านบนมือถือ สำหรับร้านค้าส่ง<span className="whitespace-nowrap">ชุดชั้นใน</span>และเสื้อผ้าขนาดเล็ก ช่วยให้คุณ
            <span className="whitespace-nowrap">เช็กสต็อกแยกรุ่น สี ไซซ์</span>ได้ทันที กันของให้ลูกค้าที่จองไว้ พร้อม
            <span className="whitespace-nowrap">ออกบิลเงินสด</span>ที่<span className="whitespace-nowrap">ตัดสต็อกให้เอง</span>
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button href={APP_URL} size="lg" arrow>{PRIMARY}</Button>
            <Button href={LINE_URL} kind="outline" size="lg" icon={ICONS.message}>{LINE_CTA}</Button>
          </div>
          <p className="mt-5 text-[15px] text-muted"><span className="whitespace-nowrap">เริ่มด้วยแพ็กเกจ Free 0 บาท</span> · <span className="whitespace-nowrap">สินค้า 20 รหัส · 50 บิลต่อเดือน</span></p>
        </motion.div>
        <Fan active={active} />
      </div>
    </section>
  );
}
