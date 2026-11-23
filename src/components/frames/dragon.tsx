import { FrameSvg, f, pt, rng, t, url, useIds, vars, type FrameProps } from "./kit";

/**
 * Dragón: an emerald serpentine dragon coiled around the avatar. Horned head with
 * glowing eyes at the top, tapered scaled body with gold belly plates and fiery
 * dorsal spines, two clawed legs gripping the edge, a membrane wing, and a spade tail.
 * Motion: slow breathing scale, wing flap, eye-glow pulse, embers from the mouth.
 */

type V2 = { x: number; y: number };
const add = (a: V2, b: V2, k = 1): V2 => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const P = (v: V2) => `${f(v.x)} ${f(v.y)}`;

const N = 132;
const TH0 = -98;
const TH1 = -382;
const theta = (u: number) => TH0 + (TH1 - TH0) * u;
const radius = (u: number) => 55 + 2.6 * Math.sin(u * Math.PI * 5) + 2.6 * Math.pow(1 - u, 4);
const width = (u: number) => 1.1 + 9.6 * Math.pow(1 - u, 0.85) * (0.82 + 0.18 * Math.min(1, u / 0.12));
const center = (u: number) => pt(radius(u), theta(u));

const BODY = (() => {
  const c: V2[] = [];
  const n: V2[] = [];
  const tg: V2[] = [];
  const w: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = center(u);
    const a = center(Math.max(0, u - 0.002));
    const b = center(Math.min(1, u + 0.002));
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const T = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    let nn = { x: -T.y, y: T.x };
    if (nn.x * (p.x - 60) + nn.y * (p.y - 60) < 0) nn = { x: -nn.x, y: -nn.y };
    c.push(p);
    n.push(nn);
    tg.push(T);
    w.push(width(u));
  }
  const outer = c.map((p, i) => add(p, n[i], w[i] / 2));
  const inner = c.map((p, i) => add(p, n[i], -w[i] / 2));
  const body = `M${outer.map(P).join("L")}L${inner.slice().reverse().map(P).join("L")}Z`;

  const bellyEnd = Math.round(N * 0.95);
  const bellyTop = c.map((p, i) => add(p, n[i], -w[i] * 0.06));
  const belly = `M${inner.slice(0, bellyEnd).map(P).join("L")}L${bellyTop.slice(0, bellyEnd).reverse().map(P).join("L")}Z`;

  let plates = "";
  for (let i = 3; i < bellyEnd - 2; i += 3) {
    const a = bellyTop[i];
    const b = inner[i];
    const m = add({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, tg[i], 0.9 + w[i] * 0.08);
    plates += `M${P(a)}Q${P(m)} ${P(b)}`;
  }

  let scales = "";
  let shine = "";
  for (let i = 2; i < N - 3; i += 2) {
    const rows = [0.16, 0.34];
    rows.forEach((off, k) => {
      if ((i / 2 + k) % 2) return;
      const s = Math.max(0.45, w[i] * 0.1);
      const p = add(c[i], n[i], w[i] * off);
      const e1 = add(p, n[i], s);
      const e2 = add(p, n[i], -s);
      const ctl = add(p, tg[i], s * 1.9);
      scales += `M${P(e1)}Q${P(ctl)} ${P(e2)}`;
      if (k === 1) {
        const q = add(p, tg[i], -0.35);
        shine += `M${P(add(q, n[i], s * 0.7))}Q${P(add(q, tg[i], s * 1.4))} ${P(add(q, n[i], -s * 0.2))}`;
      }
    });
  }

  let spines = "";
  for (let i = 5; i < N * 0.88; i += 4) {
    const h = 1.8 + w[i] * 0.45;
    const base = 0.9 + w[i] * 0.16;
    const b1 = add(outer[i], tg[i], -base);
    const b2 = add(outer[i], tg[i], base);
    const tip = add(add(outer[i], n[i], h), tg[i], h * 0.55);
    const mid = add(add(outer[i], n[i], h * 0.45), tg[i], -base * 0.2);
    spines += `M${P(b1)}Q${P(mid)} ${P(tip)}L${P(b2)}Z`;
  }

  const end = c[N];
  const endT = tg[N];
  const tailAngle = (Math.atan2(endT.y, endT.x) * 180) / Math.PI;
  const at = (u: number) => {
    const i = Math.round(u * N);
    return { c: c[i], n: n[i], t: tg[i], w: w[i], deg: theta(u) };
  };
  const neckT = tg[0];
  const headAngle = (Math.atan2(-neckT.y, -neckT.x) * 180) / Math.PI;
  return { body, belly, plates, scales, shine, spines, end, tailAngle, at, start: c[0], headAngle };
})();

