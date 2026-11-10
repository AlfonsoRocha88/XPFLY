import { useId } from "react";
import type { ConstellationId } from "@shared/achievements";

/**
 * Avatar frames: decorative rings drawn over a round avatar (transparent center).
 * One per constellation, unlocked by finishing it in gold.
 */
type FrameProps = { size: number };

function Ring({ size, children, tone = "gold" }: FrameProps & { children: React.ReactNode; tone?: "gold" | "silver" }) {
  const id = useId().replace(/:/g, "");
  const stops = tone === "gold" ? ["#FFF1A8", "#E1B12C", "#8A6410"] : ["#FFFFFF", "#B9C3CD", "#6E7B88"];
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset=".5" stopColor={stops[1]} />
          <stop offset="1" stopColor={stops[2]} />
        </linearGradient>
      </defs>
      <g stroke={`url(#${id})`} fill={`url(#${id})`} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="60" cy="60" r="55" fill="none" strokeWidth="3" />
        <circle cx="60" cy="60" r="51" fill="none" strokeWidth=".8" strokeOpacity=".7" />
        {children}
      </g>
    </svg>
  );
}

const around = (n: number, r: number, offset = -90) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((offset + (i * 360) / n) * Math.PI) / 180;
    return { x: 60 + r * Math.cos(a), y: 60 + r * Math.sin(a), deg: offset + (i * 360) / n };
  });

const Sun = ({ size }: FrameProps) => (
  <Ring size={size}>
    {around(16, 57.5).map((p, i) => (
      <path key={i} d={`M0 -2 L0 ${i % 2 ? 4 : 7}`} transform={`translate(${p.x} ${p.y}) rotate(${p.deg - 90})`} strokeWidth="2" fill="none" />
    ))}
    <circle cx="60" cy="3" r="4.5" />
  </Ring>
);

const Flame = ({ size }: FrameProps) => (
  <Ring size={size}>
    {around(10, 56, -90).map((p, i) => (
      <path key={i} d="M0 0 c-3 -3 -3 -7 0 -10 c3 3 3 7 0 10 Z" transform={`translate(${p.x} ${p.y}) rotate(${p.deg + 90})`} strokeWidth=".6" />
    ))}
  </Ring>
);

const Focus = ({ size }: FrameProps) => (
  <Ring size={size} tone="silver">
    {around(4, 56, -90).map((p, i) => (
      <path key={i} d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" transform={`translate(${p.x} ${p.y})`} strokeWidth=".6" />
    ))}
    {around(12, 56, -75).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.3" />)}
  </Ring>
);

const Leaves = ({ size }: FrameProps) => (
  <Ring size={size}>
    {around(18, 56, 100).filter((_, i) => i !== 0 && i !== 17).map((p, i) => (
      <ellipse key={i} cx={p.x} cy={p.y} rx="2.6" ry="6" transform={`rotate(${p.deg + (i < 8 ? 25 : -25)} ${p.x} ${p.y})`} strokeWidth=".5" />
    ))}
    <circle cx="60" cy="116" r="3" />
  </Ring>
);

const Pages = ({ size }: FrameProps) => (
  <Ring size={size} tone="silver">
    <path d="M60 6 c-6 -5 -14 -5 -20 -2 v9 c6 -3 14 -3 20 2 c6 -5 14 -5 20 -2 v-9 c-6 -3 -14 -3 -20 2 Z" strokeWidth=".8" />
    {around(8, 56, -45).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.6" />)}
  </Ring>
);

const Peaks = ({ size }: FrameProps) => (
  <Ring size={size}>
    <path d="M38 12 L48 2 L54 8 L60 -2 L66 8 L72 2 L82 12 Z" strokeWidth=".8" />
    {around(6, 56, 30).map((p, i) => (
      <path key={i} d="M0 -4 L1.2 -1.2 L4 0 L1.2 1.2 L0 4 L-1.2 1.2 L-4 0 L-1.2 -1.2 Z" transform={`translate(${p.x} ${p.y})`} strokeWidth=".4" />
    ))}
  </Ring>
);

export const AVATAR_FRAMES: Record<ConstellationId, { name: string; Frame: (p: FrameProps) => JSX.Element }> = {
  ritmo: { name: "Aurora", Frame: Sun },
  constancia: { name: "Llama eterna", Frame: Flame },
  enfoque: { name: "Estrella polar", Frame: Focus },
  bienestar: { name: "Laurel sereno", Frame: Leaves },
  conocimiento: { name: "Códice", Frame: Pages },
  ascenso: { name: "Cumbre", Frame: Peaks },
};
