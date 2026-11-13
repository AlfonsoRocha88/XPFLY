import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Zap } from "lucide-react";

interface XpPopupProps {
  amount: number;
  onComplete: () => void;
}

/** "+N XP" after finishing a task: drops in as a glass pill, counts up, then floats away. */
const XpPopup = ({ amount, onComplete }: XpPopupProps) => {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(true);
  const [n, setN] = useState(reduce ? amount : 0);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 450);
      setN(Math.round(amount * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const t = window.setTimeout(() => setShown(false), 1300);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); };
  }, [amount, reduce]);

  useEffect(() => {
    if (!reduce) return;
    const t = window.setTimeout(() => setShown(false), 1300);
    return () => window.clearTimeout(t);
  }, [reduce]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+1rem)] z-50 flex justify-center">
      <AnimatePresence onExitComplete={onComplete}>
        {shown && (
          <m.div
            key="xp"
            className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.94, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, filter: "blur(4px)", transition: { duration: 0.25 } }}
            transition={{ type: "spring", duration: 0.45, bounce: 0.25 }}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-[0_0_12px_rgba(251,191,36,0.6)]">
              <Zap className="h-3.5 w-3.5" fill="currentColor" />
            </span>
            <span className="tabular-nums">+{n} XP</span>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default XpPopup;
