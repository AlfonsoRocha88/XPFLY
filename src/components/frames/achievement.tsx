import type { ReactNode } from "react";
import { FrameSvg, around, url, useIds, type FrameProps } from "./kit";

/**
 * Achievement frames: one per constellation, unlocked by finishing it in gold.
 * Static metal rings (moved unchanged from achievements/frames).
 */
function Ring({ size, animated, children, tone = "gold" }: FrameProps & { children: ReactNode; tone?: "gold" | "silver" }) {
  const id = useIds()("m");
  const stops = tone === "gold" ? ["#FFF1A8", "#E1B12C", "#8A6410"] : ["#FFFFFF", "#B9C3CD", "#6E7B88"];
  return (
    <FrameSvg size={size} animated={animated}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset=".5" stopColor={stops[1]} />
          <stop offset="1" stopColor={stops[2]} />
        </linearGradient>
      </defs>
      <g stroke={url(id)} fill={url(id)} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="60" cy="60" r="55" fill="none" strokeWidth="3" />
        <circle cx="60" cy="60" r="51" fill="none" strokeWidth=".8" strokeOpacity=".7" />
        {children}
      </g>
    </FrameSvg>
  );
}

export const SunFrame = (p: FrameProps) => (
  <Ring {...p}>
    {around(16, 57.5).map((q, i) => (
      <path key={i} d={`M0 -2 L0 ${i % 2 ? 4 : 7}`} transform={`translate(${q.x} ${q.y}) rotate(${q.deg - 90})`} strokeWidth="2" fill="none" />
    ))}
    <circle cx="60" cy="3" r="4.5" />
  </Ring>
);

export const FlameFrame = (p: FrameProps) => (
  <Ring {...p}>
    {around(10, 56, -90).map((q, i) => (
      <path key={i} d="M0 0 c-3 -3 -3 -7 0 -10 c3 3 3 7 0 10 Z" transform={`translate(${q.x} ${q.y}) rotate(${q.deg + 90})`} strokeWidth=".6" />
    ))}
  </Ring>
);

export const FocusFrame = (p: FrameProps) => (
  <Ring {...p} tone="silver">
    {around(4, 56, -90).map((q, i) => (
      <path key={i} d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" transform={`translate(${q.x} ${q.y})`} strokeWidth=".6" />
    ))}
    {around(12, 56, -75).map((q, i) => <circle key={i} cx={q.x} cy={q.y} r="1.3" />)}
  </Ring>
);

export const LeavesFrame = (p: FrameProps) => (
  <Ring {...p}>
    {around(18, 56, 100).filter((_, i) => i !== 0 && i !== 17).map((q, i) => (
      <ellipse key={i} cx={q.x} cy={q.y} rx="2.6" ry="6" transform={`rotate(${q.deg + (i < 8 ? 25 : -25)} ${q.x} ${q.y})`} strokeWidth=".5" />
    ))}
    <circle cx="60" cy="116" r="3" />
  </Ring>
);

export const PagesFrame = (p: FrameProps) => (
  <Ring {...p} tone="silver">
    <path d="M60 6 c-6 -5 -14 -5 -20 -2 v9 c6 -3 14 -3 20 2 c6 -5 14 -5 20 -2 v-9 c-6 -3 -14 -3 -20 2 Z" strokeWidth=".8" />
    {around(8, 56, -45).map((q, i) => <circle key={i} cx={q.x} cy={q.y} r="1.6" />)}
  </Ring>
);

export const PeaksFrame = (p: FrameProps) => (
  <Ring {...p}>
    <path d="M38 12 L48 2 L54 8 L60 -2 L66 8 L72 2 L82 12 Z" strokeWidth=".8" />
    {around(6, 56, 30).map((q, i) => (
      <path key={i} d="M0 -4 L1.2 -1.2 L4 0 L1.2 1.2 L0 4 L-1.2 1.2 L-4 0 L-1.2 -1.2 Z" transform={`translate(${q.x} ${q.y})`} strokeWidth=".4" />
    ))}
  </Ring>
);
