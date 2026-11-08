import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import {
  APP_URL,
  FOOTER,
  INCLUDED,
  LINE_CTA,
  LINE_URL,
  PLANS,
  POINTS,
  PRIMARY,
  type ScreenKey,
  visibleFaq,
} from "../content";
import { EASE, OUT_QUINT, Reveal } from "../motion";
import { Button, ICONS, Logo, Phone } from "../ui";
import { LangButton } from "./Nav";
import lineQr from "../assets/line-qr.png";

function Heading({ title, body, align = "center" }: { title: ReactNode; body?: ReactNode; align?: "center" | "left" }) {
  return (
    <Reveal className={align === "center" ? "mx-auto max-w-[760px] text-center" : "max-w-[640px]"}>
      <h2 className="text-[28px] leading-[1.35] font-semibold md:text-[44px] md:leading-[1.3]">{title}</h2>
      {body && <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">{body}</p>}
    </Reveal>
  );
}

/* ---------------------------------------------------------------- feature visuals: real app screens */

const STEP_LABELS = ["เลือกสินค้า", "ยืนยันออเดอร์", "ได้บิลเงินสด"];

/** One phone for a single screen; three numbered phones for the billing flow. */
function Screens({ screens }: { screens: ScreenKey[] }) {
  if (screens.length === 1) {
    return (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 md:top-10">
        <Phone screen={screens[0]} height={760} className="hidden md:block" />
        <Phone screen={screens[0]} height={680} className="md:hidden" />
      </div>
    );
  }
  return (
    <ol className="absolute inset-x-0 top-16 flex items-start justify-center gap-1 md:top-8 md:gap-5">
      {screens.map((screen, i) => (
        <li key={screen} className="flex flex-col items-center gap-2.5 md:gap-3">
          <span className={`flex items-center gap-1 rounded-full py-1 pr-2 pl-1 text-sm font-semibold whitespace-nowrap shadow-float md:gap-2 md:pl-1 md:pr-3.5 md:text-sm ${i === screens.length - 1 ? "bg-brand text-white" : "bg-white"}`}>
            <span className={`grid size-[18px] place-items-center rounded-full md:size-6 ${i === screens.length - 1 ? "bg-white text-brand" : "bg-brand-tint text-brand"}`}>{i + 1}</span>
            {STEP_LABELS[i]}
          </span>
          <Phone screen={screen} height={460} className="hidden md:block" />
          <Phone screen={screen} height={220} className="md:hidden" />
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- features: the design's list layout, every feature in one place */

/**
 * One list, in the list layout from the design. The visitor chooses: nothing rotates by itself.
 * Tabs follow the WAI-ARIA pattern (roving tabindex, Left/Right/Home/End), the open feature's text
 * unfolds with grid-template-rows 0fr to 1fr, and the panel shows that feature's real app screen;
 * billing shows its three steps side by side.
 */
export function Features() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduce = useReducedMotion();

  const select = (i: number, focus = false) => {
    const next = (i + POINTS.length) % POINTS.length;
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const move: Record<string, number | undefined> = {
      ArrowRight: active + 1,
      ArrowDown: active + 1,
      ArrowLeft: active - 1,
      ArrowUp: active - 1,
      Home: 0,
      End: POINTS.length - 1,
    };
    const to = move[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(to, true);
  };

  const point = POINTS[active];
  return (
    <section id="features" className="px-5 py-16 md:py-24">
      <div className="mx-auto max-w-[1280px]">
        <Heading
          align="left"
          title={<>ทุกงานหลักของร้าน<br /><span className="whitespace-nowrap">ในข้อมูลชุดเดียว</span></>}
          body="ขั้นตอนสั้น ตัวใหญ่ อ่านง่าย ใช้เองได้ทุกวัน"
        />
        <div className="mt-10 grid gap-6 md:mt-12 xl:grid-cols-[440px_1fr] xl:gap-10 min-[1360px]:grid-cols-[500px_1fr]">
          <Reveal>
            <div role="tablist" aria-label="ฟีเจอร์ของ khonnai" className="space-y-2" onKeyDown={onKeyDown}>
              {POINTS.map((p, i) => {
                const Icon = ICONS[p.icon];
                const on = i === active;
                return (
                  <button
                    key={p.title}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`feature-tab-${i}`}
                    aria-selected={on}
                    aria-controls="feature-panel"
                    aria-labelledby={`feature-title-${i}`}
                    tabIndex={on ? 0 : -1}
                    onClick={() => select(i)}
                    className={`group flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-colors duration-300 md:px-5 ${on ? "bg-hover" : "hover:bg-subtle"}`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-[10px] transition-colors duration-300 ${on ? "bg-brand-tint text-brand" : "text-muted group-hover:text-ink"}`}>
                      <Icon aria-hidden className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1 pt-1">
                      <span id={`feature-title-${i}`} className={`block text-base font-semibold transition-colors duration-300 ${on ? "text-ink" : "text-muted group-hover:text-ink"}`}>{p.title}</span>
                      <span
                        data-detail
                        aria-hidden={!on}
                        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                      >
                        <span className="block min-h-0 overflow-hidden">
                          <span className="block pt-1 text-base leading-relaxed text-muted">{p.desc}</span>
                          <span className="block pt-1 text-sm font-semibold text-orange-text">{p.when}</span>
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={0.1} className="xl:sticky xl:top-28 xl:self-start">
            <div
              id="feature-panel"
              role="tabpanel"
              aria-labelledby={`feature-tab-${active}`}
              className="relative h-[400px] overflow-hidden rounded-3xl bg-hover md:h-[520px]"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={point.screens.join("+")}
                  className="absolute inset-0"
                  initial={{ opacity: 0, y: reduce ? 0 : 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -24 }}
                  transition={{ duration: reduce ? 0 : 0.6, ease: OUT_QUINT }}
                >
                  <Screens screens={point.screens} />
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- pricing (design layout) */

export function Pricing() {
  return (
    <section id="pricing" className="wash-pricing px-5 py-16 md:py-24">
      <div className="mx-auto max-w-[1188px]">
        <Heading title="เลือกแพ็กเกจตามขนาดร้าน" body="เริ่มฟรี แล้วค่อยอัปเกรดเมื่อสินค้าหรือบิลเกินลิมิต ทุกแพ็กเกจใช้ฟีเจอร์หลักได้ครบ" />
        <div className="mt-10 grid items-center gap-4 md:mt-12 md:grid-cols-3 md:gap-6">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <article
                className={`rounded-[28px] p-6 tabular-nums lg:p-8 ${p.featured ? "on-blue bg-brand py-11 text-white md:py-11 lg:py-11" : "bg-white shadow-float ring-1 ring-line"}`}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{p.name}</h3>
                    {p.featured && <span className="text-sm text-[#dbe5fb]">แนะนำ</span>}
                  </div>
                  <p className={`-mt-3 text-base ${p.featured ? "text-[#dbe5fb]" : "text-muted"}`}>{p.audience}</p>
                  <p className="flex items-baseline gap-2">
                    <span className="text-[44px] leading-none font-semibold lg:text-[52px]">{p.price}</span>
                    <span className={`whitespace-nowrap ${p.featured ? "text-[#dbe5fb]" : "text-muted"}`}>บาท / เดือน</span>
                  </p>
                  <dl className={`grid grid-cols-2 gap-4 border-y py-4 ${p.featured ? "border-white/20" : "border-line"}`}>
                    {[
                      [p.skus, "รหัสสินค้า"],
                      [p.bills, "บิลต่อเดือน"],
                    ].map(([v, u]) => (
                      <div key={u}>
                        <dt className="text-2xl font-semibold lg:text-[28px]">{v}</dt>
                        <dd className={`text-sm ${p.featured ? "text-[#dbe5fb]" : "text-muted"}`}>{u}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-base font-semibold">{p.perDay}</p>
                  <Button href={p.href} kind={p.featured ? "white" : "outline"} wide>{p.cta}</Button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 flex justify-center">
          <ul className="flex flex-col gap-3 rounded-[20px] bg-white px-6 py-4 ring-1 ring-line md:flex-row md:items-center md:gap-6 md:rounded-full">
            <li className="font-semibold">ทุกแพ็กเกจมี</li>
            {INCLUDED.map((x) => (
              <li key={x} className="flex items-center gap-2 text-base">
                <Check aria-hidden className="size-5 text-brand" /> {x}
              </li>
            ))}
          </ul>
        </Reveal>
        {/* Wongnai spells out what its price leaves out (hardware, add-ons); ours has none to leave out */}
        <p className="mt-6 text-center text-sm text-muted">
          ราคาซอฟต์แวร์ ใช้กับมือถือเครื่องเดิม ไม่มีค่าอุปกรณ์ · ราคาช่วงเปิดตัว อาจปรับก่อนเปิดใช้งานจริง
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- FAQ (design layout; IX2 a-110/111: 300ms, chevron turns) */

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="px-5 pt-8 pb-16 md:pb-24">
      <div className="mx-auto max-w-[720px]">
        <Heading title="คำถามที่พบบ่อย" />
        <Reveal className="mt-8 space-y-3 md:mt-12">
          {visibleFaq.map((f, i) => {
            const on = open === i;
            const id = `faq-${i}`;
            return (
              <div key={f.q} className="rounded-2xl bg-faq shadow-hair">
                <h3>
                  <button
                    aria-expanded={on}
                    aria-controls={id}
                    onClick={() => setOpen(on ? -1 : i)}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left text-base font-semibold transition-colors duration-200 hover:bg-hover focus-visible:outline-offset-[-2px] md:px-6 ${on ? "text-brand" : ""}`}
                  >
                    {f.q}
                    <ChevronDown aria-hidden className={`size-4 shrink-0 transition-transform duration-300 ${on ? "rotate-180" : ""}`} />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div
                      id={id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-base leading-relaxed text-muted md:px-6">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
        <div className="mt-8 flex justify-center">
          <Button href={LINE_URL} icon={ICONS.message} className="w-full md:w-auto">ถามทีมทาง LINE</Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- closing CTA (design layout: three phones) */

export function Closing() {
  return (
    <section className="px-5 pb-16 md:pb-24">
      <Reveal className="on-blue bg-brand-closing relative mx-auto h-[640px] max-w-[1280px] overflow-hidden rounded-[28px] px-6 pt-12 text-center md:rounded-[32px] md:pt-[72px]">
        <h2 className="text-[34px] leading-[1.3] font-semibold text-white md:text-[52px] md:leading-[1.25]">
          ให้คนในจำสต็อก
          <br />
          แทนเจ้าของร้าน
        </h2>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <span className="glow-ring w-full sm:w-auto">
            <Button href={APP_URL} kind="white" size="lg" arrow wide>{PRIMARY}</Button>
          </span>
          <Button href={LINE_URL} kind="outline-light" size="lg" icon={ICONS.message} className="w-full sm:w-auto">{LINE_CTA}</Button>
        </div>
        {/* Wongnai closes on who looks after the shop. TODO: real reply hours. */}
        <p className="mt-5 text-base text-white">ทีมช่วยตั้งค่าร้านให้ และตอบทาง LINE</p>
        <div className="absolute inset-x-0 top-[390px] flex items-start justify-center gap-6 md:top-[350px]">
          <Phone screen="stock" height={640} className="mt-14 hidden md:block" />
          <Phone screen="home" height={760} />
          <Phone screen="bill" height={640} className="mt-14 hidden md:block" />
        </div>
      </Reveal>
    </section>
  );
}

/* ---------------------------------------------------------------- footer + mobile sticky bar */

export function Footer() {
  return (
    <footer id="contact" className="border-t border-line px-5 pt-12 pb-8 md:pt-16 md:pb-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-[300px_1fr_340px]">
          <div className="space-y-4">
            <Logo />
            <p className="text-base leading-relaxed text-muted">คนใน · ระบบบริหารสต็อก การจองสินค้า<br />และการออกบิลบนมือถือ</p>
          </div>
          <nav aria-label="ลิงก์ท้ายหน้า" className="grid grid-cols-3 gap-4">
            {FOOTER.map((col) => (
              <div key={col.head}>
                <p className="text-base font-semibold">{col.head}</p>
                <ul>
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="flex min-h-11 items-center text-base text-muted transition-colors hover:text-ink">{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="flex flex-col gap-4 rounded-[20px] bg-subtle p-5 ring-1 ring-line sm:flex-row sm:items-start md:flex-col lg:flex-row">
            {/* the white padding is the QR's quiet zone; phones fail to scan without it */}
            <a href={LINE_URL} className="block size-28 shrink-0 rounded-xl bg-white p-2.5 ring-1 ring-line" aria-label="เพิ่มเพื่อน LINE ของ khonnai">
              <img src={lineQr} alt="QR เพิ่มเพื่อน LINE ของ khonnai" width={360} height={360} className="size-full" loading="lazy" />
            </a>
            <div className="flex-1 space-y-2">
              <p className="text-lg font-semibold">{LINE_CTA}</p>
              <p className="text-base leading-relaxed text-muted">ถามก่อนเริ่มใช้ หรือให้ทีมช่วยตั้งค่าร้าน</p>
              <Button href={LINE_URL} kind="dark" size="sm" icon={ICONS.message} wide>เพิ่มเพื่อน LINE</Button>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col-reverse items-start gap-3 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted">© 2569 khonnai</p>
          <div className="flex w-full items-center justify-between gap-5 md:w-auto">
            <LangButton outline />
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Mobile only: once the hero scrolls away, keep both actions in thumb reach (slides up 300ms outCubic). */
export function StickyBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 bg-white px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgb(15_23_42/0.12)] md:hidden"
          initial={{ y: 100 }}
          animate={{ y: 0, transition: { duration: 0.3, ease: [0.33, 1, 0.68, 1] } }}
          exit={{ y: 100, transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] } }}
        >
          <Button href={APP_URL} size="lg" arrow className="flex-1">{PRIMARY}</Button>
          <Button href={LINE_URL} kind="outline" size="lg" icon={ICONS.message} aria-label={LINE_CTA}>LINE</Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
