import { useEffect, useMemo } from "react";
import { m, useReducedMotion } from "motion/react";
import { ACHIEVEMENT_BY_ID, TIER_NAMES, type ConstellationId } from "@shared/achievements";
import { Coin } from "@/components/icons/GameIcons";
import { EMBLEM_ART } from "./emblems";
import { TierMedallion, TIER_STYLE } from "./emblems/TierMedallion";
import { AVATAR_FRAMES } from "./frames";

export interface Celebration {
  achievementId: string;
  tier: 1 | 2 | 3;
  coins: number;
  /** Other tiers claimed in the same batch. */
  extra: number;
  frames: string[];
}

/**
 * Signature moment for a claimed tier. Intensity scales with the tier (bronze subtle, gold big),
 * tap anywhere to skip, and it closes itself after a few seconds. Reduced motion: a plain fade.
 */
const UnlockCelebration = ({ data, onDone }: { data: Celebration; onDone: () => void }) => {
  const reduce = useReducedMotion();
  const def = ACHIEVEMENT_BY_ID[data.achievementId];
  const Art = EMBLEM_ART[data.achievementId];
  const style = TIER_STYLE[data.tier];
  const big = data.tier === 3;

  useEffect(() => {
    const t = setTimeout(onDone, big ? 4200 : 3400);
    return () => clearTimeout(t);
  }, [onDone, big]);

  // Coin burst: more coins for higher tiers.
  const coins = useMemo(
    () =>
      Array.from({ length: [0, 8, 12, 18][data.tier] }, (_, i) => {
        const a = (i / [0, 8, 12, 18][data.tier]) * Math.PI * 2 + Math.random() * 0.4;
        const d = 110 + Math.random() * 70;
        return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: Math.random() * 360, delay: 0.55 + Math.random() * 0.15 };
      }),
    [data.tier],
  );

  // Twinkling sparks drifting outward.
  const sparks = useMemo(
    () => Array.from({ length: big ? 24 : 12 }, () => ({ x: (Math.random() - 0.5) * 340, y: (Math.random() - 0.5) * 420, s: 2 + Math.random() * 3, d: Math.random() * 0.8 })),
    [big],
  );

  return (
    <m.div
      className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(70% 55% at 50% 45%, #1F2A55 0%, #0B0F24 70%, #05070F 100%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onDone}
      role="alertdialog"
      aria-label={`${def?.name}: ${TIER_NAMES[data.tier - 1]} desbloqueado, más ${data.coins} monedas`}
    >
      {!reduce && (
        <>
          {/* Rotating light rays */}
          <m.div
            className="absolute h-[620px] w-[620px]"
            style={{ background: `repeating-conic-gradient(from 0deg, ${style.glow} 0deg 6deg, transparent 6deg 22deg)`, maskImage: "radial-gradient(circle, black 15%, transparent 65%)", WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 65%)" }}
            initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
            animate={{ opacity: big ? 0.9 : 0.55, scale: 1, rotate: 40 }}
            transition={{ opacity: { duration: 0.6, delay: 0.3 }, scale: { duration: 0.8, delay: 0.3 }, rotate: { duration: 6, ease: "linear" } }}
          />
          {/* Ignition flash */}
          <m.div
            className="absolute h-40 w-40 rounded-full"
            style={{ background: `radial-gradient(circle, #fff 0%, ${style.glow} 40%, transparent 70%)` }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          />
          {sparks.map((p, i) => (
            <m.span
              key={i}
              className="absolute rounded-full bg-white"
              style={{ width: p.s, height: p.s }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{ x: p.x, y: p.y, opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, delay: 0.4 + p.d, ease: "easeOut" }}
            />
          ))}
        </>
      )}

      {/* Star → medallion: a point of light ignites, then the medallion flips in on a spring */}
      <div className="relative" style={{ perspective: 900 }}>
        {!reduce && (
          <m.div
            className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-white"
            style={{ boxShadow: "0 0 30px 10px rgba(255,255,255,.7)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.6, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.55, times: [0, 0.6, 1] }}
          />
        )}
        <m.div
          initial={reduce ? { opacity: 0 } : { scale: 0.2, rotateY: 200, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { scale: 1, rotateY: 0, opacity: 1 }}
          transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 140, damping: 13, delay: 0.35 }}
        >
          <TierMedallion tier={data.tier} size={168} shine>
            {Art && <Art className="h-full w-full" />}
          </TierMedallion>
        </m.div>

        {!reduce &&
          coins.map((c, i) => (
            <m.span
              key={i}
              className="absolute left-1/2 top-1/2 -ml-3 -mt-3 text-xp"
              initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 0 }}
              animate={{ x: [0, c.x, c.x * 0.9], y: [0, c.y, c.y + 60], scale: [0, 1, 0.8], rotate: c.r, opacity: [0, 1, 0] }}
              transition={{ duration: 1.4, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
            >
              <Coin size={24} />
            </m.span>
          ))}
      </div>

      <m.div
        className="relative mt-8 flex flex-col items-center px-6 text-center"
        initial={{ y: reduce ? 0 : 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: reduce ? 0.1 : 0.75, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: style.rim[0] }}>
          {TIER_NAMES[data.tier - 1]} desbloqueado
        </span>
        <h2 className="mt-1 font-serif text-4xl font-medium text-white">{def?.name}</h2>
        <m.span
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-base font-semibold text-[#FDE7A6]"
          initial={{ scale: reduce ? 1 : 0.6 }}
          animate={{ scale: 1 }}
          transition={{ delay: reduce ? 0 : 1.1, type: "spring", stiffness: 300, damping: 14 }}
        >
          <Coin size={18} /> +{data.coins} monedas
        </m.span>
        {data.extra > 0 && <span className="mt-2 text-sm text-white/60">y {data.extra} {data.extra === 1 ? "nivel más" : "niveles más"}</span>}
        {data.frames.map((f) => (
          <span key={f} className="mt-3 text-sm font-medium text-white">
            Nuevo marco de avatar: {AVATAR_FRAMES[f as ConstellationId]?.name ?? f}
          </span>
        ))}
        <span className="mt-6 text-xs text-white/40">Toca para continuar</span>
      </m.div>
    </m.div>
  );
};

export default UnlockCelebration;
