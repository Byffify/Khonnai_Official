import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion, type HTMLMotionProps } from "motion/react";
import Lenis from "lenis";

// Motion values reverse-engineered from feedspring.com's Webflow IX2 data (2026-11-01).
export const EASE = [0.25, 0.1, 0.25, 1] as const; // CSS "ease", used by most IX2 lists
export const OUT_CUBIC = [0.33, 1, 0.68, 1] as const; // dropdown / toast entrance
export const OUT_QUINT = [0.22, 1, 0.36, 1] as const; // tab indicator
// Animation branch: the slower, softer curves used by the luxury pass
export const OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const SHEET = [0.32, 0.72, 0, 1] as const;
export const SPRING = { type: "spring", stiffness: 170, damping: 22, mass: 1 } as const;
export const SOFT_SPRING = { type: "spring", stiffness: 90, damping: 20, mass: 1 } as const;

/**
 * Reveal: rises 28px out of a soft 8px blur and settles over 1.1s once a fifth of it is in view.
 * `delay` stacks for staggers. Reduced motion (MotionConfig reducedMotion="user") makes it a plain fade.
 */
export function Reveal({ delay = 0, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  // Without IntersectionObserver nothing could ever reveal it, so show it as it is
  if (typeof IntersectionObserver === "undefined") return <motion.div {...props} />;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.1, ease: OUT_EXPO, delay: 0.05 + delay }}
      {...props}
    />
  );
}

/** Dropdown panel (IX2 a-63 / a-64): opacity + 25px lift in 200ms, out the same way. */
export const dropdown = {
  initial: { opacity: 0, y: 25 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: OUT_CUBIC } },
  exit: { opacity: 0, y: 25, transition: { duration: 0.2, ease: EASE } },
};

/**
 * A number that counts up from zero the first time it scrolls into view. The real value always sits in a
 * screen-reader-only copy, so assistive tech never hears "0"; only the visible, aria-hidden digits move.
 * Thousands separators are kept.
 */
export function CountUp({ value, duration = 1.4 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const target = Number(value.replace(/,/g, ""));
  const [shown, setShown] = useState(value);
  // before the first paint, start from zero (only when it will count up)
  useLayoutEffect(() => {
    if (!reduce && Number.isFinite(target) && target !== 0 && typeof IntersectionObserver !== "undefined") setShown("0");
  }, [reduce, target]);
  useEffect(() => {
    if (!inView || reduce || !Number.isFinite(target) || target === 0) return;
    const controls = animate(0, target, {
      duration,
      ease: OUT_EXPO,
      onUpdate: (v) => setShown(Math.round(v).toLocaleString("en-US")),
    });
    return () => controls.stop();
  }, [inView, reduce, target, duration]);
  // Screen readers get the real price at once; the moving digits are hidden from them.
  return (
    <span ref={ref} className="tabular-nums">
      <span className="sr-only">{value}</span>
      <span aria-hidden>{shown}</span>
    </span>
  );
}

/**
 * Smooth, weighted page scrolling (Lenis). Off for reduced motion and on touch screens, where native momentum
 * already feels right. In-page anchor links glide to their section, respecting the fixed navbar.
 */
export function useSmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const root = document.documentElement;
    const before = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto"; // CSS smooth scrolling would fight Lenis
    const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: { offset: -96 } });
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      root.style.scrollBehavior = before;
    };
  }, [reduce]);
}
