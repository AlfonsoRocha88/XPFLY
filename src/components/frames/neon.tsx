import { FrameSvg, around, f, url, useIds, type FrameProps } from "./kit";

/** Neón: twin cyan/magenta neon tubes whose glow slowly breathes in counter-time. */
export default function NeonFrame(p: FrameProps) {
  const id = useIds();
  const blur = id("blur");
  return (
    <FrameSvg {...p}>
      <defs>
        {/* Static glow (never animated): only its opacity pulses. */}
        <filter id={blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
      </defs>
      {/* Dark tube housing */}
      <circle cx="60" cy="60" r="54.2" fill="none" stroke="#120A24" strokeOpacity=".55" strokeWidth="8.5" />
      {/* Cyan tube */}
      <g className="fr-pulse">
        <circle cx="60" cy="60" r="56.6" fill="none" stroke="#2EE6FF" strokeWidth="4.5" filter={url(blur)} opacity=".9" />
      </g>
      <circle cx="60" cy="60" r="56.6" fill="none" stroke="#3FEAFF" strokeWidth="2.1" pathLength="100" strokeDasharray="30 3 12 3 46 6" strokeLinecap="round" />
      <circle cx="60" cy="60" r="56.6" fill="none" stroke="#E9FDFF" strokeWidth=".7" pathLength="100" strokeDasharray="30 3 12 3 46 6" strokeLinecap="round" />
      {/* Magenta tube */}
      <g className="fr-pulse" style={{ animationDelay: "-1.6s" }}>
        <circle cx="60" cy="60" r="52" fill="none" stroke="#FF3FD2" strokeWidth="4" filter={url(blur)} opacity=".85" />
      </g>
      <circle cx="60" cy="60" r="52" fill="none" stroke="#FF4FD8" strokeWidth="1.9" pathLength="100" strokeDasharray="22 4 40 4 26 4" strokeDashoffset="-18" strokeLinecap="round" />
      <circle cx="60" cy="60" r="52" fill="none" stroke="#FFE6FA" strokeWidth=".6" pathLength="100" strokeDasharray="22 4 40 4 26 4" strokeDashoffset="-18" strokeLinecap="round" />
      {/* Tube clips */}
      {around(4, 54.3, -45).map((q, i) => (
        <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.deg + 90)})`}>
          <rect x="-1.6" y="-4.4" width="3.2" height="8.8" rx="1.2" fill="#2A2140" stroke="#6E5A9E" strokeWidth=".4" />
          <rect x="-.9" y="-3.6" width="1.8" height="1.3" rx=".4" fill="#9B8BD0" />
        </g>
      ))}
    </FrameSvg>
  );
}
