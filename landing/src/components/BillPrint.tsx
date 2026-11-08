import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * The lead cash bill: the paper prints in from the top once (clip-path and transform, 720ms), then the stamp
 * lands on the empty rows. Timing and values come from design/preview/bill-print-prototype.html.
 *
 * The finished bill is the default state, so without JS or before this mounts nothing is hidden. Only after
 * mount, and only when the browser can observe visibility and the person has not asked for reduced motion,
 * is the paper hidden ("is-armed") until it scrolls 35% into view ("is-printed"). It plays once.
 */
export function BillPrint({
  src,
  alt,
  className = "",
  crop = 0,
  stampTop = 67,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Share of the picture's height scrolled past, for a crop of a taller screen (0 for a bill-only picture). */
  crop?: number;
  /** Where the stamp sits, in % of the picture's height. Keep it on empty rows, never on a figure. */
  stampTop?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPrinted(true);
      return;
    }
    setArmed(true);
    let cancelled = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        // let the hero's 400ms fade finish first so the two never fight
        const fades = (el.closest(".appear")?.getAnimations?.() ?? []).map((a) => a.finished.catch(() => undefined));
        Promise.all(fades).then(() => {
          if (!cancelled) setPrinted(true);
        });
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-bill-print
      className={`bill-print relative h-full overflow-hidden ${armed ? "is-armed" : ""} ${printed ? "is-printed" : ""} ${className}`}
      style={{ "--stamp-top": `${stampTop}%` } as CSSProperties}
    >
      <div className="relative" style={{ transform: crop ? `translateY(-${crop * 100}%)` : undefined }}>
        <img src={src} alt={alt} loading="eager" className="block w-full" />
        <span data-stamp className="bill-stamp">ตัดสต็อกแล้ว</span>
      </div>
    </div>
  );
}
