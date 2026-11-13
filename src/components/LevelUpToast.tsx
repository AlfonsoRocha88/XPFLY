import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Destello } from "@/components/currency/Destello";

interface LevelUpToastProps {
  level: number;
  onComplete: () => void;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const R = 92;
const CIRC = 2 * Math.PI * R;

/**
 * Level up: a rare, earned moment, so it gets a full motion-graphics sequence.
 * 1) a ring draws itself closed  2) it flashes and light rays turn behind it
 * 3) the old level slides away and the new one resolves from a blur  4) crystals spiral out.
 * Tap anywhere (or wait) to dismiss. Reduced motion: a plain fade with the same content.
 */
const LevelUpToast = ({ level, onComplete }: LevelUpToastProps) => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [stage, setStage] = useState<0 | 1>(0); // 0 = ring filling, 1 = new level shown

  useEffect(() => {
    const s = window.setTimeout(() => setStage(1), reduce ? 0 : 750);
    const t = window.setTimeout(() => setVisible(false), 3400);
    return () => { window.clearTimeout(s); window.clearTimeout(t); };
  }, [reduce]);

  const sparks = useMemo(
    () => Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return { x: Math.cos(a) * (130 + (i % 3) * 22), y: Math.sin(a) * (130 + (i % 3) * 22), d: 0.05 * (i % 4) };
    }),
    [],
  );

  return createPortal(
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <m.div
          key="levelup"
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          onClick={() => setVisible(false)}
          role="status"
          aria-live="polite"
          aria-label={`Subiste al nivel ${level}`}
        >
          <div className="absolute inset-0 bg-[#070a1c]/75 backdrop-blur-md" />

          <div className="relative grid h-[22rem] w-[22rem] place-items-center">
            {/* Light rays: a soft conic fan that turns slowly once the ring closes */}
            {!reduce && (
              <m.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "repeating-conic-gradient(from 0deg, rgba(190,200,255,0.18) 0deg 6deg, transparent 6deg 22deg)",
                  maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
                  WebkitMaskImage: "radial-gradient(circle, black 30%, transparent 70%)",
                }}
                initial={{ opacity: 0, scale: 0.9, rotate: 0 }}
                animate={stage ? { opacity: 1, scale: 1, rotate: 40 } : { opacity: 0 }}
                transition={{ opacity: { duration: 0.4 }, scale: { duration: 0.6, ease: EASE_OUT }, rotate: { duration: 6, ease: "linear" } }}
              />
            )}

            {/* Glow core */}
            <m.div
              className="absolute h-56 w-56 rounded-full"
              style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 70%)" }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: stage ? 1.15 : 0.9, opacity: stage ? 1 : 0.5 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            />

            {/* Progress ring drawing itself closed, then a flash ring expanding out */}
            <svg viewBox="0 0 220 220" className="absolute h-[15rem] w-[15rem] -rotate-90" aria-hidden>
              <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
              <m.circle
                cx="110" cy="110" r={R} fill="none" stroke="url(#lvl-grad)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={{ strokeDashoffset: reduce ? 0 : CIRC }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: reduce ? 0 : 0.7, ease: [0.77, 0, 0.175, 1] }}
              />
              <defs>
                <linearGradient id="lvl-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" />
                  <stop offset=".5" stopColor="hsl(var(--primary))" />
                  <stop offset="1" stopColor="#B9A4FF" />
                </linearGradient>
              </defs>
            </svg>
            {stage === 1 && !reduce && (
              <m.span
                className="absolute h-[15rem] w-[15rem] rounded-full border-2 border-white/70"
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.8, ease: EASE_OUT }}
              />
            )}

            {/* Crystals spiralling out on the flash */}
            {stage === 1 && !reduce && sparks.map((s, i) => (
              <m.span
                key={i}
                className="absolute"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.6, rotate: 0 }}
                animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: 1, rotate: 120 }}
                transition={{ duration: 1.1, ease: EASE_OUT, delay: s.d }}
              >
                <Destello size={14} />
              </m.span>
            ))}

            {/* Numbers: previous level leaves upward, new one resolves out of a blur */}
            <div className="relative flex flex-col items-center text-center text-white">
              <m.span
                className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70"
                initial={{ opacity: 0, letterSpacing: "0.6em" }}
                animate={{ opacity: 1, letterSpacing: "0.35em" }}
                transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
              >
                Nuevo nivel
              </m.span>
              <span className="relative mt-1 grid h-24 place-items-center overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <m.span
                    key={stage}
                    className="col-start-1 row-start-1 font-serif text-[5.5rem] font-medium leading-none tabular-nums"
                    initial={{ y: "60%", opacity: 0, filter: "blur(10px)", scale: 0.92 }}
                    animate={{ y: "0%", opacity: 1, filter: "blur(0px)", scale: 1 }}
                    exit={{ y: "-60%", opacity: 0, filter: "blur(8px)" }}
                    transition={{ type: "spring", duration: 0.55, bounce: 0.2 }}
                  >
                    {stage ? level : Math.max(1, level - 1)}
                  </m.span>
                </AnimatePresence>
              </span>
              <m.span
                className="mt-2 text-sm text-white/75"
                initial={{ opacity: 0, y: 6 }}
                animate={stage ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.15 }}
              >
                Buen trabajo, sigue así.
              </m.span>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default LevelUpToast;
