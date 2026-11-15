import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import "./streak-comet.css";

/**
 * StreakComet: the streak mark. A comet that ignites as the streak grows.
 *  0 days: a dark, cold rock. 1+: it catches fire; the longer the streak, the longer and thicker
 *  the tail, the faster it flickers, and the hotter its colour, shifting smoothly
 *  ember orange → flame red → magenta → violet → blue-white plasma (30+). Sparks peel off from day 7.
 * Motion is transform/opacity only (CSS keyframes) and stops for reduced motion.
 */

type RGB = [number, number, number];
// Anchor streaks and the comet's colours at each: [head core, tail start, tail end].
const STOPS: { at: number; head: RGB; mid: RGB; tip: RGB }[] = [
  { at: 1, head: [255, 236, 200], mid: [255, 170, 70], tip: [255, 110, 40] },
  { at: 3, head: [255, 240, 190], mid: [255, 120, 50], tip: [235, 50, 40] },
  { at: 7, head: [255, 232, 245], mid: [255, 90, 150], tip: [210, 40, 140] },
  { at: 14, head: [245, 232, 255], mid: [180, 110, 255], tip: [110, 60, 230] },
  { at: 30, head: [255, 255, 255], mid: [140, 210, 255], tip: [70, 120, 255] },
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;

function palette(streak: number) {
  const s = Math.max(1, streak);
  let i = STOPS.findIndex((x) => x.at > s);
  if (i === -1) return { head: mix(STOPS[4].head, STOPS[4].head, 0), mid: mix(STOPS[4].mid, STOPS[4].mid, 0), tip: mix(STOPS[4].tip, STOPS[4].tip, 0) };
  if (i === 0) i = 1;
  const a = STOPS[i - 1], b = STOPS[i];
  // Log-ish progress so early days move the colour noticeably and later ones gradually.
  const t = Math.min(1, Math.max(0, Math.log(s / a.at) / Math.log(b.at / a.at)));
  return { head: mix(a.head, b.head, t), mid: mix(a.mid, b.mid, t), tip: mix(a.tip, b.tip, t) };
}

export function StreakComet({ streak, size = 18, animated = true, className }: { streak: number; size?: number; animated?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const lit = streak > 0;
  // 0 → 1 intensity: grows fast at first, keeps growing slowly up to a month.
  const power = lit ? Math.min(1, 0.28 + Math.log(streak + 1) / Math.log(31) * 0.72) : 0;
  const c = useMemo(() => palette(streak), [streak]);
  const len = 6 + power * 9.5; // tail length (px in the 24-unit box)
  const r = 2.6 + power * 0.9; // head radius
  const speed = `${(1.25 - power * 0.6).toFixed(2)}s`; // hotter flickers faster

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("inline-block shrink-0 overflow-visible", animated && lit && "sc-live", className)}
      style={{ ["--sc-speed" as string]: speed }}
      role="img"
      aria-label={lit ? `Racha de ${streak} ${streak === 1 ? "día" : "días"}` : "Sin racha"}
    >
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0" stopColor={lit ? c.head : "#c9c4cf"} />
          <stop offset="0.55" stopColor={lit ? c.mid : "#8a8494"} />
          <stop offset="1" stopColor={lit ? c.tip : "#4a4652"} />
        </radialGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={c.mid} stopOpacity="0.75" />
          <stop offset="1" stopColor={c.mid} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c.mid} stopOpacity="0.95" />
          <stop offset="0.45" stopColor={c.tip} stopOpacity="0.6" />
          <stop offset="1" stopColor={c.tip} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c.head} />
          <stop offset="1" stopColor={c.mid} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Head sits upper-right; the tail streams down-left (local +x after the rotation). */}
      <g transform="translate(15.5 8.5) rotate(135)">
        {lit && (
          <>
            <circle r={r * 2.4} fill={`url(#${id}g)`} className="sc-glow" />
            <g className="sc-tail">
              <path d={`M0 ${-r * 1.15} Q${len * 0.45} ${-r * 1.05} ${len} 0 Q${len * 0.45} ${r * 1.05} 0 ${r * 1.15} Z`} fill={`url(#${id}t)`} />
            </g>
            <g className="sc-tail sc-tail-2">
              <path d={`M0 ${-r * 0.55} Q${len * 0.35} ${-r * 0.4} ${len * 0.72} 0 Q${len * 0.35} ${r * 0.4} 0 ${r * 0.55} Z`} fill={`url(#${id}c)`} />
            </g>
            {streak >= 7 && (
              <g>
                {[0, 1, 2].map((k) => (
                  <circle key={k} className="sc-spark" cx={len * (0.35 + k * 0.2)} cy={(k - 1) * r * 0.9} r={0.55} fill={c.head} style={{ animationDelay: `${k * -0.45}s` }} />
                ))}
              </g>
            )}
          </>
        )}
        <circle r={r} fill={`url(#${id}h)`} className={lit ? "sc-head" : undefined} />
        {!lit && <circle cx={-0.6} cy={0.5} r={0.7} fill="#3b3842" />}
      </g>
    </svg>
  );
}

export default StreakComet;
