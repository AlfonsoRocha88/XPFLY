import { FrameSvg, f, pt, t, url, useIds, type FrameProps } from "./kit";

/**
 * Tormenta: a ring of billowing storm clouds that drifts slowly, lightning bolts
 * that crack outward and flash the clouds, and a little rain below.
 */

const BOLT = "M0 0L-3.2 7.2L.6 7.2L-2.2 15.6L5 4.6L1.2 4.6L3.4 0Z";
const BOLTS = [
  { deg: -42, s: 1.15, delay: 0 },
  { deg: 158, s: 1, delay: 1.9 },
  { deg: 62, s: 0.85, delay: 3.6 },
];

/** A ring whose outer edge billows outward and inner edge billows inward. */
function cloudRing(rOut: number, rIn: number, n: number, offset: number, bumpOut: number, bumpIn: number) {
  const step = 360 / n;
  const P = (r: number, deg: number) => { const q = pt(r, deg); return `${f(q.x)} ${f(q.y)}`; };
  let d = `M${P(rOut, offset)}`;
  for (let i = 1; i <= n; i++) {
    const wob = i % 2 ? 1 : 0.85;
    d += `A${f(bumpOut * wob)} ${f(bumpOut * wob)} 0 0 1 ${P(rOut, offset + i * step)}`;
  }
  d += `M${P(rIn, offset + step / 2)}`;
  for (let i = 1; i <= n; i++) d += `A${bumpIn} ${bumpIn} 0 0 0 ${P(rIn, offset + step / 2 - i * step)}`;
  return d + "Z";
}

const FRONT = cloudRing(58.6, 50.6, 20, -90, 9.8, 13);
const BACK = cloudRing(61.2, 52, 15, -78, 13.4, 16);
/** Little highlight curls on the upper side of each front billow. */
const CURLS = Array.from({ length: 20 }, (_, i) => {
  const deg = -90 + i * 18 + 9;
  const a = pt(56.2, deg - 5);
  const b = pt(56.2, deg + 5);
  return `M${f(a.x)} ${f(a.y)}A6 6 0 0 1 ${f(b.x)} ${f(b.y)}`;
}).join("");

export default function TormentaFrame(p: FrameProps) {
  const id = useIds();
  const cloud = id("cloud");
  const boltFill = id("bolt");
  const flash = id("flash");
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={cloud} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="120">
          <stop offset="0" stopColor="#F1F4FC" />
          <stop offset=".5" stopColor="#BAC3DA" />
          <stop offset="1" stopColor="#7A86A6" />
        </linearGradient>
        <linearGradient id={boltFill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".5" stopColor="#FFF59A" />
          <stop offset="1" stopColor="#FFC93C" />
        </linearGradient>
        <radialGradient id={flash}>
          <stop offset="0" stopColor="#FFFBE0" stopOpacity=".95" />
          <stop offset=".4" stopColor="#FFF3A0" stopOpacity=".4" />
          <stop offset="1" stopColor="#FFF3A0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Lightning (behind the clouds, cracking outward) */}
      {BOLTS.map((b, i) => {
        const q = pt(58, b.deg);
        return (
          <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(b.deg - 90 + 14)}) scale(${b.s})`}>
            <g className="fr-flash" style={t(b.delay)}>
              <circle cy="8" r="11" fill={url(flash)} />
              <path d={BOLT} fill={url(boltFill)} stroke="#F0A81E" strokeWidth=".5" strokeLinejoin="round" />
            </g>
          </g>
        );
      })}

      {/* Back clouds, dark */}
      <g className="fr-spin fr-c" style={t(0, 90)}>
        <path d={BACK} fill="#3A4262" fillRule="evenodd" />
      </g>
      {/* Front clouds, light (static so the top-lit shading stays on top) */}
      <g>
        <path d={FRONT} fill="#1A1F33" opacity=".35" fillRule="evenodd" transform="translate(0 1.2)" />
        <path d={FRONT} fill={url(cloud)} fillRule="evenodd" stroke="#59638A" strokeWidth=".45" />
        <path d={CURLS} fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".6" strokeLinecap="round" />
      </g>

      {/* Clouds light up when the bolts strike */}
      {BOLTS.map((b, i) => {
        const q = pt(55, b.deg);
        return (
          <g key={i} className="fr-flash" style={t(b.delay)} opacity="0">
            <circle cx={f(q.x)} cy={f(q.y)} r="13" fill={url(flash)} />
          </g>
        );
      })}

      {/* Rain */}
      {[96, 104, 112, 120, 128, 74, 82].map((deg, i) => {
        const q = pt(63, deg);
        return (
          <g key={i} transform={`translate(${f(q.x)} ${f(q.y)})`}>
            <g className="fr-rain" style={t(i * 0.17, 0.9 + (i % 3) * 0.15)}>
              <path d="M0 0L-1 3" stroke="#9CC8FF" strokeWidth=".8" strokeLinecap="round" opacity=".85" />
            </g>
          </g>
        );
      })}
    </FrameSvg>
  );
}