const HEAD_SCALE = 1.28;
const HEAD_ROT = BODY.headAngle + 4;
const HEAD_O = { x: BODY.start.x - 1, y: BODY.start.y - 3 };
const toWorld = (x: number, y: number) => {
  const a = (HEAD_ROT * Math.PI) / 180;
  return { x: HEAD_O.x + HEAD_SCALE * (x * Math.cos(a) - y * Math.sin(a)), y: HEAD_O.y + HEAD_SCALE * (x * Math.sin(a) + y * Math.cos(a)) };
};
const MOUTH = toWorld(24, 2.6);
const EMBERS = (() => {
  const r = rng(5);
  return Array.from({ length: 7 }, (_, i) => ({
    delay: i * 0.42 + r() * 0.3,
    dur: 1.6 + r() * 0.9,
    rr: 0.6 + r() * 0.8,
    dx: `${f(9 + r() * 12)}px`,
    dy: `${f(-3 - r() * 12)}px`,
    ox: f((r() - 0.5) * 1.5),
    oy: f((r() - 0.5) * 1.5),
  }));
})();

const WING = "M0 0C2-10 1-22-2-30Q-6-24-12-27Q-13.6-20.4-20-19Q-19.2-13.2-23-9Q-14-6.6-8-1Z";
const WING_BONES = "M0 0L-4-14L-2-30M-4-14L-12-27M-4-14L-20-19M-4-14L-23-9";

const SKULL = "M-5-3C-3-8 4-9.6 10-8C14-7 17-5.6 21-4.6C24-4 26-2.6 25.6-.6C25.2 1.4 23.4 2.6 21 3L8 4.4C3 5-2 5-5 3.4Z";
const JAW = "M-2 4C4 7 12 7.5 20 5.2C19.5 8 15 10 9 10.4C3 10.6-1 9-3 7Z";
const HORN_A = "M1-6C-3-11-9-14-16-15.5C-11-12-6-8-3-3Z";
const HORN_B = "M5-7C3-12-1-16-5-19.4C-2-14 0-10 1.2-5.6Z";
const FRILL = "M-1-5L-11-9L-4.4-2.6L-12.4-1.8L-3.6 1.2L-9.6 5.6L0 3.4Z";

