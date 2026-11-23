import { FrameSvg, f, pt, url, useIds, type FrameProps } from "./kit";

/** Hiedra: a wavy ivy vine wrapping the avatar, with three-lobed leaves. */

const VINE = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 180; i++) {
    const deg = -90 + i * 2;
    const r = 55 + 1.6 * Math.sin((deg * Math.PI) / 30);
    const q = pt(r, deg);
    pts.push(`${i ? "L" : "M"}${f(q.x)} ${f(q.y)}`);
  }
  return pts.join("") + "Z";
})();

/** Ivy leaf pointing up from its stem at 0,0. */
const LEAF =
  "M0 0C-1.6-.4-4.6-.6-6.2-2.6C-4.8-3.4-3.6-4.2-3.4-6.4C-2-6-.9-7.4-.1-10C.8-7.4 2-6 3.4-6.4C3.6-4.2 4.8-3.4 6.2-2.6C4.6-.6 1.6-.4 0 0Z";
const VEINS = "M0 0V-8.6M0-2.6L-4.2-3M0-2.6L4.2-3";

const LEAVES = Array.from({ length: 16 }, (_, i) => {
  const deg = -90 + i * 22.5 + 6;
  const q = pt(55.4, deg);
  const out = i % 2 ? 1 : -1;
  return { ...q, rot: deg + 90 + out * 48, s: i % 3 === 0 ? 1.05 : 0.82 };
});

export default function HiedraFrame(p: FrameProps) {
  const id = useIds();
  const leaf = id("leaf");
  const leaf2 = id("leaf2");
  const stem = id("stem");
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={leaf} x1="0" y1="1" x2=".6" y2="0">
          <stop offset="0" stopColor="#2F6B2A" />
          <stop offset=".55" stopColor="#5DAA45" />
          <stop offset="1" stopColor="#B6E57E" />
        </linearGradient>
        <linearGradient id={leaf2} x1="0" y1="1" x2=".6" y2="0">
          <stop offset="0" stopColor="#24532A" />
          <stop offset=".6" stopColor="#3F8A3E" />
          <stop offset="1" stopColor="#8BCB62" />
        </linearGradient>
        <linearGradient id={stem} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8DB86A" />
          <stop offset="1" stopColor="#3E5E2A" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="none" stroke="#1F3A1A" strokeOpacity=".35" strokeWidth="4" />
      <path d={VINE} fill="none" stroke="#2E4A22" strokeWidth="2.6" strokeLinejoin="round" />
      <path d={VINE} fill="none" stroke={url(stem)} strokeWidth="1.5" strokeLinejoin="round" />
      {LEAVES.map((l, i) => (
        <g key={i} transform={`translate(${f(l.x)} ${f(l.y)}) rotate(${f(l.rot)}) scale(${l.s})`}>
          <path d="M0 0L0 1.6" stroke="#3E5E2A" strokeWidth="1" />
          <path d={LEAF} fill="#173315" opacity=".35" transform="translate(.5 .7)" />
          <path d={LEAF} fill={url(i % 2 ? leaf : leaf2)} stroke="#21461C" strokeWidth=".45" strokeLinejoin="round" />
          <path d={VEINS} fill="none" stroke="#D9F5B0" strokeOpacity=".65" strokeWidth=".4" strokeLinecap="round" />
        </g>
      ))}
    </FrameSvg>
  );
}
