import { FrameSvg, f, pt, sparkle, url, useIds, type FrameProps } from "./kit";

/** Constelación: a dotted star ring with tiny stars joined like a constellation. */

const STARS = [
  { deg: -90, r: 56.5, s: 4.6 },
  { deg: -62, r: 58.5, s: 2.4 },
  { deg: -38, r: 55.5, s: 3 },
  { deg: -8, r: 57.5, s: 2.2 },
  { deg: 30, r: 56, s: 3.2 },
  { deg: 62, r: 58.5, s: 2.2 },
  { deg: 108, r: 56, s: 3.4 },
  { deg: 140, r: 58, s: 2.2 },
  { deg: 170, r: 55.5, s: 2.8 },
  { deg: 205, r: 58, s: 2.4 },
  { deg: 236, r: 56, s: 3.2 },
].map((s) => ({ ...s, ...pt(s.r, s.deg) }));

/** Constellation segments (indices into STARS). */
const LINKS: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [4, 5], [6, 7], [7, 8], [8, 9], [9, 10], [10, 0]];

export default function PuntosFrame(p: FrameProps) {
  const id = useIds();
  const glow = id("glow");
  return (
    <FrameSvg {...p}>
      <defs>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#E6EEFF" stopOpacity=".9" />
          <stop offset=".4" stopColor="#9DB6FF" stopOpacity=".35" />
          <stop offset="1" stopColor="#9DB6FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="none" stroke="#1B2550" strokeOpacity=".45" strokeWidth="3.6" />
      <circle cx="60" cy="60" r="55" fill="none" stroke="#CFDCFF" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.01 3.6" opacity=".85" />
      <circle cx="60" cy="60" r="51.8" fill="none" stroke="#8EA6FF" strokeOpacity=".3" strokeWidth=".5" />
      <g stroke="#B7C8FF" strokeOpacity=".7" strokeWidth=".55" strokeLinecap="round">
        {LINKS.map(([a, b], i) => (
          <line key={i} x1={f(STARS[a].x)} y1={f(STARS[a].y)} x2={f(STARS[b].x)} y2={f(STARS[b].y)} />
        ))}
      </g>
      {STARS.map((s, i) => (
        <g key={i} transform={`translate(${f(s.x)} ${f(s.y)})`}>
          <circle r={s.s * 1.5} fill={url(glow)} />
          <path d={sparkle(s.s)} fill="#FFFFFF" />
          <circle r={s.s * 0.28} fill="#FFF6D6" />
        </g>
      ))}
    </FrameSvg>
  );
}