export default function DragonFrame(p: FrameProps) {
  const id = useIds();
  const g = {
    body: id("body"),
    belly: id("belly"),
    spine: id("spine"),
    head: id("head"),
    jaw: id("jaw"),
    horn: id("horn"),
    eye: id("eye"),
    halo: id("halo"),
    wing: id("wing"),
    ember: id("ember"),
    claw: id("claw"),
    leg: id("leg"),
  };
  const legs = [0.33, 0.68].map((u) => BODY.at(u));
  const wingAt = BODY.at(0.1);
  const wingRoot = add(wingAt.c, wingAt.n, wingAt.w * 0.3);
  return (
    <FrameSvg {...p}>
      <defs>
        <radialGradient id={g.body} gradientUnits="userSpaceOnUse" cx="60" cy="60" r="68">
          <stop offset=".68" stopColor="#04241A" />
          <stop offset=".75" stopColor="#0F5038" />
          <stop offset=".8" stopColor="#25935F" />
          <stop offset=".835" stopColor="#7DEBB0" />
          <stop offset=".87" stopColor="#2B9A64" />
          <stop offset=".93" stopColor="#0C452F" />
          <stop offset="1" stopColor="#03180F" />
        </radialGradient>
        <radialGradient id={g.belly} gradientUnits="userSpaceOnUse" cx="60" cy="60" r="68">
          <stop offset=".66" stopColor="#8A5410" />
          <stop offset=".73" stopColor="#E7A93A" />
          <stop offset=".77" stopColor="#FFE7A0" />
          <stop offset=".82" stopColor="#D8962C" />
        </radialGradient>
        <radialGradient id={g.spine} gradientUnits="userSpaceOnUse" cx="60" cy="60" r="72">
          <stop offset=".76" stopColor="#7A1A10" />
          <stop offset=".86" stopColor="#E2542A" />
          <stop offset=".95" stopColor="#FFB547" />
          <stop offset="1" stopColor="#FFE28A" />
        </radialGradient>
        <linearGradient id={g.head} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7DEBB0" />
          <stop offset=".4" stopColor="#2A9963" />
          <stop offset="1" stopColor="#0A3A28" />
        </linearGradient>
        <linearGradient id={g.jaw} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE7A0" />
          <stop offset="1" stopColor="#B7741E" />
        </linearGradient>
        <linearGradient id={g.horn} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFF6DA" />
          <stop offset=".5" stopColor="#D9B26A" />
          <stop offset="1" stopColor="#6B4A1A" />
        </linearGradient>
        <radialGradient id={g.eye} cx=".5" cy=".55" r=".6">
          <stop offset="0" stopColor="#FFFBD6" />
          <stop offset=".45" stopColor="#FFC531" />
          <stop offset="1" stopColor="#E0560E" />
        </radialGradient>
        <radialGradient id={g.halo}>
          <stop offset="0" stopColor="#FFE07A" stopOpacity=".95" />
          <stop offset=".4" stopColor="#FF9A2E" stopOpacity=".45" />
          <stop offset="1" stopColor="#FF6A00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g.wing} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#145C4C" stopOpacity=".95" />
          <stop offset=".55" stopColor="#3A5FA0" stopOpacity=".85" />
          <stop offset="1" stopColor="#7A45C0" stopOpacity=".8" />
        </linearGradient>
        <radialGradient id={g.ember}>
          <stop offset="0" stopColor="#FFFBE0" />
          <stop offset=".4" stopColor="#FFB23A" />
          <stop offset="1" stopColor="#FF4A12" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g.claw} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8F7A52" />
          <stop offset="1" stopColor="#FFF8E6" />
        </linearGradient>
        <linearGradient id={g.leg} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2FA36A" />
          <stop offset="1" stopColor="#0B3D2A" />
        </linearGradient>
      </defs>

      <g className="fr-breathe fr-c">
        {/* Wing (behind the body) */}
        <g transform={`translate(${f(wingRoot.x)} ${f(wingRoot.y)}) rotate(${f(wingAt.deg + 90 - 12)}) scale(.86)`}>
          <g className="fr-flap" style={{ ...t(0, 3.6), ...vars({ "--fa": "-7deg" }) }}>
            <path d={WING} fill="#03170F" opacity=".35" transform="translate(.8 .8)" />
            <path d={WING} fill={url(g.wing)} stroke="#06261A" strokeWidth=".6" strokeLinejoin="round" />
            <path d="M-4-14Q-6-22-7-28M-4-14Q-11-18-16-23M-4-14Q-13-14-21-14" fill="none" stroke="#B9A6FF" strokeOpacity=".35" strokeWidth=".4" />
            <path d={WING_BONES} fill="none" stroke="#0B3D2A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={WING_BONES} fill="none" stroke="#5FD39A" strokeOpacity=".6" strokeWidth=".5" strokeLinecap="round" />
            <path d="M0 0C2-10 1-22-2-30" fill="none" stroke="#0B3D2A" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M-2-30L-1-33.4L-3.4-30.6Z" fill="#FFF3D0" />
          </g>
        </g>

        {/* Dorsal spines, body, belly */}
        <path d={BODY.spines} fill={url(g.spine)} stroke="#5A120A" strokeWidth=".35" strokeLinejoin="round" />
        <path d={BODY.body} fill="#020E09" opacity=".4" transform="translate(.6 1)" />
        <path d={BODY.body} fill={url(g.body)} stroke="#021209" strokeWidth=".7" strokeLinejoin="round" />
        <path d={BODY.scales} fill="none" stroke="#06301F" strokeWidth=".5" strokeLinecap="round" opacity=".85" />
        <path d={BODY.shine} fill="none" stroke="#B8FAD6" strokeWidth=".35" strokeLinecap="round" opacity=".45" />
        <path d={BODY.belly} fill={url(g.belly)} stroke="#6B3E0A" strokeWidth=".35" />
        <path d={BODY.plates} fill="none" stroke="#7A4A0E" strokeWidth=".5" strokeLinecap="round" opacity=".9" />

        {/* Spade tail tip */}
        <g transform={`translate(${f(BODY.end.x)} ${f(BODY.end.y)}) rotate(${f(BODY.tailAngle)})`}>
          <path d="M-1 0C1-3.4 5-5.8 9.6-5C7.6-2.4 7.6 2.4 9.6 5C5 5.8 1 3.4-1 0Z" fill={url(g.spine)} stroke="#5A120A" strokeWidth=".4" />
          <path d="M0 0L7.6 0" stroke="#FFE28A" strokeOpacity=".7" strokeWidth=".4" />
        </g>

        {/* Legs with claws gripping the edge */}
        {legs.map((l, i) => (
          <g key={i} transform={`translate(${f(l.c.x)} ${f(l.c.y)}) rotate(${f(l.deg - 90 + (i ? -14 : 14))})`}>
            <path d="M-4.6 2C-5-1.6-3.6-5-1.4-7.4L2.8-7.4C4.4-4.8 4.8-1.4 4.6 2Z" fill={url(g.leg)} stroke="#021209" strokeWidth=".5" />
            <path d="M-3 -1.6Q0-.6 3-1.6M-2.4-4.4Q.4-3.6 3.2-4.4" fill="none" stroke="#06301F" strokeWidth=".45" />
            <ellipse cx=".6" cy="-7.4" rx="3.9" ry="1.9" fill="#1F7A4F" stroke="#021209" strokeWidth=".4" />
            {[-2.8, 0.6, 4].map((x, k) => (
              <path key={k} d={`M${x - 0.9} -7.8C${x - 1.8} -9.6 ${x - 1.3} -11.2 ${x + 0.1} -12C${x - 0.4} -10.6 ${x} -9.4 ${x + 0.9} -8Z`} fill={url(g.claw)} stroke="#5E4A26" strokeWidth=".25" />
            ))}
          </g>
        ))}

        {/* Head */}
        <g transform={`translate(${f(HEAD_O.x)} ${f(HEAD_O.y)}) rotate(${f(HEAD_ROT)}) scale(${HEAD_SCALE})`}>
          <path d={HORN_B} fill={url(g.horn)} stroke="#4A3210" strokeWidth=".35" />
          <path d={FRILL} fill={url(g.spine)} stroke="#5A120A" strokeWidth=".35" strokeLinejoin="round" />
          <path d={HORN_A} fill={url(g.horn)} stroke="#4A3210" strokeWidth=".35" />
          <path d="M-4-10.2L-3-8.4M-8-12.4L-7-10.8M-12-14.2L-11.2-12.8" stroke="#6B4A1A" strokeWidth=".4" strokeLinecap="round" />
          <ellipse cx="-2" cy="1" rx="5.6" ry="5.2" fill="#1A6E47" />
          <path d={JAW} fill={url(g.jaw)} stroke="#6B3E0A" strokeWidth=".4" />
          <path d="M6 4.2L21 3L19.6 5.4L8 6.4Z" fill="#4A0A0A" />
          <path d="M10.4 3.9l.7 1.5l.7-1.6ZM13.6 3.7l.7 1.5l.7-1.6ZM16.8 3.4l.6 1.4l.6-1.5ZM11 6.3l.6-1.3l.6 1.2ZM15 6l.6-1.3l.6 1.2Z" fill="#FFF8E6" />
          <path d={SKULL} fill={url(g.head)} stroke="#021209" strokeWidth=".5" strokeLinejoin="round" />
          <path d="M10-7C15-6 20-4.6 24-3.6" fill="none" stroke="#C4FBDD" strokeOpacity=".6" strokeWidth=".6" strokeLinecap="round" />
          <path d="M14.4-5.6q1 1 2 0M18.2-4.6q1 1 2 0M1-5.4q1.2 1 2.2 0" fill="none" stroke="#06301F" strokeWidth=".4" />
          <ellipse cx="23.4" cy="-2.2" rx="1" ry=".55" fill="#021209" transform="rotate(-12 23.4 -2.2)" />
          <path d="M2 9L-1.4 13L4.6 9.8ZM5.4 9.8L3.6 13.6L8.4 10.2Z" fill={url(g.spine)} />
          {/* Whiskers */}
          <path d="M23.5-1.5C22-9 14-13 6-12.5C2-12.2-2-14-4.4-17.4" fill="none" stroke="#F5C556" strokeWidth=".7" strokeLinecap="round" />
          <path d="M19 5.6C23.6 9 28.4 9 32.4 6" fill="none" stroke="#F5C556" strokeWidth=".6" strokeLinecap="round" />
          {/* Eye */}
          <g className="fr-glow">
            <circle cx="9" cy="-3.8" r="6.2" fill={url(g.halo)} />
          </g>
          <ellipse cx="9.1" cy="-3.6" rx="3.7" ry="2.2" fill="#03170F" />
          <path d="M6.2-3.6Q9-6 12-3.8Q9-2 6.2-3.6Z" fill={url(g.eye)} />
          <path d="M9.2-5.2Q9.8-3.8 9.2-2.6Q8.6-3.8 9.2-5.2Z" fill="#1A0500" />
          <circle cx="8" cy="-4.3" r=".45" fill="#FFFFFF" />
          <path d="M4.4-5.4Q9-8.6 13.8-5.2" fill="none" stroke="#021209" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M5-6.2L1.6-10L7.4-7.2Z" fill={url(g.horn)} stroke="#4A3210" strokeWidth=".25" />
        </g>
      </g>

      {/* Embers from the mouth (static pose: a few sparks in the air) */}
      {EMBERS.map((e, i) => (
        <g key={i} transform={`translate(${f(MOUTH.x + e.ox)} ${f(MOUTH.y + e.oy)})`}>
          <g
            className="fr-rise"
            style={{ ...t(e.delay, e.dur), ...vars({ "--dx": e.dx, "--dy": e.dy }) }}
            transform={i < 3 ? `translate(${4 + i * 4} ${-2 - i * 3})` : undefined}
          >
            <circle r={f(e.rr * 1.8)} fill={url(g.ember)} />
          </g>
        </g>
      ))}
    </FrameSvg>
  );
}
