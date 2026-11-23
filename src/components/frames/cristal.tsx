import { FrameSvg, around, url, useIds, type FrameProps } from "./kit";

/** Cristal: faceted crystal points around the rim. */
export default function CristalFrame(p: FrameProps) {
  const id = useIds()("g");
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".5" stopColor="#BFE3FF" />
          <stop offset="1" stopColor="#8F9CFF" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="none" stroke={url(id)} strokeWidth="2.4" />
      {around(8, 55).map((q, i) => (
        <path key={i} d="M0 -6 L2.4 0 L0 6 L-2.4 0 Z" transform={`translate(${q.x} ${q.y}) rotate(${q.deg + 90})`} fill={url(id)} stroke="#FFFFFF" strokeWidth=".5" />
      ))}
    </FrameSvg>
  );
}
