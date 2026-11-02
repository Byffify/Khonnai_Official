import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, ChevronDown, ChevronRight, Globe, Menu, X } from "lucide-react";
import { APP_URL, LINE_CTA, LINE_URL, LOGIN, MODULES, NAV, PRIMARY, SERVICES } from "../content";
import { dropdown, EASE } from "../motion";
import { Button, ICONS, Logo } from "../ui";
import stockWide from "../assets/screens/tile-stock-wide.webp";

type MenuId = "features" | "services" | "lang" | null;

/** Hover-intent on pointer devices, click/Enter everywhere, Escape and outside click close. */
function useMenus() {
  const [open, setOpen] = useState<MenuId>(null);
  const timer = useRef<number | undefined>(undefined);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);
  const hoveredAt = useRef(0);
  const hover = (id: MenuId) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      window.clearTimeout(timer.current);
      hoveredAt.current = Date.now();
      setOpen(id);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      timer.current = window.setTimeout(() => setOpen((o) => (o === id ? null : o)), 120);
    },
  });
  // A click that lands just after hover opened the menu should keep it open, not toggle it shut.
  const toggle = (id: MenuId) =>
    setOpen((o) => (o === id && Date.now() - hoveredAt.current > 400 ? null : id));
  return { open, setOpen, toggle, hover, root };
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      aria-hidden
      className={`size-4 transition-transform duration-200 ${open ? "rotate-180 text-brand" : "text-muted"}`}
    />
  );
}

function FeaturesPanel({ close }: { close: () => void }) {
  return (
    <div className="flex w-[568px] gap-0 rounded-[20px] border border-white bg-linear-to-b from-white/95 to-brand-tint/95 p-2 shadow-float backdrop-blur">
      <div className="flex w-[244px] flex-col justify-between p-2">
        <ul className="space-y-1">
          {MODULES.map((m, i) => {
            const Icon = ICONS[m.key];
            return (
              <li key={m.key}>
                <a
                  href={m.href}
                  onClick={close}
                  className={`flex min-h-11 items-center gap-3 rounded-full px-3 py-2.5 transition-colors ${i === 0 ? "bg-white font-bold shadow-float" : "hover:bg-white/70"}`}
                >
                  <span className={`grid size-7 place-items-center rounded-full ${i === 0 ? "bg-brand-tint text-brand" : "text-muted"}`}>
                    <Icon aria-hidden className="size-[18px]" />
                  </span>
                  {m.label}
                </a>
              </li>
            );
          })}
        </ul>
        <a href={APP_URL} className="group flex min-h-11 items-center gap-3 px-3 text-[15px] font-bold text-brand">
          <ArrowRight aria-hidden className="size-[18px] transition-transform duration-300 group-hover:translate-x-1" />
          {PRIMARY}
        </a>
      </div>
      <a href="#features" onClick={close} className="group w-[308px] rounded-2xl bg-white/70 p-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-line">
          <div className="overflow-hidden">
            <img
              src={stockWide}
              alt="หน้าสต็อกสินค้าในแอป"
              className="h-[156px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="space-y-1.5 px-4 pt-3 pb-4">
            <p className="text-[17px] font-bold">สต็อกแยกรุ่น สี ไซซ์</p>
            <p className="text-[15px] text-muted">เห็นของพร้อมขายทุกช่องในจอเดียว</p>
          </div>
        </div>
      </a>
    </div>
  );
}

