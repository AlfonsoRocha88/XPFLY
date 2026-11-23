import { FrameSvg, f, pt, rng, t, url, useIds, vars, type FrameProps } from "./kit";

/**
 * Fénix: fiery wings spread from behind the avatar in three feather layers that
 * ripple like a wave, a crested head on top, eye-spotted tail plumes below and
 * embers rising through it all.
 */

const feather = (L: number, W: number) =>
  `M0 0C${f(-W)} ${f(-L * 0.3)} ${f(-W * 0.75)} ${f(-L * 0.78)} ${f(W * 0.25)} ${f(-L)}C${f(W * 1.05)} ${f(-L * 0.72)} ${f(W * 0.9)} ${f(-L * 0.3)} 0 0Z`;
const rachis = (L: number, W: number) => `M0 0Q${f(W * 0.15)} ${f(-L * 0.5)} ${f(W * 0.25)} ${f(-L * 0.95)}`;

type Layer = { grad: 0 | 1 | 2; r: number; W: number; items: Array<{ a: number; tilt: number; L: number }> };
const LAYERS: Layer[] = [
  { grad: 0, r: 50, W: 5, items: [34, 33, 31, 28, 24, 19, 14].map((L, k) => ({ a: 214 - k * 10, tilt: 58 - k * 7, L })) },
  { grad: 1, r: 49.5, W: 4, items: [22, 21, 19, 17, 14, 11].map((L, k) => ({ a: 210 - k * 10, tilt: 50 - k * 7, L })) },
  { grad: 2, r: 50, W: 3.1, items: [13, 12, 11, 9, 7].map((L, k) => ({ a: 206 - k * 11, tilt: 44 - k * 6, L })) },
];

const EMBERS = (() => {
  const r = rng(3);
  return Array.from({ length: 12 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const q = pt(56 + r() * 10, 90 + side * (25 + r() * 70));
    return { ...q, rr: 0.5 + r() * 0.8, delay: r() * 3.2, dur: 2.4 + r() * 1.4, dx: `${f((r() - 0.5) * 10)}px`, dy: `${f(-26 - r() * 18)}px` };
  });
})();

