import { FrameSvg, f, pt, url, useIds, vars, type FrameProps } from "./kit";

/** Sakura: a cherry branch arching over the avatar, in bloom; now and then a petal drifts off. */

const A0 = 160;
const A1 = 352;
const BRANCH = (() => {
  const s: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const deg = A0 + ((A1 - A0) * i) / 48;
    const q = pt(56 + 1.4 * Math.sin(i / 3.2), deg);
    s.push(`${i ? "L" : "M"}${f(q.x)} ${f(q.y)}`);
  }
  return s.join("");
})();

/** Twigs: [angle on branch, length, side (+1 outward / -1 inward)] */
const TWIGS: Array<[number, number, number]> = [[182, 8, 1], [214, 7, 1], [246, 6, -1], [262, 9, 1], [300, 7, 1], [330, 8, 1]];

/** Blossoms: angle, radial offset, scale. */
const BLOSSOMS: Array<[number, number, number]> = [
  [172, 58.5, 0.9], [192, 61, 1], [206, 55.5, 0.75], [226, 59, 1.05], [250, 53.6, 0.7],
  [268, 62, 1.1], [284, 56.5, 0.85], [306, 61, 1], [322, 55.4, 0.72], [340, 59.5, 0.95],
];
const BUDS: Array<[number, number]> = [[166, 54], [236, 62.5], [294, 52.8], [348, 56]];

/** Notched cherry petal pointing up from 0,0. */
const PETAL = "M0 0C-2.4-1.4-2.9-4.2-1.3-5.6L0-4.7L1.3-5.6C2.9-4.2 2.4-1.4 0 0Z";
const FALLING = "M0 0C-1.6-.8-2-2.8-.9-3.8L0-3.2L.9-3.8C2-2.8 1.6-.8 0 0Z";

export default function SakuraFrame(p: FrameProps) {
  const id = useIds();
  const petal = id("petal");
  const bark = id("bark");
  return (
    <FrameSvg {...p}>
      <defs>
        <radialGradient id={petal} cx=".5" cy="1" r="1.05">
          <stop offset="0" stopColor="#FF8DB4" />
          <stop offset=".45" stopColor="#FFC2D6" />
          <stop offset="1" stopColor="#FFF4F8" />
        </radialGradient>
        <linearGradient id={bark} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8E5A44" />
          <stop offset="1" stopColor="#3E2219" />
        </linearGradient>
      </defs>
      {/* Faint ring completes the circle under the branch */}
      <circle cx="60" cy="60" r="55" fill="none" stroke="#FFC9DC" strokeOpacity=".45" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="52.4" fill="none" stroke="#FFC9DC" strokeOpacity=".2" strokeWidth=".5" />
      {/* Branch + twigs */}
      <path d={BRANCH} fill="none" stroke="#2A1610" strokeOpacity=".45" strokeWidth="4.4" strokeLinecap="round" transform="translate(.4 .8)" />
      <path d={BRANCH} fill="none" stroke={url(bark)} strokeWidth="3.4" strokeLinecap="round" />
      <path d={BRANCH} fill="none" stroke="#C08A6C" strokeOpacity=".6" strokeWidth=".8" strokeLinecap="round" transform="translate(-.5 -.5)" />
      {TWIGS.map(([deg, len, side], i) => {
        const a = pt(56, deg);
        const b = pt(56 + side * len * 0.75, deg + 7);
        return <path key={i} d={`M${f(a.x)} ${f(a.y)}Q${f(b.x)} ${f(a.y)} ${f(b.x)} ${f(b.y)}`} fill="none" stroke={url(bark)} strokeWidth="1.3" strokeLinecap="round" />;
      })}
      {BUDS.map(([deg, r], i) => {
        const q = pt(r, deg);
        return (
          <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${deg + 90})`}>
            <ellipse ry="2.4" rx="1.6" fill="#FF8FB5" />
            <path d="M-1.6 1.2Q0 3 1.6 1.2" fill="#6E9A4A" />
          </g>
        );
      })}
      {BLOSSOMS.map(([deg, r, s], i) => {
        const q = pt(r, deg);
        return (
          <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${(deg * 2.3) % 72}) scale(${s})`}>
            <circle r="5.8" fill="#4A1028" opacity=".18" cy=".6" />
            {[0, 72, 144, 216, 288].map((a) => (
              <path key={a} d={PETAL} transform={`rotate(${a})`} fill={url(petal)} stroke="#F27BA6" strokeWidth=".3" />
            ))}
            <circle r="1.5" fill="#FF6F9F" />
            {[0, 72, 144, 216, 288].map((a) => {
              const d = pt(2.4, a - 54, 0, 0);
              return <circle key={a} cx={f(d.x)} cy={f(d.y)} r=".42" fill="#FFE27A" />;
            })}
          </g>
        );
      })}
      {/* Drifting petals (static pose: resting just off the branch) */}
      <g transform="translate(103 48)">
        <g className="fr-fall" style={{ animationDelay: "1.2s" }}>
          <path d={FALLING} fill={url(petal)} transform="rotate(30)" />
        </g>
      </g>
      <g transform="translate(19 64)">
        <g className="fr-fall" style={{ animationDelay: "4.6s", ...vars({ "--dx": "-7px", "--dy": "26px" }) }}>
          <path d={FALLING} fill={url(petal)} transform="rotate(-40) scale(.85)" />
        </g>
      </g>
    </FrameSvg>
  );
}
