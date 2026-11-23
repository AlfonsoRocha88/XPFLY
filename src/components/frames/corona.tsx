import { FrameSvg, around, dot, f, pt, sparkle, t, url, useIds, type FrameProps } from "./kit";

/**
 * Corona celestial: an ornate gold crown on a jewelled halo. Light rays turn
 * slowly behind it, a band of light sweeps around the halo and the gems glint.
 */

const RAYS = (() => {
  let d = "";
  for (let i = 0; i < 36; i++) {
    const deg = i * 10;
    const len = i % 2 ? 64.5 : i % 4 ? 69 : 73;
    const a = pt(57, deg - 1.7);
    const b = pt(57, deg + 1.7);
    const tip = pt(len, deg);
    d += `M${f(a.x)} ${f(a.y)}L${f(tip.x)} ${f(tip.y)}L${f(b.x)} ${f(b.y)}Z`;
  }
  return d;
})();

const CROWN =
  "M38.5 6.5L35.5-7Q41-3 44.5-2.5L49-12.5Q53-6 55.5-5L60-19L64.5-5Q67-6 71-12.5L75.5-2.5Q79-3 84.5-7L81.5 6.5Q60 11 38.5 6.5Z";
const BAND = "M38.5 6.5Q60 11 81.5 6.5L82.3 10.5Q60 15.4 37.7 10.5Z";
const PEARLS = (() => {
  let d = "";
  for (let i = 0; i <= 18; i++) {
    const s = i / 18;
    const x = 38.1 + 43.8 * s;
    const y = (1 - s) * (1 - s) * 8.5 + 2 * (1 - s) * s * 13.2 + s * s * 8.5;
    if (Math.abs(x - 60) < 4 || Math.abs(x - 49) < 2.4 || Math.abs(x - 71) < 2.4) continue;
    d += dot(x, y, 0.55);
  }
  return d;
})();

const HALO_GEMS = around(8, 55, -90 + 22.5);

