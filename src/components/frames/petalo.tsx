import { FrameSvg, around, f, url, useIds, type FrameProps } from "./kit";

/** Pétalos: a soft pastel ring with five little flowers. */

const PETAL = "M0 0C-2.6-1.2-3.3-4.4-1.8-6.2C-1.1-7 1.1-7 1.8-6.2C3.3-4.4 2.6-1.2 0 0Z";
const LEAF = "M0 0C1.8-1.6 4.8-1.8 6.6 0C4.8 1.8 1.8 1.6 0 0Z";

export default function PetaloFrame(p: FrameProps) {
  const id = useIds();
  const ring = id("ring");
  const petal = id("petal");
  const core = id("core");
  const leaf = id("leaf");
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD3E4" />
          <stop offset=".5" stopColor="#E9B5FF" />
          <stop offset="1" stopColor="#A9B8FF" />
        </linearGradient>
        <linearGradient id={petal} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FF7FAF" />
          <stop offset=".6" stopColor="#FFB3CF" />
          <stop offset="1" stopColor="#FFF0F6" />
        </linearGradient>
        <radialGradient id={core} cx=".38" cy=".35" r=".7">
          <stop offset="0" stopColor="#FFFBE0" />
          <stop offset=".5" stopColor="#FFD24D" />
          <stop offset="1" stopColor="#E59A12" />
        </radialGradient>
        <linearGradient id={leaf} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3E9A5A" />
          <stop offset="1" stopColor="#A6E3A1" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="none" stroke="#5B2A4A" strokeOpacity=".3" strokeWidth="4.2" />
      <circle cx="60" cy="60" r="55" fill="none" stroke={url(ring)} strokeWidth="2.6" />
      <circle cx="60" cy="60" r="51.8" fill="none" stroke="#FFD3E4" strokeOpacity=".45" strokeWidth=".6" />
      {around(5, 55, -90).map((q, i) => (
        <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.deg + 90 + (i % 2 ? 12 : -12))})`}>
          <path d={LEAF} fill={url(leaf)} transform="rotate(-150) translate(4.4 0)" />
          <path d={LEAF} fill={url(leaf)} transform="rotate(-30) translate(4.4 0) scale(.85)" />
          <circle r="7.4" fill="#3A1030" opacity=".22" cy=".7" />
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d={PETAL} fill={url(petal)} stroke="#E66A9A" strokeWidth=".35" transform={`rotate(${a})`} />
          ))}
          <circle r="2.1" fill={url(core)} />
          <circle cx="-.7" cy="-.8" r=".55" fill="#FFFFFF" opacity=".9" />
        </g>
      ))}
    </FrameSvg>
  );
}
