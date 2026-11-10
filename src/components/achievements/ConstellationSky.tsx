import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ConstellationId } from "@shared/achievements";
import type { AchievementState } from "@/hooks/useAchievements";
import { EMBLEM_ART } from "./emblems";
import { TierMedallion } from "./emblems/TierMedallion";

/** Hand-placed star positions (% of the sky) and the lines between them, per constellation. */
const LAYOUTS: Record<ConstellationId, { pts: [number, number][]; edges: [number, number][] }> = {
  ritmo: { pts: [[14, 66], [38, 30], [63, 54], [86, 26]], edges: [[0, 1], [1, 2], [2, 3]] },
  constancia: { pts: [[12, 32], [31, 68], [50, 30], [70, 66], [88, 30]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  enfoque: { pts: [[50, 22], [20, 42], [80, 42], [32, 78], [68, 78]], edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]] },
  bienestar: { pts: [[14, 70], [30, 30], [52, 56], [72, 24], [88, 66]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 4]] },
  conocimiento: { pts: [[16, 34], [40, 70], [62, 30], [86, 64]], edges: [[0, 1], [1, 2], [2, 3], [0, 2]] },
  ascenso: { pts: [[10, 76], [25, 46], [42, 70], [58, 34], [74, 60], [89, 26]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
};

/** Deterministic background stars, so the sky doesn't reshuffle on every render. */
function useStarfield(seed: string, count = 46) {
  return useMemo(() => {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    return Array.from({ length: count }, () => ({ x: rnd() * 100, y: rnd() * 100, r: rnd() < 0.15 ? 1.4 : 0.8, tw: 3 + rnd() * 4, td: rnd() * 4 }));
  }, [seed, count]);
}

interface Props {
  id: ConstellationId;
  items: AchievementState[];
  onSelect: (s: AchievementState) => void;
}

const ConstellationSky = ({ id, items, onSelect }: Props) => {
  const layout = LAYOUTS[id];
  const stars = useStarfield(id);
  const reduce = useReducedMotion();

  return (
    <div
      className="relative h-[290px] w-full overflow-hidden rounded-3xl md:h-[340px]"
      style={{ background: "radial-gradient(120% 90% at 30% 10%, #24305E 0%, #141A38 45%, #0B0F24 100%)" }}
    >
      {/* Background starfield + soft nebula */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: "hsl(var(--primary))" }} />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {stars.map((s, i) => (
          <circle key={i} className="sky-star" cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="#fff" style={{ ["--tw" as string]: `${s.tw}s`, ["--td" as string]: `${s.td}s` }} />
        ))}
      </svg>

      {/* Constellation lines: dim guide always, bright line drawn once both ends are lit */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {layout.edges.map(([a, b]) => {
          const [x1, y1] = layout.pts[a];
          const [x2, y2] = layout.pts[b];
          const lit = (items[a]?.claimed ?? 0) > 0 && (items[b]?.claimed ?? 0) > 0;
          return (
            <g key={`${a}-${b}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeOpacity={0.12} strokeWidth={0.35} strokeDasharray="1 1.6" vectorEffect="non-scaling-stroke" />
              {lit && (
                <motion.line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#FDE7A6" strokeOpacity={0.75} strokeWidth={1.4} vectorEffect="non-scaling-stroke"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                  style={{ filter: "drop-shadow(0 0 3px rgba(253,231,166,.8))" }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Stars = achievements */}
      {items.map((s, i) => {
        const [x, y] = layout.pts[i] ?? [50, 50];
        const Art = EMBLEM_ART[s.def.id];
        const ready = s.claimable > 0;
        return (
          // Wrapper centers the star; Motion owns the button's transform (scale), so they can't clash.
          <div key={s.def.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
          <motion.button
            type="button"
            onClick={() => onSelect(s)}
            className="flex flex-col items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: reduce ? 0 : 0.06 * i }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            aria-label={`${s.def.name}: ${ready ? "listo para reclamar" : s.claimed ? ["", "bronce", "plata", "oro"][s.claimed] : "bloqueado"}`}
          >
            <span className="relative">
              {ready && <span className="claim-halo absolute inset-0 rounded-full border-2 border-[#FDE7A6]" aria-hidden />}
              <motion.span layoutId={`emblem-${s.def.id}`} className="block">
                <TierMedallion tier={s.claimed} size={54} shine={s.claimed === 3} onDark>
                  {Art && <Art className="h-full w-full" />}
                </TierMedallion>
              </motion.span>
              {ready && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FDE7A6] px-1 text-[10px] font-bold text-[#3A2A00] shadow">
                  +{s.claimable}
                </span>
              )}
            </span>
            <span className="max-w-[76px] truncate text-[10.5px] font-medium text-white/80">{s.def.name}</span>
          </motion.button>
          </div>
        );
      })}
    </div>
  );
};

export default ConstellationSky;
