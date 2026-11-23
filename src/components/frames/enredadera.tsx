import { FrameSvg, dot, f, pt, rng, t, url, useIds, vars, type FrameProps } from "./kit";

/**
 * Jardín secreto: two flowering vines grow up both sides from the bottom
 * (stroke draw-on), leaves pop out along them and sway, flowers bloom open
 * near the top, and fireflies drift around.
 */

type V = { deg: number; r: number };
/** Vine centerline: from the bottom (90°) to near the top, waving around r=55. */
function vine(dir: 1 | -1, phase: number): V[] {
  const out: V[] = [];
  for (let i = 0; i <= 64; i++) {
    const u = i / 64;
    const deg = 90 + dir * 172 * u;
    out.push({ deg, r: 55 + 2.6 * Math.sin(u * Math.PI * 7 + phase) });
  }
  return out;
}
const toPath = (v: V[]) => v.map((q, i) => { const p = pt(q.r, q.deg); return `${i ? "L" : "M"}${f(p.x)} ${f(p.y)}`; }).join("");

const VINES = [vine(-1, 0), vine(1, Math.PI), vine(-1, Math.PI * 0.9), vine(1, 0.2)].map((v, i) => ({
  d: toPath(i < 2 ? v : v.slice(6, 40)),
  thin: i >= 2,
}));

/** Leaves along both vines: position, outward-ish rotation, order (for stagger). */
const LEAVES = [-1, 1].flatMap((dir) =>
  Array.from({ length: 9 }, (_, i) => {
    const u = 0.06 + i * 0.105;
    const deg = 90 + dir * 172 * u;
    const q = pt(55 + 2.6 * Math.sin(u * Math.PI * 7 + (dir === 1 ? Math.PI : 0)), deg);
    const side = i % 2 ? 1 : -1;
    return { ...q, rot: deg + 90 + side * 62 * dir, s: 0.8 + (i % 3) * 0.12, u };
  }),
);

/** Tendril curls (small spirals) hanging off the vines. */
const CURLS = [-1, 1].flatMap((dir) =>
  [0.3, 0.62].map((u) => {
    const deg = 90 + dir * 172 * u;
    return { ...pt(57.5, deg), rot: deg + 90, u, dir };
  }),
);

/** Flowers: angle, radius, scale, palette index. */
const FLOWERS: Array<[number, number, number, number]> = [
  [-90, 57, 1.15, 0], [-118, 58.5, 0.9, 1], [-62, 58.5, 0.9, 1], [-150, 56, 0.8, 2], [-30, 56, 0.8, 2], [170, 58, 0.75, 0], [10, 58, 0.75, 0],
];
const PALETTES = [
  ["#FFF3F8", "#FF8FBD", "#E0458A"],
  ["#F4EEFF", "#B89BFF", "#7A55E0"],
  ["#FFFDF2", "#FFE07A", "#F0A81E"],
];

const LEAF = "M0 0C-3-1.8-3.8-6-.2-9.4C3.4-6 3-1.8 0 0Z";
const PETAL = "M0 0C-2.8-1.6-3.3-5.4-1.2-6.8C-.4-7.3.4-7.3 1.2-6.8C3.3-5.4 2.8-1.6 0 0Z";

const FIREFLIES = (() => {
  const r = rng(7);
  return Array.from({ length: 7 }, (_, i) => {
    const q = pt(60 + r() * 8, -170 + i * 52 + r() * 20);
    return { ...q, delay: r() * 3, dx: `${f((r() - 0.5) * 10)}px`, dy: `${f(-6 - r() * 10)}px` };
  });
})();

