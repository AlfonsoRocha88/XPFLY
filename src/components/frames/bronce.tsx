import { FrameSvg, around, url, useIds, type FrameProps } from "./kit";

/** Bronce: a beaded metal ring with four rivets and a soft static shine. */
export default function BronceFrame(p: FrameProps) {
  const id = useIds();
  const metal = id("metal");
  const bead = id("bead");
  const shine = id("shine");
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE2BD" />
          <stop offset=".35" stopColor="#D79A5B" />
          <stop offset=".7" stopColor="#9A5E2C" />
          <stop offset="1" stopColor="#5E3517" />
        </linearGradient>
        <radialGradient id={bead} cx=".35" cy=".32" r=".75">
          <stop offset="0" stopColor="#FFF3E0" />
          <stop offset=".35" stopColor="#E0A468" />
          <stop offset=".8" stopColor="#8A5126" />
          <stop offset="1" stopColor="#5A3114" />
        </radialGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".9" />
          <stop offset=".45" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Groove + band */}
      <circle cx="60" cy="60" r="55" fill="none" stroke="#3D220E" strokeOpacity=".55" strokeWidth="7" />
      <circle cx="60" cy="60" r="55" fill="none" stroke={url(metal)} strokeWidth="5.4" />
      <circle cx="60" cy="60" r="57.6" fill="none" stroke="#FFE7C7" strokeOpacity=".55" strokeWidth=".5" />
      <circle cx="60" cy="60" r="52.3" fill="none" stroke="#4A2810" strokeOpacity=".7" strokeWidth=".6" />
      {/* Beads */}
      {around(32, 55, -84.375).map((q, i) => (
        <g key={i}>
          <circle cx={q.x} cy={q.y + 0.4} r="2.1" fill="#3A1F0B" opacity=".45" />
          <circle cx={q.x} cy={q.y} r="2" fill={url(bead)} />
        </g>
      ))}
      {/* Rivets at the cardinal points */}
      {around(4, 55, -90).map((q, i) => (
        <g key={i} transform={`translate(${q.x} ${q.y})`}>
          <circle r="4.4" fill="#4A2810" opacity=".5" cy=".5" />
          <circle r="4" fill={url(bead)} stroke="#5E3517" strokeWidth=".5" />
          <circle r="1.8" fill="none" stroke="#FFE7C7" strokeOpacity=".7" strokeWidth=".5" />
          <circle cx="-1.3" cy="-1.4" r=".8" fill="#FFFFFF" opacity=".9" />
        </g>
      ))}
      {/* Static shine on the upper-left */}
      <circle cx="60" cy="60" r="55" fill="none" stroke={url(shine)} strokeWidth="5" strokeLinecap="round" pathLength="100" strokeDasharray="14 86" strokeDashoffset="-56" opacity=".7" />
    </FrameSvg>
  );
}
