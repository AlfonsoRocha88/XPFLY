import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import type { ChestReward } from "@/hooks/useChests";
import { GameIcon } from "@/components/icons/GameIcons";
import { Destello } from "@/components/currency/Destello";
import { playSfx } from "@/lib/sfx";
import { Orb } from "./Orb";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const MIN_CHARGE_MS = 1100;

const RARITY: Record<string, { label: string; glow: string; sound: "reveal" | "revealRare" | "revealLegendary" }> = {
  common: { label: "Común", glow: "hsl(220 90% 75%)", sound: "reveal" },
  rare: { label: "Rara", glow: "hsl(195 95% 65%)", sound: "revealRare" },
  epic: { label: "Épica", glow: "hsl(275 90% 70%)", sound: "revealRare" },
  legendary: { label: "Legendaria", glow: "hsl(45 100% 65%)", sound: "revealLegendary" },
};

/** Counts up to `to` with an ease-out, so a pile of Destellos lands instead of popping. */
function useCountUp(to: number, run: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 700);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return v;
}

interface Props {
  open: boolean;
  reward: ChestReward | null;
  opening: boolean;
  onClose: () => void;
}

type Phase = "charge" | "burst" | "reveal";

/**
 * Opening an orb: it gathers light (charge) while the server rolls the reward, cracks into
 * shards (burst), and the reward rises out of the flash (reveal). A rare, earned moment, so it
 * gets the full sequence; with reduced motion it becomes a simple fade.
 */
const OrbOpenOverlay = ({ open, reward, onClose }: Props) => {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("charge");
  const openedAt = useRef(0);

  // Restart the sequence each time the overlay opens.
  useEffect(() => {
    if (!open) return;
    setPhase("charge");
    openedAt.current = performance.now();
    playSfx("orbCharge");
  }, [open]);

  // Once the reward is known (and the charge had time to read), burst, then reveal.
  useEffect(() => {
    if (!open || !reward || phase !== "charge") return;
    const wait = Math.max(0, MIN_CHARGE_MS - (performance.now() - openedAt.current));
    const t1 = window.setTimeout(() => { setPhase("burst"); playSfx("orbBurst"); }, reduce ? 0 : wait);
    const t2 = window.setTimeout(() => { setPhase("reveal"); playSfx(RARITY[reward.rarity]?.sound ?? "reveal"); }, reduce ? 50 : wait + 380);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [open, reward, phase, reduce]);

  const rarity = RARITY[reward?.rarity ?? "common"] ?? RARITY.common;
  const isDestellos = reward?.type === "destellos" || reward?.icon === "destellos";
  const count = useCountUp(reward?.amount ?? 0, phase === "reveal" && isDestellos);
  useEffect(() => { if (phase === "reveal" && isDestellos) window.setTimeout(() => playSfx("destellos"), 250); }, [phase, isDestellos]);

  // Shards: fixed directions with a little jitter, decided once per open.
  const shards = useMemo(
    () => Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const d = 110 + Math.random() * 70;
      return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: Math.random() * 180, s: 0.6 + Math.random() * 0.7 };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          key="orb-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          role="dialog"
          aria-modal="true"
          aria-label="Abriendo orbe"
          onClick={() => phase === "reveal" && onClose()}
        >
          {/* Deep space backdrop that warms toward the reward's rarity color */}
          <div className="absolute inset-0 bg-[#070a1c]/80 backdrop-blur-md" />
          <m.div
            className="absolute inset-0"
            animate={{ opacity: phase === "charge" ? 0.35 : 0.8 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            style={{ background: `radial-gradient(circle at 50% 45%, ${phase === "charge" ? "hsl(250 90% 65%)" : rarity.glow} 0%, transparent 55%)` }}
          />

          <div className="relative flex h-80 w-80 items-center justify-center">
            {/* Charge: rings drawn inward + the orb trembling with energy */}
            {phase === "charge" && !reduce && [0, 1, 2].map((i) => (
              <m.span
                key={i}
                className="absolute rounded-full border border-white/40"
                style={{ width: 240, height: 240 }}
                initial={{ scale: 1.25, opacity: 0 }}
                animate={{ scale: 0.45, opacity: [0, 0.7, 0] }}
                transition={{ duration: 1.1, ease: EASE_OUT, repeat: Infinity, delay: i * 0.36 }}
              />
            ))}

            <AnimatePresence>
              {phase === "charge" && (
                <m.div
                  key="orb"
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={reduce ? { scale: 1, opacity: 1, y: 0 } : { scale: [1, 1.04, 0.98, 1.06], opacity: 1, y: [0, -4, 0], rotate: [0, -2, 2, 0] }}
                  exit={{ scale: 1.25, opacity: 0, filter: "blur(6px)", transition: { duration: 0.22, ease: EASE_OUT } }}
                  transition={reduce ? { duration: 0.2 } : { duration: 1.1, ease: "easeInOut", repeat: Infinity }}
                >
                  <Orb size={140} />
                </m.div>
              )}
            </AnimatePresence>

            {/* Burst: a flash, a shockwave ring and crystal shards flying out */}
            {phase !== "charge" && !reduce && (
              <>
                <m.span
                  className="absolute h-40 w-40 rounded-full bg-white"
                  initial={{ scale: 0.6, opacity: 0.9 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE_OUT }}
                />
                <m.span
                  className="absolute h-40 w-40 rounded-full border-2"
                  style={{ borderColor: rarity.glow }}
                  initial={{ scale: 0.7, opacity: 1 }}
                  animate={{ scale: 2.6, opacity: 0 }}
                  transition={{ duration: 0.7, ease: EASE_OUT }}
                />
                {shards.map((s, i) => (
                  <m.span
                    key={i}
                    className="absolute"
                    initial={{ x: 0, y: 0, opacity: 1, scale: s.s, rotate: 0 }}
                    animate={{ x: s.x, y: s.y, opacity: 0, rotate: s.r }}
                    transition={{ duration: 0.8, ease: EASE_OUT }}
                  >
                    <Destello size={18} />
                  </m.span>
                ))}
              </>
            )}

            {/* Reveal: the reward rises out of the light */}
            <AnimatePresence>
              {phase === "reveal" && reward && (
                <m.div
                  key="reward"
                  className="relative flex flex-col items-center text-center text-white"
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.6, bounce: 0.25 }}
                >
                  <m.div
                    className="grid h-28 w-28 place-items-center rounded-full"
                    style={{ background: `radial-gradient(circle, ${rarity.glow} 0%, transparent 70%)` }}
                    animate={reduce ? undefined : { rotate: [0, 6, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {isDestellos ? <Destello size={72} twinkle /> : <GameIcon name={reward.icon} size={64} className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]" />}
                  </m.div>
                  <p className="mt-4 font-serif text-3xl font-medium tabular-nums">
                    {isDestellos ? `+${count}` : reward.label}
                  </p>
                  <p className="mt-0.5 text-sm text-white/70">{isDestellos ? "destellos" : "Nuevo en tu colección"}</p>
                  <span className="mt-3 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide" style={{ color: rarity.glow }}>
                    {rarity.label}
                  </span>
                  <m.p
                    className="mt-8 text-xs text-white/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                  >
                    Toca para continuar
                  </m.p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default OrbOpenOverlay;
