import { motion, type HTMLMotionProps } from "motion/react";

// Motion values reverse-engineered from feedspring.com's Webflow IX2 data (2026-11-01).
export const EASE = [0.25, 0.1, 0.25, 1] as const; // CSS "ease", used by most IX2 lists
export const OUT_CUBIC = [0.33, 1, 0.68, 1] as const; // dropdown / toast entrance
export const OUT_QUINT = [0.22, 1, 0.36, 1] as const; // tab indicator

/**
 * "Generic Page Fade": starts 10px above and transparent, settles over 800ms "ease"
 * once in view. FeedSpring uses a 200ms (a-140) or 400ms (a-141) delay; `delay` stacks on top for staggers.
 */
export function Reveal({ delay = 0, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.2 + delay }}
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