function ServicesPanel({ close }: { close: () => void }) {
  return (
    <ul className="grid w-[620px] grid-cols-2 gap-2 rounded-[20px] border border-white bg-linear-to-b from-white/95 to-brand-tint/95 p-6 shadow-float backdrop-blur">
      {SERVICES.map((s, i) => {
        const Icon = ICONS[s.icon];
        return (
          <li key={s.title}>
            <a
              href={s.icon === "message" ? LINE_URL : "#contact"}
              onClick={close}
              className={`flex items-center gap-3.5 rounded-[14px] p-2 transition-colors hover:bg-white ${i === 0 ? "bg-white" : ""}`}
            >
              <span className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-line">
                <Icon aria-hidden className="size-5" />
              </span>
              <span>
                <span className="block font-bold">{s.title}</span>
                <span className="block text-sm text-muted">{s.sub}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function LangPanel({ close }: { close: () => void }) {
  return (
    <ul className="w-[240px] space-y-1 rounded-[20px] border border-white bg-linear-to-b from-white/95 to-brand-tint/95 p-2 shadow-float backdrop-blur">
      <li>
        <button onClick={close} className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-white px-3 text-left font-bold">
          <span className="grid h-[26px] w-9 place-items-center rounded-md bg-brand-tint text-sm text-brand">TH</span>
          <span className="flex-1">ภาษาไทย</span>
          <Check aria-hidden className="size-5 text-brand" />
        </button>
      </li>
      <li>
        <span aria-disabled className="flex min-h-11 items-center gap-3 px-3 text-muted">
          <span className="grid h-[26px] w-9 place-items-center rounded-md bg-hover text-sm">EN</span>
          English <span className="text-sm">(เร็ว ๆ นี้)</span>
        </span>
      </li>
    </ul>
  );
}

function LangButton({ open, onClick, outline = false }: { open?: boolean; onClick?: () => void; outline?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="เปลี่ยนภาษา"
      className={`inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-medium transition-colors ${outline ? "bg-white ring-1 ring-inset ring-line-strong hover:bg-hover" : "border border-line bg-white hover:bg-hover"}`}
    >
      <Globe aria-hidden className="size-5" strokeWidth={1.75} />
      TH
      <Chevron open={!!open} />
    </button>
  );
}

export { LangButton };

function MobileSheet({ onClose }: { onClose: () => void }) {
  const [featuresOpen, setFeaturesOpen] = useState(true);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <motion.div
      role="dialog"
      aria-modal
      aria-label="เมนู"
      className="fixed inset-0 z-50 flex flex-col bg-white px-4 pt-3 pb-6 lg:hidden"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.33, 1, 0.68, 1] } }}
      exit={{ opacity: 0, y: 25, transition: { duration: 0.2, ease: EASE } }}
    >
      <div className="flex h-15 items-center justify-between pr-2 pl-[18px]">
        <Logo className="h-6" />
        <button onClick={onClose} aria-label="ปิดเมนู" className="grid size-11 place-items-center rounded-full bg-hover">
          <X aria-hidden className="size-6" />
        </button>
      </div>
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
        <div className="rounded-[20px] bg-subtle px-1 pt-1 pb-3">
          <button
            onClick={() => setFeaturesOpen((v) => !v)}
            aria-expanded={featuresOpen}
            className="flex min-h-13 w-full items-center justify-between px-3.5 text-lg font-bold text-brand"
          >
            ฟีเจอร์ <Chevron open={featuresOpen} />
          </button>
          <AnimatePresence initial={false}>
            {featuresOpen && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="overflow-hidden"
              >
                {MODULES.map((m) => {
                  const Icon = ICONS[m.key];
                  return (
                    <li key={m.key}>
                      <a href={m.href} onClick={onClose} className="flex min-h-12 items-center gap-3 px-3.5">
                        <span className="grid size-8 place-items-center rounded-[10px] bg-white text-brand">
                          <Icon aria-hidden className="size-5" />
                        </span>
                        {m.label}
                      </a>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        {NAV.slice(1).map((n) => (
          <a key={n.label} href={n.href} onClick={onClose} className="flex min-h-14 items-center justify-between px-[18px] text-lg">
            {n.label}
            <ChevronRight aria-hidden className="size-4 text-muted" />
          </a>
        ))}
        <div className="flex gap-1 rounded-full bg-hover p-1">
          <span className="flex h-11 flex-1 items-center justify-center rounded-full bg-white font-bold">ภาษาไทย</span>
          <span aria-disabled className="flex h-11 flex-1 items-center justify-center text-muted">English (เร็ว ๆ นี้)</span>
        </div>
      </nav>
      <div className="space-y-2.5">
        <Button href={APP_URL} size="lg" arrow wide>{PRIMARY}</Button>
        <Button href={LINE_URL} onClick={onClose} kind="outline" size="lg" icon={ICONS.message} wide>{LINE_CTA}</Button>
        <a href={APP_URL} className="flex min-h-11 items-center justify-center font-bold text-brand">{LOGIN}</a>
      </div>
    </motion.div>
  );
}

export function Nav() {
  const { open, setOpen, toggle, hover, root } = useMenus();
  const [sheet, setSheet] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const close = () => setOpen(null);

  return (
    <header ref={root} className="fixed inset-x-0 top-4 z-40 px-4">
      {/* Glass bar after fastwork.com (fixed 16px from the top, 20px blur). The hero is white, so glass alone
          vanishes there: 80% white, a slate-200 hairline and a soft shadow keep the bar's edge visible. */}
      <div
        className={`mx-auto flex h-15 max-w-[1200px] items-center justify-between rounded-full border border-line bg-white/80 pr-2 pl-[18px] backdrop-blur-[20px] backdrop-saturate-150 transition-shadow duration-300 lg:h-16 lg:pr-2.5 lg:pl-6 ${scrolled ? "shadow-[0_12px_40px_-10px_rgb(15_23_42/0.22)]" : "shadow-[0_10px_30px_-12px_rgb(15_23_42/0.16)]"}`}
      >
        <div className="flex items-center gap-8">
          <a href="#top" aria-label="khonnai หน้าแรก" className="flex min-h-11 items-center">
            <Logo className="h-6 lg:h-7" />
          </a>
          <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) =>
              "menu" in n ? (
                <div key={n.label} className="relative" {...hover(n.menu)}>
                  <button
                    type="button"
                    onClick={() => toggle(n.menu)}
                    aria-haspopup="true"
                    aria-expanded={open === n.menu}
                    className={`flex min-h-11 items-center gap-1 rounded-full px-3 transition-colors ${open === n.menu ? "bg-hover font-bold text-brand" : "hover:bg-hover"}`}
                  >
                    {n.label}
                    <Chevron open={open === n.menu} />
                  </button>
                  <AnimatePresence>
                    {open === n.menu && (
                      <motion.div {...dropdown} className="absolute top-full left-[-16px] pt-4">
                        {n.menu === "features" ? <FeaturesPanel close={close} /> : <ServicesPanel close={close} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <a key={n.label} href={n.href} className="flex min-h-11 items-center rounded-full px-3 transition-colors hover:bg-hover">
                  {n.label}
                </a>
              ),
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" {...hover("lang")}>
            <LangButton open={open === "lang"} onClick={() => toggle("lang")} />
            <AnimatePresence>
              {open === "lang" && (
                <motion.div {...dropdown} className="absolute top-full right-0 pt-4">
                  <LangPanel close={close} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* wrapped: Button's own inline-flex would override a `hidden` on it */}
          <div className="hidden items-center gap-2 lg:flex">
            <Button href={APP_URL} kind="outline" size="sm">{LOGIN}</Button>
            <Button href={APP_URL} size="sm" arrow>{PRIMARY}</Button>
          </div>
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-label="เปิดเมนู"
            className="grid size-11 place-items-center rounded-full bg-brand text-white lg:hidden"
          >
            <Menu aria-hidden className="size-6" />
          </button>
        </div>
      </div>
      <AnimatePresence>{sheet && <MobileSheet onClose={() => setSheet(false)} />}</AnimatePresence>
    </header>
  );
}