function Wing({ grads }: { grads: string[] }) {
  return (
    <>
      {LAYERS.map((layer, li) =>
        layer.items.map((it, k) => {
          const q = pt(layer.r, it.a);
          return (
            <g key={`${li}-${k}`} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(it.a + 90 + it.tilt)})`}>
              <g className="fr-flap" style={{ ...t(k * 0.13 + li * 0.22, 2.8), ...vars({ "--fa": `${4 + li}deg` }) }}>
                <path d={feather(it.L, layer.W)} fill="#3A0505" opacity=".3" transform="translate(.6 .4)" />
                <path d={feather(it.L, layer.W)} fill={url(grads[layer.grad])} stroke={li === 2 ? "#E07A12" : "#8E1A0E"} strokeWidth=".35" />
                <path d={rachis(it.L, layer.W)} fill="none" stroke="#FFE9A8" strokeOpacity={li === 0 ? 0.55 : 0.75} strokeWidth=".35" strokeLinecap="round" />
              </g>
            </g>
          );
        }),
      )}
    </>
  );
}

export default function FenixFrame(p: FrameProps) {
  const id = useIds();
  const grads = [id("f0"), id("f1"), id("f2")];
  const ring = id("ring");
  const blur = id("blur");
  const head = id("head");
  const ember = id("ember");
  return (
    <FrameSvg {...p}>
      <defs>
        {[
          ["#6E0C0C", "#D92E1A", "#FF9A3C"],
          ["#B8200F", "#FF7A1F", "#FFD060"],
          ["#FF8A1F", "#FFE27A", "#FFF8D6"],
        ].map((c, i) => (
          <linearGradient key={i} id={grads[i]} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={c[0]} />
            <stop offset=".55" stopColor={c[1]} />
            <stop offset="1" stopColor={c[2]} />
          </linearGradient>
        ))}
        <linearGradient id={ring} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE58A" />
          <stop offset=".5" stopColor="#FF8A1F" />
          <stop offset="1" stopColor="#C4211A" />
        </linearGradient>
        <filter id={blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <radialGradient id={head} cx=".4" cy=".35" r=".75">
          <stop offset="0" stopColor="#FFF3B0" />
          <stop offset=".5" stopColor="#FFA42E" />
          <stop offset="1" stopColor="#D2451A" />
        </radialGradient>
        <radialGradient id={ember}>
          <stop offset="0" stopColor="#FFFDE6" />
          <stop offset=".4" stopColor="#FFC24A" />
          <stop offset="1" stopColor="#FF5A1A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Tail plumes (behind) */}
      {[-20, 0, 20].map((a, i) => {
        const L = i === 1 ? 19 : 15;
        return (
          <g key={a} transform={`translate(60 111) rotate(${180 + a})`}>
            <g className="fr-sway" style={t(-i * 0.8, 3.6)}>
              <path d={feather(L, 3.6)} fill={url(grads[1])} stroke="#8E1A0E" strokeWidth=".35" />
              <path d={rachis(L, 3.6)} fill="none" stroke="#FFE9A8" strokeOpacity=".7" strokeWidth=".35" />
              <circle cx=".7" cy={f(-L * 0.74)} r="1.9" fill="#FFE27A" stroke="#B8200F" strokeWidth=".4" />
              <circle cx=".7" cy={f(-L * 0.74)} r=".8" fill="#5A0A2A" />
            </g>
          </g>
        );
      })}

      {/* Wings */}
      <Wing grads={grads} />
      <g transform="translate(120 0) scale(-1 1)">
        <Wing grads={grads} />
      </g>

      {/* Ring of fire */}
      <circle cx="60" cy="60" r="54.5" fill="none" stroke="#FF6A1A" strokeWidth="5" filter={url(blur)} opacity=".7" />
      <circle cx="60" cy="60" r="54.5" fill="none" stroke="#5A0A06" strokeOpacity=".5" strokeWidth="4.2" />
      <circle cx="60" cy="60" r="54.5" fill="none" stroke={url(ring)} strokeWidth="2.8" />
      <circle cx="60" cy="60" r="51.7" fill="none" stroke="#FFD27A" strokeOpacity=".55" strokeWidth=".5" />

      {/* Crested head */}
      {[-42, -21, 0, 21, 42].map((a, i) => {
        const L = [8, 11, 13.5, 11, 8][i];
        return (
          <g key={a} transform={`translate(60 3.5) rotate(${a})`}>
            <g className="fr-flick" style={t(-i * 0.31, 1.4)}>
              <path d={feather(L, 2.4)} fill={url(grads[i === 2 ? 2 : 1])} stroke="#B8200F" strokeWidth=".3" />
            </g>
          </g>
        );
      })}
      <circle cx="60" cy="6" r="4.8" fill={url(head)} stroke="#A5280F" strokeWidth=".4" />
      <path d="M57.4 3.6Q60 2.6 62.6 3.6" fill="none" stroke="#FFF6CC" strokeOpacity=".7" strokeWidth=".45" strokeLinecap="round" />
      <circle cx="58.2" cy="5.6" r=".8" fill="#FFFBE0" />
      <circle cx="61.8" cy="5.6" r=".8" fill="#FFFBE0" />
      <circle cx="58.2" cy="5.6" r=".35" fill="#7A1A0A" />
      <circle cx="61.8" cy="5.6" r=".35" fill="#7A1A0A" />
      <path d="M58.7 7.4L61.3 7.4L60 10.6Z" fill="#FFD24A" stroke="#B86A0A" strokeWidth=".3" strokeLinejoin="round" />

      {/* Rising embers */}
      {EMBERS.map((e, i) => (
        <g key={i} transform={`translate(${f(e.x)} ${f(e.y)})`}>
          <g className="fr-rise" style={{ ...t(e.delay, e.dur), ...vars({ "--dx": e.dx, "--dy": e.dy }) }}>
            <circle r={f(e.rr * 1.7)} fill={url(ember)} />
          </g>
        </g>
      ))}
    </FrameSvg>
  );
}
