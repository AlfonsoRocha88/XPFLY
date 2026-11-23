import { FrameSvg, type FrameProps } from "./kit";

/** Órbita: two small moons circling the avatar. */
export default function OrbitaFrame(p: FrameProps) {
  return (
    <FrameSvg {...p}>
      <circle cx="60" cy="60" r="55" fill="none" stroke="#C4B5FF" strokeOpacity=".55" strokeWidth="1.4" strokeDasharray="2 5" />
      <g className="fr-spin fr-c">
        <circle cx="60" cy="5" r="5" fill="#EDE7FF" />
        <circle cx="58.5" cy="3.6" r="1.6" fill="#FFFFFF" />
      </g>
      <g className="fr-spin-rev fr-c">
        <circle cx="60" cy="115" r="3.4" fill="#9FD8FF" />
      </g>
    </FrameSvg>
  );
}
