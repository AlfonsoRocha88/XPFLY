import { FrameSvg, around, f, pt, rng, t, url, useIds, vars, type FrameProps } from "./kit";

/**
 * Oscuridad: smoky tendrils swirl in two counter-rotating layers around a
 * black-violet rim; glowing violet eyes open in the smoke every few seconds.
 */

const WISP = "M-3.4 1C-6.6-4-1.8-8.6-4.4-15C-.4-11.4 4.6-9.6 3.2-4.4C2.8-2.2 2.6-.6 3.4 1Z";
const WISP_LINE = "M-.8-.6C-2.6-4.6.2-7.6-1.8-11.8";
const CURL = "M0 0C-1.6-3-5.6-3.4-6.6-.4C-7.2 1.6-5.2 3-3.8 1.8";

const MOTES = (() => {
  const r = rng(11);
  return Array.from({ length: 8 }, (_, i) => {
    const q = pt(56 + r() * 6, i * 45 + r() * 25);
    return { ...q, rr: 0.5 + r() * 0.7, delay: r() * 3, dx: `${f((r() - 0.5) * 8)}px`, dy: `${f(-8 - r() * 10)}px` };
  });
})();

function Eyes({ deg, r, delay, ids }: { deg: number; r: number; delay: number; ids: { glow: string; iris: string } }) {
  const q = pt(r, deg);
  return (
    <g transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(deg + 90)})`}>
      <g className="fr-eyes" style={t(delay)}>
        {[-3.6, 3.6].map((x) => (
          <g key={x} transform={`translate(${x} 0) rotate(${x < 0 ? 10 : -10})`}>
            <ellipse rx="5.2" ry="3.6" fill={url(ids.glow)} />
            <path d="M-2.8 0Q0-2.3 2.8 0Q0 2.3-2.8 0Z" fill={url(ids.iris)} />
            <path d="M0-1.4Q.5 0 0 1.4Q-.5 0 0-1.4Z" fill="#1A0530" />
            <circle cx="-.9" cy="-.55" r=".4" fill="#FFFFFF" />
          </g>
        ))}
      </g>
    </g>
  );
}

export default function OscuridadFrame(p: FrameProps) {
  const id = useIds();
  const rim = id("rim");
  const smoke = id("smoke");
  const smoke2 = id("smoke2");
  const glow = id("glow");
  const iris = id("iris");
  const mote = id("mote");
  const back = around(12, 54, -90);
  const front = around(9, 55.5, -70);
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B1763" />
          <stop offset=".5" stopColor="#12071F" />
          <stop offset="1" stopColor="#2A0F47" />
        </linearGradient>
        <linearGradient id={smoke} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#07030D" stopOpacity=".95" />
          <stop offset=".55" stopColor="#25104A" stopOpacity=".85" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity=".45" />
        </linearGradient>
        <linearGradient id={smoke2} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#120624" stopOpacity=".9" />
          <stop offset=".6" stopColor="#3B1A6E" stopOpacity=".7" />
          <stop offset="1" stopColor="#C4A2FF" stopOpacity=".35" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#D8B4FE" stopOpacity=".9" />
          <stop offset=".45" stopColor="#A855F7" stopOpacity=".45" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={iris} cx=".5" cy=".5" r=".6">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".35" stopColor="#E9D5FF" />
          <stop offset="1" stopColor="#A855F7" />
        </radialGradient>
        <radialGradient id={mote}>
          <stop offset="0" stopColor="#E9D5FF" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Back smoke layer */}
      <g className="fr-spin fr-c" style={t(0, 46)}>
        {back.map((q, i) => (
          <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.deg + 90 + 28)}) scale(${i % 2 ? 0.9 : 1.15})`}>
            <g className="fr-wisp" style={t(-i * 0.45, 4 + (i % 4) * 0.5)}>
              <path d={WISP} fill={url(smoke)} />
              <path d={WISP_LINE} fill="none" stroke="#A78BFA" strokeOpacity=".45" strokeWidth=".45" strokeLinecap="round" />
            </g>
          </g>
        ))}
      </g>

      {/* Black-violet rim */}
      <circle cx="60" cy="60" r="54.5" fill="none" stroke="#05020A" strokeOpacity=".7" strokeWidth="7.4" />
      <circle cx="60" cy="60" r="54.5" fill="none" stroke={url(rim)} strokeWidth="5.4" />
      <circle cx="60" cy="60" r="56.9" fill="none" stroke="#8B5CF6" strokeOpacity=".5" strokeWidth=".5" />
      <circle cx="60" cy="60" r="51.6" fill="none" stroke="#7C3AED" strokeOpacity=".35" strokeWidth="1.8" />
      <circle cx="60" cy="60" r="51.6" fill="none" stroke="#DDD6FE" strokeOpacity=".55" strokeWidth=".35" />

      {/* Front smoke layer, turning the other way */}
      <g className="fr-spin-rev fr-c" style={t(0, 64)}>
        {front.map((q, i) => (
          <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.deg + 90 - 34)}) scale(${i % 3 === 0 ? 0.85 : 0.65})`}>
            <g className="fr-wisp" style={t(-i * 0.6, 5)}>
              <path d={WISP} fill={url(smoke2)} />
            </g>
          </g>
        ))}
        {around(5, 59, -20).map((q, i) => (
          <path key={i} d={CURL} fill="none" stroke="#C4B5FD" strokeOpacity=".5" strokeWidth=".5" strokeLinecap="round" transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.deg + 60)})`} />
        ))}
      </g>

      {/* Eyes in the dark */}
      <Eyes deg={-128} r={59.5} delay={0} ids={{ glow, iris }} />
      <Eyes deg={36} r={60} delay={-4.2} ids={{ glow, iris }} />

      {/* Drifting motes */}
      {MOTES.map((m, i) => (
        <g key={i} transform={`translate(${f(m.x)} ${f(m.y)})`}>
          <g className="fr-rise" style={{ ...t(m.delay, 3.6), ...vars({ "--dx": m.dx, "--dy": m.dy }) }}>
            <circle r={f(m.rr * 2)} fill={url(mote)} />
          </g>
        </g>
      ))}
    </FrameSvg>
  );
}
