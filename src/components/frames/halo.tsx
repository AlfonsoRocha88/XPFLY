import { FrameSvg, url, useIds, type FrameProps } from "./kit";

/** Halo: a soft ring of light that turns slowly. */
export default function HaloFrame(p: FrameProps) {
  const id = useIds()("g");
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".5" stopColor="#BFD4FF" />
          <stop offset="1" stopColor="#B9A4FF" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <g className="fr-spin fr-c">
        <circle cx="60" cy="60" r="55" fill="none" stroke={url(id)} strokeWidth="3.2" strokeLinecap="round" strokeDasharray="250 96" />
        <circle cx="60" cy="5" r="2.4" fill="#FFFFFF" />
      </g>
      <circle cx="60" cy="60" r="51" fill="none" stroke="#C9D8FF" strokeOpacity=".35" strokeWidth=".8" />
    </FrameSvg>
  );
}
