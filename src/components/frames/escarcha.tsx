import { FrameSvg, around, f, sparkle, url, useIds, type FrameProps } from "./kit";

/** Escarcha: ice crystal shards around a frosted ring, with a glint that sweeps by. */

/** Shard pointing up from 0,0: lit left face + shaded right face. */
const SHARD_L = "M0 1.5L-2.6-3L0-12Z";
const SHARD_R = "M0 1.5L2.6-3L0-12Z";

export default function EscarchaFrame(p: FrameProps) {
  const id = useIds();
  const ring = id("ring");
  const lit = id("lit");
  const dark = id("dark");
  const glint = id("glint");
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".45" stopColor="#BFE8FF" />
          <stop offset="1" stopColor="#5F94E0" />
        </linearGradient>
        <linearGradient id={lit} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#9ED5FF" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient id={dark} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3D6FC2" />
          <stop offset="1" stopColor="#9CCBFF" />
        </linearGradient>
        <linearGradient id={glint} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".5" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54.5" fill="none" stroke="#0E2650" strokeOpacity=".4" strokeWidth="4.6" />
      <circle cx="60" cy="60" r="54.5" fill="none" stroke={url(ring)} strokeWidth="2.6" />
      <circle cx="60" cy="60" r="51.4" fill="none" stroke="#DDF2FF" strokeOpacity=".55" strokeWidth=".6" strokeDasharray="1.5 2.5" />
      {around(12, 55, -90).map((q, i) => {
        const big = i % 2 === 0;
        return (
          <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.deg + 90)}) scale(${big ? 1 : 0.7})`}>
            <g transform="rotate(-38) scale(.5)">
              <path d={SHARD_L} fill={url(lit)} />
              <path d={SHARD_R} fill={url(dark)} />
            </g>
            <g transform="rotate(38) scale(.5)">
              <path d={SHARD_L} fill={url(lit)} />
              <path d={SHARD_R} fill={url(dark)} />
            </g>
            <path d={SHARD_L} fill={url(lit)} />
            <path d={SHARD_R} fill={url(dark)} />
            <path d="M0 1.5L0-12" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth=".35" />
          </g>
        );
      })}
      {/* Frosty sparkles */}
      {around(6, 59.5, -60).map((q, i) => (
        <path key={i} d={sparkle(1.6)} fill="#FFFFFF" opacity=".85" transform={`translate(${f(q.x)} ${f(q.y)})`} />
      ))}
      {/* Glint: a bright streak travelling along the ring (static pose: resting top-left) */}
      <g className="fr-sweep fr-c">
        <circle cx="60" cy="60" r="54.5" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" pathLength="100" strokeDasharray="7 93" strokeDashoffset="-60" opacity=".95" />
        <g transform="translate(23.5 19.5)">
          <path d={sparkle(3.6)} fill="#FFFFFF" />
          <rect x="-6" y="-.3" width="12" height=".6" fill={url(glint)} />
        </g>
      </g>
    </FrameSvg>
  );
}
