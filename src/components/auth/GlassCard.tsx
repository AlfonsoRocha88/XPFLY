import type { ReactNode } from "react";
import { m, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.23, 1, 0.32, 1] as const;

// The card rises out of a soft blur; `filter` is dropped afterwards so it never limits the glass.
const cardRise: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE, delayChildren: 0.08, staggerChildren: 0.05 },
    transitionEnd: { filter: "none" },
  },
};
const cardFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
};
const itemRise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};
const itemFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
};

/** Frosted "liquid glass" panel; its <GlassItem> children fade in one after another. */
export function GlassCard({ className, children }: { className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <m.section
      initial="hidden"
      animate="show"
      variants={reduce ? cardFade : cardRise}
      className={cn(
        "w-full max-w-md rounded-[28px] border border-white/20 p-6 text-white sm:p-8",
        "bg-white/[0.04] bg-[image:linear-gradient(160deg,rgba(255,255,255,0.13)_0%,rgba(255,255,255,0.05)_45%,rgba(255,255,255,0.03)_100%)]",
        "backdrop-blur-[12px] backdrop-saturate-[1.6]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(255,255,255,0.05),0_24px_64px_-20px_rgba(2,3,18,0.75)]",
        "[@media(prefers-reduced-transparency:reduce)]:bg-[#141833] [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </m.section>
  );
}

/** One staggered step of a <GlassCard> (rises 8px; fades only with reduced motion). */
export function GlassItem({ className, children }: { className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <m.div variants={reduce ? itemFade : itemRise} className={className}>
      {children}
    </m.div>
  );
}
