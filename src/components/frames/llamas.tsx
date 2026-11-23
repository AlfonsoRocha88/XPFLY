import { FrameSvg, around, f, t, url, useIds, type FrameProps } from "./kit";

/** Llamas: a ring of flame tongues that flicker, each on its own beat. */

const OUTER = "M0 1C-4.6.4-6.2-4.4-3.4-8.6C-2.8-6.4-1.6-5.8-.8-6.8C-1.6-10.4.4-13.8 1-17.6C3.6-14 6.6-9.4 4.6-4C3.8-1.4 2.2 1.2 0 1Z";
const INNER = "M0 .6C-2.4.2-3.2-2.8-1.6-5.2C-1.2-3.8-.4-3.6 0-4.2C-.2-6.4.8-8.4 1.2-10.2C2.6-7.8 3.6-5.2 2.6-2.4C2-.8 1.2.6 0 .6Z";

export default function LlamasFrame(p: FrameProps) {
  const id = useIds();
  const fire = id("fire");
  const core = id("core");
  const ring = id("ring");
  const flames = around(16, 54.5, -90);
  const back = around(16, 54.5, -90 + 11.25);
  return (
    <FrameSvg {...p}>
      <defs>
        <linearGradient id={fire} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFB22E" />
          <stop offset=".45" stopColor="#FF6A1A" />
          <stop offset=".85" stopColor="#E0261C" />
          <stop offset="1" stopColor="#B3121B" stopOpacity=".85" />
        </linearGradient>
        <linearGradient id={core} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".4" stopColor="#FFF3A6" />
          <stop offset="1" stopColor="#FFC23D" />
        </linearGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD36B" />
          <stop offset=".5" stopColor="#FF7A1F" />
          <stop offset="1" stopColor="#B5201A" />
        </linearGradient>
      </defs>
      {/* Back row: smaller, darker tongues between the main ones */}
      {back.map((b, i) => {
        return (
          <g key={`b${i}`} transform={`translate(${f(b.x)} ${f(b.y)}) rotate(${f(b.deg + 90)}) scale(.62)`}>
            <g className="fr-flick" style={t(-((i * 0.37) % 1.2), 1.5)}>
              <path d={OUTER} fill={url(fire)} opacity=".75" />
            </g>
          </g>
        );
      })}
      <circle cx="60" cy="60" r="54" fill="none" stroke="#5A0E08" strokeOpacity=".6" strokeWidth="5" />
      <circle cx="60" cy="60" r="54" fill="none" stroke={url(ring)} strokeWidth="3" />
      <circle cx="60" cy="60" r="51.2" fill="none" stroke="#FFB347" strokeOpacity=".5" strokeWidth=".7" />
      {/* Front row */}
      {flames.map((q, i) => (
        <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.deg + 90)}) scale(${i % 2 ? 0.78 : 1})`}>
          <g className="fr-flick" style={t(-((i * 0.53) % 1.2), i % 3 === 0 ? 1.05 : 1.3)}>
            <path d={OUTER} fill={url(fire)} />
            <path d={INNER} fill={url(core)} transform="translate(.4 0)" />
          </g>
        </g>
      ))}
    </FrameSvg>
  );
}
