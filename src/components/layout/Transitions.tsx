import { useRef, type ReactNode } from "react";
import { AnimatePresence, m, useReducedMotion, type Variants } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Section change: slides in the direction of travel with a short motion blur, then settles.
 * The container never keeps a transform or filter at rest, so fixed children are never trapped.
 */
const page: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 42, scale: 0.985, filter: "blur(10px)" }),
  center: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.34, ease: EASE }, transitionEnd: { filter: "none", transform: "none" } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, filter: "blur(8px)", transition: { duration: 0.14, ease: "easeIn" } }),
};

const fade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export function PageTransition({ id, dir, className, children }: { id: string; dir: number; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <m.div key={id} custom={dir} variants={reduce ? fade : page} initial="enter" animate="center" exit="exit" className={className}>
        {children}
      </m.div>
    </AnimatePresence>
  );
}

/** Sub-tab change inside a section: a quicker, smaller version of the same move. */
const tab: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24, filter: "blur(6px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.32, ease: EASE }, transitionEnd: { filter: "none", transform: "none" } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -16, filter: "blur(5px)", transition: { duration: 0.12, ease: "easeIn" } }),
};

export function TabTransition({ id, dir, className, children }: { id: string; dir: number; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <m.div key={id} custom={dir} variants={reduce ? fade : tab} initial="enter" animate="center" exit="exit" className={className}>
        {children}
      </m.div>
    </AnimatePresence>
  );
}

/** +1 when `value` moved forward through `order` since the last render, -1 when it moved back. */
export function useDirection<T>(value: T, order: readonly T[]) {
  const prev = useRef(value);
  const dir = useRef(1);
  if (prev.current !== value) {
    dir.current = order.indexOf(value) >= order.indexOf(prev.current) ? 1 : -1;
    prev.current = value;
  }
  return dir.current;
}
