import { FrameSvg, f, pt, t, url, useIds, type FrameProps } from "./kit";

/**
 * Gatito: a ginger kitten hugging the avatar. Fluffy ears and big blinking eyes
 * peek over the top edge, two paws grip the bottom, and a striped tail curls up
 * the right side and swishes.
 */

/** Fluffy head; the part over the face is clipped away so only the top peeks out. */
const HEAD =
  "M60 -4.5C74-4.5 83 2 84.5 10L87.6 12L84.6 13.6L86.8 16.6L82.6 17.2C78 25 70 27 60 27C50 27 42 25 37.4 17.2L33.2 16.6L35.4 13.6L32.4 12L35.5 10C37 2 46-4.5 60-4.5Z";
const EAR = "M37 4C36-4 37.5-12 40.6-16.6C45.6-13.6 50.2-8.6 52.8-3.6Z";
const EAR_IN = "M39.6 1.4C39.2-4.6 40.2-9.6 41.8-13C44.8-10.6 47.4-7.4 49.2-4.4Z";
const TAIL = "M86 111C100 107 113 96 116 80C118.5 67 117 55 121 47C124 41 131 42 130 48C129.6 51 126.2 51.4 125.6 49";
const PAW_PRINT = (x: number, y: number, rot: number, key: number) => (
  <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${rot}) scale(.55)`} fill="#FFB08A" opacity=".8">
    <ellipse cy="1.4" rx="2.6" ry="2.1" />
    <circle cx="-2.6" cy="-1.8" r="1" />
    <circle cx="0" cy="-2.9" r="1" />
    <circle cx="2.6" cy="-1.8" r="1" />
  </g>
);

export default function GatoFrame(p: FrameProps) {
  const id = useIds();
  const fur = id("fur");
  const furArm = id("arm");
  const cream = id("cream");
  const eye = id("eye");
  const ring = id("ring");
  const clip = id("clip");
  const paws = [100, 80].map((deg) => ({ ...pt(53, deg), deg }));
  return (
    <FrameSvg {...p}>
      <defs>
        <radialGradient id={fur} cx=".42" cy=".28" r=".8">
          <stop offset="0" stopColor="#FFD9A6" />
          <stop offset=".55" stopColor="#F5A65A" />
          <stop offset="1" stopColor="#D97A32" />
        </radialGradient>
        <linearGradient id={furArm} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7AE63" />
          <stop offset="1" stopColor="#C96A28" />
        </linearGradient>
        <radialGradient id={cream} cx=".45" cy=".35" r=".75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FCE3C4" />
        </radialGradient>
        <radialGradient id={eye} cx=".45" cy=".62" r=".7">
          <stop offset="0" stopColor="#8E6BFF" />
          <stop offset=".45" stopColor="#4A2E9E" />
          <stop offset="1" stopColor="#1C1238" />
        </radialGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE1BA" />
          <stop offset=".5" stopColor="#FFB678" />
          <stop offset="1" stopColor="#F08A9A" />
        </linearGradient>
        <clipPath id={clip}>
          <path d="M-40-40H160V160H-40ZM60 12.5A47.5 47.5 0 1 0 60.01 12.5Z" clipRule="evenodd" />
        </clipPath>
      </defs>

      {/* Ring with little paw prints */}
      <circle cx="60" cy="60" r="54.5" fill="none" stroke="#6B3A1E" strokeOpacity=".28" strokeWidth="4.4" />
      <circle cx="60" cy="60" r="54.5" fill="none" stroke={url(ring)} strokeWidth="2.6" />
      <circle cx="60" cy="60" r="51.6" fill="none" stroke="#FFE1BA" strokeOpacity=".5" strokeWidth=".6" strokeDasharray=".01 2.6" strokeLinecap="round" />
      {[150, 196, 232].map((deg, i) => {
        const q = pt(58.6, deg);
        return PAW_PRINT(q.x, q.y, deg + 90, i);
      })}

      {/* Tail (behind the paws), swishing from its base */}
      <g className="fr-swish" style={{ transformOrigin: "86px 111px" }}>
        <path d={TAIL} fill="none" stroke="#8A4A1C" strokeOpacity=".55" strokeWidth="8.2" strokeLinecap="round" />
        <path d={TAIL} fill="none" stroke={url(furArm)} strokeWidth="6.6" strokeLinecap="round" />
        <path d={TAIL} fill="none" stroke="#C4621F" strokeWidth="6.6" pathLength="100" strokeDasharray="0 9 3 6 3 6 3 6 3 6 3 6 3 6 3 100" />
        <path d={TAIL} fill="none" stroke="#FFF3E2" strokeWidth="6.6" strokeLinecap="round" pathLength="100" strokeDasharray="14 86" strokeDashoffset="-86" />
        <path d={TAIL} fill="none" stroke="#FFE8C8" strokeOpacity=".55" strokeWidth="1.2" strokeLinecap="round" transform="translate(-1.2 -.8)" pathLength="100" strokeDasharray="70 100" strokeDashoffset="-8" />
      </g>

      {/* Paws gripping the bottom edge */}
      {paws.map((q, i) => (
        <g key={i} transform={`translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.deg - 90)})`}>
          <g className="fr-knead" style={t(i * 1.9)}>
            <path d="M-5.2 1.5L-5.8 15H5.8L5.2 1.5Z" fill={url(furArm)} stroke="#A8571F" strokeWidth=".5" />
            <path d="M-5.4 7.5H-2.4M-5.6 11H-2M5.4 7.5H2.4M5.6 11H2" stroke="#C4621F" strokeWidth="1" strokeLinecap="round" />
            <ellipse cy=".9" rx="6.8" ry="5.4" fill="#6B3A1E" opacity=".3" />
            <ellipse rx="6.6" ry="5.2" fill={url(cream)} stroke="#E0B58A" strokeWidth=".5" />
            <path d="M-2.2-4.8V-1.6M2.2-4.8V-1.6" stroke="#D9A574" strokeWidth=".7" strokeLinecap="round" />
            <ellipse cx="-4" cy="-2.6" rx="1.1" ry=".7" fill="#FFB2C4" opacity=".75" />
            <ellipse cx="0" cy="-3.6" rx="1.1" ry=".7" fill="#FFB2C4" opacity=".75" />
            <ellipse cx="4" cy="-2.6" rx="1.1" ry=".7" fill="#FFB2C4" opacity=".75" />
          </g>
        </g>
      ))}

      {/* Ears */}
      <g>
        <path d={EAR} fill={url(fur)} stroke="#B8662A" strokeWidth=".6" strokeLinejoin="round" />
        <path d={EAR_IN} fill="#FFB2C4" />
        <path d="M41.6-6L43.6-3.6M43-9L45-5.6" stroke="#FFF3E2" strokeWidth=".55" strokeLinecap="round" />
      </g>
      <g transform="translate(120 0) scale(-1 1)">
        <g className="fr-twitch" style={{ transformOrigin: "46px 0px" }}>
          <path d={EAR} fill={url(fur)} stroke="#B8662A" strokeWidth=".6" strokeLinejoin="round" />
          <path d={EAR_IN} fill="#FFB2C4" />
          <path d="M41.6-6L43.6-3.6M43-9L45-5.6" stroke="#FFF3E2" strokeWidth=".55" strokeLinecap="round" />
        </g>
      </g>

      {/* Head peeking over the edge */}
      <g clipPath={url(clip)}>
        <path d={HEAD} fill={url(fur)} stroke="#B8662A" strokeWidth=".6" strokeLinejoin="round" />
        <path d="M60-3.6V.6M55.2-3.2L56 .4M64.8-3.2L64 .4" stroke="#C9692A" strokeWidth="1.3" strokeLinecap="round" />
        <ellipse cx="60" cy="9.6" rx="7.4" ry="4.2" fill={url(cream)} />
        <ellipse cx="44.4" cy="10.6" rx="3.4" ry="1.8" fill="#FF8FA8" opacity=".55" />
        <ellipse cx="75.6" cy="10.6" rx="3.4" ry="1.8" fill="#FF8FA8" opacity=".55" />
        <path d="M58.6 7.4H61.4L60 9Z" fill="#FF7E9A" stroke="#E0607E" strokeWidth=".3" strokeLinejoin="round" />
        <path d="M57.6 9.8Q58.8 11 60 9.6Q61.2 11 62.4 9.8" fill="none" stroke="#7A3B2A" strokeWidth=".6" strokeLinecap="round" />
        <path d="M41 8L29.5 5.6M41 10.2L29.6 11.4M79 8L90.5 5.6M79 10.2L90.4 11.4" stroke="#FFF6EA" strokeWidth=".5" strokeLinecap="round" opacity=".9" />
        {[50.4, 69.6].map((x, i) => (
          <g key={i} transform={`translate(${x} 3.4)`}>
            <g className="fr-blink">
              <ellipse rx="3.8" ry="4.4" fill={url(eye)} />
              <ellipse rx="3.8" ry="4.4" fill="none" stroke="#1C1238" strokeWidth=".5" />
              <circle cx="-1.2" cy="-1.6" r="1.35" fill="#FFFFFF" />
              <circle cx="1.3" cy="1.4" r=".6" fill="#FFFFFF" opacity=".9" />
            </g>
          </g>
        ))}
      </g>
    </FrameSvg>
  );
}