export default function EnredaderaFrame(p: FrameProps) {
  const id = useIds();
  const stem = id("stem");
  const leaf = id("leaf");
  const glow = id("glow");
  const petals = PALETTES.map((_, i) => id(`p${i}`));
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={stem} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2F5E2A" />
          <stop offset="1" stopColor="#6FAE4E" />
        </linearGradient>
        <linearGradient id={leaf} x1="0" y1="1" x2=".5" y2="0">
          <stop offset="0" stopColor="#2C6B34" />
          <stop offset=".6" stopColor="#5DB25A" />
          <stop offset="1" stopColor="#C4F09A" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#FFFBD0" />
          <stop offset=".35" stopColor="#F5F08A" stopOpacity=".7" />
          <stop offset="1" stopColor="#D6F06A" stopOpacity="0" />
        </radialGradient>
        {PALETTES.map((c, i) => (
          <radialGradient key={i} id={petals[i]} cx=".5" cy="1" r="1.1">
            <stop offset="0" stopColor={c[2]} />
            <stop offset=".5" stopColor={c[1]} />
            <stop offset="1" stopColor={c[0]} />
          </radialGradient>
        ))}
      </defs>

      <circle cx="60" cy="60" r="55" fill="none" stroke="#173A1F" strokeOpacity=".3" strokeWidth="6" />

      {/* Vines draw themselves in from the bottom */}
      {VINES.map((v, i) => (
        <g key={i}>
          {!v.thin && <path d={v.d} pathLength="1" className="fr-draw" style={t(i * 0.15, 1.9)} fill="none" stroke="#1E3B1A" strokeOpacity=".5" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />}
          <path d={v.d} pathLength="1" className="fr-draw" style={t(v.thin ? 0.6 + i * 0.1 : i * 0.15, v.thin ? 1.4 : 1.9)} fill="none" stroke={url(stem)} strokeWidth={v.thin ? 1 : 2.2} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      {CURLS.map((c, i) => (
        <g key={i} transform={`translate(${f(c.x)} ${f(c.y)}) rotate(${f(c.rot)}) scale(${c.dir} 1)`}>
          <path d="M0 2C0-1 3-3.6 5.4-2.4C7.4-1.4 7-1.4 6.4.4C5.6 2.2 3 1.4 3.6-.4" pathLength="1" className="fr-draw" style={t(0.5 + c.u * 1.6, 0.8)} fill="none" stroke="#7BBE5A" strokeWidth=".8" strokeLinecap="round" />
        </g>
      ))}

      {/* Leaves pop out along the vine, then sway */}
      {LEAVES.map((l, i) => (
        <g key={i} transform={`translate(${f(l.x)} ${f(l.y)}) rotate(${f(l.rot)}) scale(${f(l.s)})`}>
          <g className="fr-pop" style={t(0.25 + l.u * 1.7)}>
            <g className="fr-sway" style={t(-(i % 5) * 0.7, 3 + (i % 3) * 0.6)}>
              <path d={LEAF} fill="#14301A" opacity=".35" transform="translate(.5 .6)" />
              <path d={LEAF} fill={url(leaf)} stroke="#25562C" strokeWidth=".4" />
              <path d="M0 0V-8" stroke="#DDF7B8" strokeOpacity=".6" strokeWidth=".4" strokeLinecap="round" />
            </g>
          </g>
        </g>
      ))}

      {/* Flowers bloom petal by petal */}
      {FLOWERS.map(([deg, r, s, pal], i) => {
        const q = pt(r, deg);
        const delay = 1.5 + i * 0.14;
        return (
          <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${(i * 23) % 72}) scale(${s})`}>
            <circle r="7" fill="#2A0F25" opacity=".22" cy=".7" />
            {[0, 72, 144, 216, 288].map((a, k) => (
              <g key={a} transform={`rotate(${a})`}>
                <g className="fr-pop" style={t(delay + k * 0.06, 0.7)}>
                  <path d={PETAL} fill={url(petals[pal])} stroke={PALETTES[pal][2]} strokeOpacity=".6" strokeWidth=".3" />
                </g>
              </g>
            ))}
            <g className="fr-pop" style={t(delay + 0.3, 0.5)}>
              <circle r="2" fill="#FFD54A" stroke="#E89B12" strokeWidth=".4" />
              <path d={[0, 1, 2, 3, 4].map((k) => { const d = pt(1, k * 72 - 90, 0, 0); return dot(d.x, d.y, 0.35); }).join("")} fill="#B86A0A" />
              <circle cx="-.6" cy="-.7" r=".5" fill="#FFFFFF" opacity=".85" />
            </g>
          </g>
        );
      })}

      {/* Fireflies (ambient) */}
      {FIREFLIES.map((g, i) => (
        <g key={i} transform={`translate(${f(g.x)} ${f(g.y)})`}>
          <g className="fr-rise" style={{ ...t(2 + g.delay, 3.4), ...vars({ "--dx": g.dx, "--dy": g.dy }) }}>
            <circle r="2.4" fill={url(glow)} />
            <circle r=".55" fill="#FFFDE8" />
          </g>
        </g>
      ))}
    </FrameSvg>
  );
}