export default function CoronaFrame(p: FrameProps) {
  const id = useIds();
  const g = {
    ray: id("ray"),
    glow: id("glow"),
    gold: id("gold"),
    goldV: id("goldv"),
    band: id("band"),
    velvet: id("velvet"),
    ruby: id("ruby"),
    sapph: id("sapph"),
    amet: id("amet"),
    emer: id("emer"),
    pearl: id("pearl"),
  };
  const glints = [
    { x: 60, y: 7.8, d: 0 },
    { x: 60, y: -24.5, d: 1.1 },
    ...HALO_GEMS.map((q, i) => ({ x: q.x, y: q.y, d: 0.45 * (i + 1) + (i % 2) * 1.3 })),
  ];
  return (
    <FrameSvg {...p}>
      <defs>
        <radialGradient id={g.ray} gradientUnits="userSpaceOnUse" cx="60" cy="60" r="74">
          <stop offset=".76" stopColor="#FFF6D2" stopOpacity=".95" />
          <stop offset=".88" stopColor="#FFD56A" stopOpacity=".45" />
          <stop offset="1" stopColor="#FFC94A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g.glow} gradientUnits="userSpaceOnUse" cx="60" cy="60" r="66">
          <stop offset=".74" stopColor="#FFE9A0" stopOpacity="0" />
          <stop offset=".84" stopColor="#FFE08A" stopOpacity=".4" />
          <stop offset="1" stopColor="#FFC94A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g.gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF8D6" />
          <stop offset=".35" stopColor="#F5C542" />
          <stop offset=".7" stopColor="#C8901E" />
          <stop offset="1" stopColor="#7A5210" />
        </linearGradient>
        <linearGradient id={g.goldV} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6CC" />
          <stop offset=".45" stopColor="#F7C948" />
          <stop offset="1" stopColor="#A66F12" />
        </linearGradient>
        <linearGradient id={g.band} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3A92E" />
          <stop offset=".5" stopColor="#FFE38A" />
          <stop offset="1" stopColor="#8C5E10" />
        </linearGradient>
        <radialGradient id={g.velvet} cx=".5" cy=".9" r=".9">
          <stop offset="0" stopColor="#A78BFA" />
          <stop offset=".6" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#2E1065" />
        </radialGradient>
        {[
          [g.ruby, "#FFD1DC", "#F43F5E", "#7F1030"],
          [g.sapph, "#E0F2FE", "#3B82F6", "#1E2A8A"],
          [g.amet, "#F5E8FF", "#B26BFF", "#4C1D95"],
          [g.emer, "#DCFCE7", "#22C55E", "#065F46"],
        ].map(([gid, a, b, c]) => (
          <radialGradient key={gid} id={gid} cx=".38" cy=".32" r=".8">
            <stop offset="0" stopColor={a} />
            <stop offset=".45" stopColor={b} />
            <stop offset="1" stopColor={c} />
          </radialGradient>
        ))}
        <radialGradient id={g.pearl} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D6CFC2" />
        </radialGradient>
      </defs>

      {/* Light rays + glow */}
      <g className="fr-spin fr-c" style={t(0, 80)}>
        <path d={RAYS} fill={url(g.ray)} />
      </g>
      <circle cx="60" cy="60" r="56" fill="none" stroke={url(g.glow)} strokeWidth="12" />

      {/* Halo */}
      <circle cx="60" cy="60" r="55" fill="none" stroke="#5A3A08" strokeOpacity=".45" strokeWidth="5" />
      <circle cx="60" cy="60" r="55" fill="none" stroke={url(g.gold)} strokeWidth="3.4" />
      <circle cx="60" cy="60" r="51.6" fill="none" stroke="#F5C542" strokeOpacity=".65" strokeWidth=".7" />
      <circle cx="60" cy="60" r="58.4" fill="none" stroke="#FFE7A0" strokeOpacity=".75" strokeWidth=".7" strokeDasharray=".01 2.4" strokeLinecap="round" />
      {/* Sweeping light along the halo */}
      <g className="fr-spin fr-c" style={t(0, 6)}>
        <circle cx="60" cy="60" r="55" fill="none" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="4" pathLength="100" strokeDasharray="10 90" strokeDashoffset="-60" strokeLinecap="round" />
        <circle cx="60" cy="60" r="55" fill="none" stroke="#FFFFFF" strokeOpacity=".9" strokeWidth="1.6" pathLength="100" strokeDasharray="4 96" strokeDashoffset="-63" strokeLinecap="round" />
      </g>

      {/* Halo gems */}
      {HALO_GEMS.map((q, i) => (
        <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.deg + 90)})`}>
          <circle r="3.6" fill="#5A3A08" opacity=".4" cy=".4" />
          <circle r="3.3" fill={url(g.gold)} stroke="#7A5210" strokeWidth=".35" />
          <path d="M0-2.6L2-.6L1.3 2H-1.3L-2-.6Z" fill={url(i % 2 ? g.amet : g.sapph)} stroke="#1E1B4B" strokeOpacity=".5" strokeWidth=".25" />
          <path d="M0-2.6L.9-.6H-.9Z" fill="#FFFFFF" opacity=".6" />
        </g>
      ))}

      {/* Crown */}
      <g transform="translate(0 -3)">
        <path d="M37.6 7Q60-30 82.4 7Z" fill={url(g.velvet)} />
        <path d={CROWN} fill="#3A2504" opacity=".35" transform="translate(.6 .9)" />
        <path d={CROWN} fill={url(g.goldV)} stroke="#7A5210" strokeWidth=".5" strokeLinejoin="round" />
        <path d="M36.6-5.2L39.4 5.4M49.2-10.6L46 -.2M60-17L57.6-3.6" fill="none" stroke="#FFFBEA" strokeOpacity=".75" strokeWidth=".6" strokeLinecap="round" />
        <path d="M60-17L62.4-3.6M71-10.6L74.2-.2M83.4-5.2L80.6 5.4" fill="none" stroke="#7A5210" strokeOpacity=".5" strokeWidth=".5" strokeLinecap="round" />
        {/* Filigree */}
        <path d="M44-.6Q46.6-4 49.2-.8M55.4 1.2Q57.6-3.4 60-1.2Q62.4-3.4 64.6 1.2M70.8-.8Q73.4-4 76-.6" fill="none" stroke="#9A6A14" strokeWidth=".55" strokeLinecap="round" />
        <path d={BAND} fill={url(g.band)} stroke="#7A5210" strokeWidth=".45" />
        <path d={PEARLS} fill={url(g.pearl)} />
        {/* Tips */}
        {[[35.5, -7, 1.4], [49, -12.5, 1.6], [71, -12.5, 1.6], [84.5, -7, 1.4]].map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={url(g.pearl)} stroke="#B9AE98" strokeWidth=".25" />
            <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="#FFFFFF" />
          </g>
        ))}
        <g transform="translate(60 -21.5)">
          <path d={sparkle(4.4, 0.22)} fill={url(g.goldV)} stroke="#7A5210" strokeWidth=".35" />
          <circle r="1.6" fill={url(g.ruby)} />
        </g>
        {/* Band gems */}
        <g transform="translate(60 10.8)">
          <path d="M0-3.2L3.2 0L0 3.2L-3.2 0Z" fill={url(g.ruby)} stroke="#5A0A1E" strokeWidth=".35" />
          <path d="M0-3.2L1.4-.6H-1.4Z" fill="#FFFFFF" opacity=".55" />
        </g>
        <ellipse cx="49" cy="10.2" rx="2.1" ry="1.8" fill={url(g.sapph)} stroke="#1E2A8A" strokeWidth=".3" />
        <ellipse cx="71" cy="10.2" rx="2.1" ry="1.8" fill={url(g.sapph)} stroke="#1E2A8A" strokeWidth=".3" />
        <circle cx="42.6" cy="9.3" r="1.1" fill={url(g.emer)} />
        <circle cx="77.4" cy="9.3" r="1.1" fill={url(g.emer)} />
      </g>

      {/* Glints */}
      {glints.map((s, i) => (
        <g key={i} transform={`translate(${f(s.x)} ${f(s.y)})`}>
          <g className="fr-sparkle" style={t(s.d, 3.8)} opacity="0">
            <path d={sparkle(3.4, 0.16)} fill="#FFFFFF" />
          </g>
        </g>
      ))}
    </FrameSvg>
  );
}
