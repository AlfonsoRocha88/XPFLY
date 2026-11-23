import { FrameSvg, dot, f, pt, rng, sparkle, t, url, useIds, type FrameProps } from "./kit";

/**
 * Galaxia: glowing spiral arms form the ring and turn slowly, star dust rides
 * along them, bright stars twinkle in place and a comet orbits the avatar.
 */

const ARMS = 5;
const armPoint = (k: number, s: number) => pt(46.5 + 16.5 * s, (k * 360) / ARMS + 125 * s);

const GEO = (() => {
  const arms: string[] = [];
  const cores: string[] = [];
  const lanes: string[] = [];
  for (let k = 0; k < ARMS; k++) {
    const left: string[] = [];
    const right: string[] = [];
    const core: string[] = [];
    const lane: string[] = [];
    const M = 40;
    for (let i = 0; i <= M; i++) {
      const s = i / M;
      const c = armPoint(k, s);
      const a = armPoint(k, Math.max(0, s - 0.01));
      const b = armPoint(k, Math.min(1, s + 0.01));
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const w = 0.3 + 5.4 * Math.pow(Math.sin(Math.PI * s), 0.9) * (1 - 0.35 * s);
      left.push(`${f(c.x + nx * w * 0.5)} ${f(c.y + ny * w * 0.5)}`);
      right.push(`${f(c.x - nx * w * 0.5)} ${f(c.y - ny * w * 0.5)}`);
      if (s > 0.04 && s < 0.75) core.push(`${f(c.x)} ${f(c.y)}`);
      if (s > 0.2 && s < 0.85) lane.push(`${f(c.x + nx * w * 0.22)} ${f(c.y + ny * w * 0.22)}`);
    }
    arms.push(`M${left.join("L")}L${right.reverse().join("L")}Z`);
    cores.push(`M${core.join("L")}`);
    lanes.push(`M${lane.join("L")}`);
  }
  const r = rng(42);
  let dust = "";
  let dustBlue = "";
  for (let i = 0; i < 80; i++) {
    const k = Math.floor(r() * ARMS);
    const s = 0.05 + r() * 0.9;
    const c = armPoint(k, s);
    const j = pt((r() - 0.5) * 5, r() * 360, 0, 0);
    const d = dot(c.x + j.x, c.y + j.y, 0.22 + r() * 0.45);
    if (r() < 0.3) dustBlue += d;
    else dust += d;
  }
  return { arms: arms.join(""), cores: cores.join(""), lanes: lanes.join(""), dust, dustBlue };
})();

const STARS = [
  { deg: -60, r: 63, s: 3.2 }, { deg: -150, r: 62, s: 2.6 }, { deg: 20, r: 64, s: 2.4 }, { deg: 75, r: 62, s: 3 },
  { deg: 140, r: 64, s: 2.2 }, { deg: 205, r: 60, s: 1.8 }, { deg: -100, r: 58, s: 1.8 }, { deg: 45, r: 57, s: 1.6 }, { deg: 175, r: 56, s: 1.7 },
].map((s, i) => ({ ...s, ...pt(s.r, s.deg), delay: i * 0.47 }));

const COMET_R = 61;
const tail0 = pt(COMET_R + 0.9, -90);
const tail1 = pt(COMET_R, -128);
const tail2 = pt(COMET_R - 0.9, -90);
const COMET_TAIL = `M${f(tail0.x)} ${f(tail0.y)}A${COMET_R + 0.9} ${COMET_R + 0.9} 0 0 0 ${f(tail1.x)} ${f(tail1.y)}A${COMET_R - 0.9} ${COMET_R - 0.9} 0 0 1 ${f(tail2.x)} ${f(tail2.y)}Z`;

export default function GalaxiaFrame(p: FrameProps) {
  const id = useIds();
  const neb = id("neb");
  const arm = id("arm");
  const star = id("star");
  const tail = id("tail");
  const head = id("head");
  return (
    <FrameSvg {...p}>
      <defs>
        <radialGradient id={neb} gradientUnits="userSpaceOnUse" cx="60" cy="60" r="68">
          <stop offset=".68" stopColor="#6D4BFF" stopOpacity="0" />
          <stop offset=".78" stopColor="#7C5CFF" stopOpacity=".35" />
          <stop offset=".86" stopColor="#E879F9" stopOpacity=".22" />
          <stop offset=".95" stopColor="#38BDF8" stopOpacity=".08" />
          <stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={arm} gradientUnits="userSpaceOnUse" cx="60" cy="60" r="66">
          <stop offset=".7" stopColor="#FFFFFF" stopOpacity=".95" />
          <stop offset=".78" stopColor="#F9C6FF" stopOpacity=".9" />
          <stop offset=".86" stopColor="#A78BFA" stopOpacity=".7" />
          <stop offset=".94" stopColor="#4F46E5" stopOpacity=".3" />
          <stop offset="1" stopColor="#312E81" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={star}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".35" stopColor="#C7D2FE" stopOpacity=".55" />
          <stop offset="1" stopColor="#A5B4FC" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={tail} gradientUnits="userSpaceOnUse" x1={f(tail0.x)} y1={f(tail0.y)} x2={f(tail1.x)} y2={f(tail1.y)}>
          <stop offset="0" stopColor="#E0F7FF" />
          <stop offset=".35" stopColor="#7DD3FC" stopOpacity=".6" />
          <stop offset="1" stopColor="#818CF8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={head}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".3" stopColor="#BAE6FD" stopOpacity=".8" />
          <stop offset="1" stopColor="#7DD3FC" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Nebula band */}
      <circle cx="60" cy="60" r="56" fill="none" stroke={url(neb)} strokeWidth="20" />
      <circle cx="60" cy="60" r="50.8" fill="none" stroke="#C4B5FD" strokeOpacity=".35" strokeWidth=".5" />

      {/* Spiral arms */}
      <g className="fr-spin fr-c" style={t(0, 60)}>
        <path d={GEO.arms} fill={url(arm)} />
        <path d={GEO.lanes} fill="none" stroke="#1E1250" strokeOpacity=".55" strokeWidth=".7" strokeLinecap="round" />
        <path d={GEO.cores} fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth=".55" strokeLinecap="round" />
        <path d={GEO.dust} fill="#FFFFFF" opacity=".9" />
        <path d={GEO.dustBlue} fill="#A5F3FC" opacity=".9" />
      </g>

      {/* Twinkling stars */}
      {STARS.map((s, i) => (
        <g key={i} transform={`translate(${f(s.x)} ${f(s.y)})`}>
          <g className="fr-twinkle" style={t(s.delay, 2.4 + (i % 3) * 0.5)}>
            <circle r={f(s.s * 1.3)} fill={url(star)} />
            <path d={sparkle(s.s)} fill="#FFFFFF" />
          </g>
        </g>
      ))}

      {/* Comet */}
      <g className="fr-spin fr-c" style={t(0, 8)}>
        <path d={COMET_TAIL} fill={url(tail)} />
        <circle cx="60" cy={60 - COMET_R} r="4.2" fill={url(head)} />
        <circle cx="60" cy={60 - COMET_R} r="1.4" fill="#FFFFFF" />
      </g>
    </FrameSvg>
  );
}
