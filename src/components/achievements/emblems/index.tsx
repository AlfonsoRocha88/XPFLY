import type { ReactNode } from "react";

/**
 * Illustrated achievement emblems on a 64×64 grid. Line art uses currentColor (stroke 1.6,
 * round joins); `F` adds a soft tonal fill and `S` a stronger one for depth.
 * They sit inside TierMedallion, which sets the ink color per tier.
 */
type Art = (props: { className?: string }) => JSX.Element;

const F = { fill: "currentColor", fillOpacity: 0.14 } as const;
const S = { fill: "currentColor", fillOpacity: 0.32 } as const;
const DOT = { fill: "currentColor", stroke: "none" } as const;

const art = (children: ReactNode): Art =>
  function Emblem({ className }) {
    return (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        {children}
      </svg>
    );
  };

export const EMBLEM_ART: Record<string, Art> = {
  // ---------- Ritmo ----------
  madrugador: art(
    <>
      <path d="M6 46 L20 30 L28 38 L38 24 L58 46 Z" {...F} />
      <path d="M33 31 l5 -7 l6 8" />
      <path d="M20 46 a12 12 0 0 1 24 0" {...S} />
      <path d="M32 28 v-5 M22.5 31.5 l-3 -3.5 M41.5 31.5 l3 -3.5 M18 39 h-4 M46 39 h4" />
      <path d="M4 46 h56" />
      <path d="M10 52 h18 M34 52 h20" strokeOpacity={0.5} />
    </>,
  ),
  alba: art(
    <>
      <path d="M32 10 l3.2 9.8 L45 23 l-9.8 3.2 L32 36 l-3.2 -9.8 L19 23 l9.8 -3.2 Z" {...S} />
      <path d="M48 12 l1.2 3.4 3.4 1.2 -3.4 1.2 -1.2 3.4 -1.2 -3.4 -3.4 -1.2 3.4 -1.2 Z" {...F} />
      <path d="M12 44 c6 -4 14 -4 20 0 s14 4 20 0" />
      <path d="M8 50 c8 -3 16 -3 24 0 s16 3 24 0" strokeOpacity={0.6} />
      <path d="M16 56 h32" strokeOpacity={0.4} />
    </>,
  ),
  mediodia: art(
    <>
      <circle cx="32" cy="24" r="9" {...S} />
      <path d="M32 9 v-4 M32 43 v-4 M17 24 h-4 M51 24 h-4 M21.4 13.4 l-2.8 -2.8 M42.6 13.4 l2.8 -2.8 M21.4 34.6 l-2.8 2.8 M42.6 34.6 l2.8 2.8" />
      <path d="M8 50 h48" />
      <path d="M26 50 v-4 h12 v4" {...F} />
      <path d="M30 46 v-3 h4 v3" />
      <path d="M14 56 h36" strokeOpacity={0.5} />
    </>,
  ),
  nocturno: art(
    <>
      <path d="M44 8 a14 14 0 1 0 12 20 a11 11 0 0 1 -12 -20 Z" {...F} />
      <path d="M18 56 V38 c0 -7 5 -12 10 -12 s10 5 10 12 v18 Z" {...S} />
      <path d="M21 28 l-3 -5 l6 3 M35 28 l3 -5 l-6 3" />
      <circle cx="24" cy="36" r="3" />
      <circle cx="32" cy="36" r="3" />
      <circle cx="24" cy="36" r=".9" {...DOT} />
      <circle cx="32" cy="36" r=".9" {...DOT} />
      <path d="M26.5 41 l1.5 2 l1.5 -2" />
      <path d="M22 48 c2 1.5 10 1.5 12 0" strokeOpacity={0.6} />
      <path d="M10 56 h36" />
      <circle cx="16" cy="14" r="1" {...DOT} />
      <circle cx="10" cy="24" r=".8" {...DOT} />
    </>,
  ),
  // ---------- Constancia ----------
  racha: art(
    <>
      <path d="M32 58 c-11 0 -18 -7.5 -18 -17.5 c0 -9.5 7 -15 10 -23 c1.2 4.5 3.6 7.5 6.4 9 c0.8 -7.5 4.6 -14 10.2 -18 c-0.6 7.5 2.6 12.5 5.6 17 c2.8 4 4 8.5 4 13.5 C54.2 50.5 43 58 32 58 Z" {...F} />
      <path d="M32 58 c-5 0 -8.4 -3.4 -8.4 -8 c0 -4.6 3.6 -7 5.4 -11.2 c2.4 3 5 4.2 6.8 7 c1.2 1.6 2 3.2 2 4.8 c0 4.2 -2.8 7.4 -5.8 7.4 Z" {...S} />
      <path d="M44 22 c2 3 3 6 3 9" strokeOpacity={0.6} />
    </>,
  ),
  "dias-activos": art(
    <>
      <rect x="10" y="14" width="44" height="40" rx="5" {...F} />
      <path d="M10 24 h44 M20 9 v8 M44 9 v8" />
      <path d="M17 33 l2.5 2.5 l4 -4.5 M30 33 l2.5 2.5 l4 -4.5 M43 33 l2.5 2.5 l4 -4.5 M17 44 l2.5 2.5 l4 -4.5 M30 44 l2.5 2.5 l4 -4.5" />
      <circle cx="47" cy="45" r="3" strokeOpacity={0.5} />
    </>,
  ),
  "fin-de-semana": art(
    <>
      <circle cx="47" cy="15" r="6" {...S} />
      <path d="M47 4 v2 M47 24 v2 M36 15 h2 M56 15 h2" strokeOpacity={0.6} />
      <path d="M8 40 c8 8 26 8 34 0" {...F} />
      <path d="M8 40 L4 30 M42 40 L46 30 M4 30 h4 M42 30 h4" />
      <path d="M14 47 L10 58 M36 47 L40 58" />
      <path d="M20 39 c2 -3 6 -3 8 0" strokeOpacity={0.6} />
      <path d="M54 58 V34 M48 40 c2 -6 10 -6 12 0" />
      <path d="M50 58 h8" />
    </>,
  ),
  "habito-firme": art(
    <>
      <path d="M18 58 h28 l-3 -14 H21 Z" {...S} />
      <path d="M16 44 h32" />
      <path d="M32 44 V24" />
      <path d="M32 32 c-10 0 -15 -6 -15 -14 c9 0 15 5 15 14 Z" {...F} />
      <path d="M32 26 c0 -9 6 -15 16 -15 c0 9 -6 15 -16 15 Z" {...F} />
      <path d="M22 22 l10 9 M42 15 l-10 10" strokeOpacity={0.6} />
    </>,
  ),
  "semana-completa": art(
    <>
      {Array.from({ length: 7 }, (_, i) => {
        const a0 = (-90 + i * (360 / 7) + 4) * (Math.PI / 180);
        const a1 = (-90 + (i + 1) * (360 / 7) - 4) * (Math.PI / 180);
        const r = 22;
        const p = (a: number) => `${32 + r * Math.cos(a)} ${32 + r * Math.sin(a)}`;
        return <path key={i} d={`M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}`} strokeWidth={4.5} strokeOpacity={0.85} />;
      })}
      <circle cx="32" cy="32" r="12" {...F} />
      <path d="M26.5 32.5 l4 4 l7.5 -8.5" strokeWidth={2.2} />
    </>,
  ),
  // ---------- Enfoque ----------
  centurion: art(
    <>
      <path d="M32 8 l18 6 v15 c0 13 -8 22 -18 27 c-10 -5 -18 -14 -18 -27 V14 Z" {...F} />
      <path d="M32 15 l11 3.8 v10 c0 8.5 -5 14.5 -11 18 c-6 -3.5 -11 -9.5 -11 -18 v-10 Z" {...S} />
      <path d="M26.5 30 l4 4 l7.5 -8" strokeWidth={2} />
      <path d="M10 44 c-2 -5 -2 -10 0 -15 M8 38 l3.5 -1.5 M8.5 32 l3.5 0" strokeOpacity={0.6} />
      <path d="M54 44 c2 -5 2 -10 0 -15 M56 38 l-3.5 -1.5 M55.5 32 l-3.5 0" strokeOpacity={0.6} />
    </>,
  ),
  urgente: art(
    <>
      <path d="M18 8 h28 M18 56 h28" />
      <path d="M21 8 c0 12 11 15 11 24 c0 9 -11 12 -11 24 h22 c0 -12 -11 -15 -11 -24 c0 -9 11 -12 11 -24 Z" {...F} />
      <path d="M26 52 c1 -5 6 -7 6 -11 c0 4 5 6 6 11 Z" {...S} />
      <path d="M34 15 l-6 9 h5 l-3 7 l8 -10 h-5 l3 -6 Z" {...S} />
    </>,
  ),
  "alto-rendimiento": art(
    <>
      <path d="M6 54 L24 26 L34 40 L46 20 L58 54 Z" {...F} />
      <path d="M40 30 l6 -10 l6 10" strokeOpacity={0.6} />
      <path d="M12 44 L26 34 L34 40 L52 14" strokeWidth={2.2} />
      <path d="M44 14 h8 v8" strokeWidth={2.2} />
      <path d="M4 54 h56" />
    </>,
  ),
  velocista: art(
    <>
      <circle cx="36" cy="36" r="18" {...F} />
      <circle cx="36" cy="36" r="13" strokeOpacity={0.5} />
      <path d="M32 12 h8 M36 12 v6 M50 20 l3 -3" />
      <path d="M36 36 l7 -8" strokeWidth={2.2} />
      <circle cx="36" cy="36" r="2" {...DOT} />
      <path d="M36 25 v2 M47 36 h-2 M36 47 v-2 M25 36 h2" strokeOpacity={0.6} />
      <path d="M4 28 h10 M2 36 h10 M5 44 h9" strokeOpacity={0.6} />
    </>,
  ),
  "dia-productivo": art(
    <>
      <rect x="16" y="10" width="34" height="12" rx="3" strokeOpacity={0.45} />
      <rect x="13" y="24" width="38" height="13" rx="3" {...F} />
      <rect x="10" y="39" width="44" height="15" rx="3.5" {...S} />
      <path d="M17 46.5 l3 3 l5 -5.5 M30 47 h17" />
      <path d="M19 30.5 l2.5 2.5 l4 -4.5 M31 31 h14" strokeOpacity={0.8} />
      <path d="M22 16 h22" strokeOpacity={0.45} />
    </>,
  ),
  // ---------- Bienestar ----------
  "buen-descanso": art(
    <>
      <path d="M14 48 a9 9 0 0 1 2 -17.8 a12 12 0 0 1 23 -3 a9.5 9.5 0 0 1 11 9.3 a6 6 0 0 1 0 11.5 Z" {...F} />
      <path d="M38 8 a10 10 0 1 0 12 13 a8 8 0 0 1 -12 -13 Z" {...S} />
      <path d="M22 41 h4 l-4 5 h4 M30 37 h3 l-3 4 h3" strokeOpacity={0.8} />
      <path d="M10 56 h44" strokeOpacity={0.5} />
    </>,
  ),
  "diario-sueno": art(
    <>
      <path d="M14 8 h30 a4 4 0 0 1 4 4 v42 a4 4 0 0 1 -4 4 h-30 Z" {...F} />
      <path d="M14 8 v50 M20 8 v50" />
      <path d="M38 16 a7 7 0 1 0 6 9 a5.5 5.5 0 0 1 -6 -9 Z" {...S} />
      <path d="M26 34 h14 M26 40 h14 M26 46 h9" strokeOpacity={0.6} />
      <path d="M48 14 h4 v8 h-4" />
    </>,
  ),
  atleta: art(
    <>
      <rect x="6" y="24" width="7" height="16" rx="2" {...S} />
      <rect x="13" y="20" width="7" height="24" rx="2" {...F} />
      <rect x="51" y="24" width="7" height="16" rx="2" {...S} />
      <rect x="44" y="20" width="7" height="24" rx="2" {...F} />
      <path d="M20 32 h24" strokeWidth={3} />
      <path d="M26 14 c4 -4 8 -4 12 0 M28 52 c2.5 2 5.5 2 8 0" strokeOpacity={0.5} />
    </>,
  ),
  "mente-calma": art(
    <>
      <path d="M32 50 c-6 -6 -8 -14 0 -28 c8 14 6 22 0 28 Z" {...S} />
      <path d="M32 50 c-9 -1 -16 -8 -18 -19 c9 1 15 7 18 19 Z" {...F} />
      <path d="M32 50 c9 -1 16 -8 18 -19 c-9 1 -15 7 -18 19 Z" {...F} />
      <path d="M32 50 c-12 1 -20 -3 -24 -10 c8 -2 16 2 24 10 Z" strokeOpacity={0.7} />
      <path d="M32 50 c12 1 20 -3 24 -10 c-8 -2 -16 2 -24 10 Z" strokeOpacity={0.7} />
      <path d="M14 56 c6 -2 12 -2 18 0 s12 2 18 0" strokeOpacity={0.5} />
      <circle cx="32" cy="13" r="2" {...DOT} />
    </>,
  ),
  nutricion: art(
    <>
      <path d="M32 20 c-6 -4 -18 -3 -20 9 c-2 14 8 27 15 27 c2.5 0 3.5 -1.5 5 -1.5 s2.5 1.5 5 1.5 c7 0 17 -13 15 -27 c-2 -12 -14 -13 -20 -9 Z" {...F} />
      <path d="M32 20 c0 -5 1 -9 4 -12" />
      <path d="M35 14 c4 -5 11 -6 14 -4 c-2 5 -9 7 -14 4 Z" {...S} />
      <path d="M20 30 c-1.5 4 -1 9 1 12" strokeOpacity={0.6} />
    </>,
  ),
  // ---------- Conocimiento ----------
  erudito: art(
    <>
      <path d="M32 10 L58 21 L32 32 L6 21 Z" {...S} />
      <path d="M16 26 v9 c0 4 7 7 16 7 s16 -3 16 -7 v-9" {...F} />
      <path d="M54 23 v12 M54 35 l-2 6 h4 Z" />
      <path d="M10 52 c7 -3 15 -3 22 1 c7 -4 15 -4 22 -1" />
      <path d="M32 53 v5 M10 52 v5 c7 -3 15 -3 22 1 c7 -4 15 -4 22 -1 v-5" strokeOpacity={0.6} />
    </>,
  ),
  lector: art(
    <>
      <path d="M32 18 c-7 -5 -16 -6 -24 -4 v34 c8 -2 17 -1 24 4 Z" {...F} />
      <path d="M32 18 c7 -5 16 -6 24 -4 v34 c-8 -2 -17 -1 -24 4 Z" {...F} />
      <path d="M32 18 v34" />
      <path d="M14 22 c4 -1 9 -0.5 13 1.5 M14 29 c4 -1 9 -0.5 13 1.5 M14 36 c4 -1 9 -0.5 13 1.5 M37 23.5 c4 -2 9 -2.5 13 -1.5 M37 30.5 c4 -2 9 -2.5 13 -1.5" strokeOpacity={0.55} />
      <path d="M42 16 v20 l3 -3 l3 3 V15" {...S} />
    </>,
  ),
  finanzas: art(
    <>
      <path d="M20 58 h24 l-2.5 -10 h-19 Z" {...S} />
      <path d="M32 48 V30" />
      <path d="M32 38 c-8 0 -12 -4 -12 -10 c7 0 12 3 12 10 Z" {...F} />
      <circle cx="40" cy="20" r="11" {...F} />
      <circle cx="40" cy="20" r="7.5" strokeOpacity={0.6} />
      <path d="M40 15.5 v9 M37.5 17.5 c0 -1.2 1 -2 2.5 -2 s2.5 0.8 2.5 2 s-1 1.6 -2.5 2 s-2.5 0.8 -2.5 2 s1 2 2.5 2 s2.5 -0.8 2.5 -2" strokeWidth={1.3} />
      <path d="M32 31 c2 -4 5 -6 8 -6" strokeOpacity={0.5} />
    </>,
  ),
  creativo: art(
    <>
      <path d="M30 8 c-14 0 -24 10 -24 23 c0 13 10 23 22 23 c4 0 5 -3 3 -6 c-2 -3 0 -6 4 -6 h6 c8 0 13 -5 13 -12 C54 17 44 8 30 8 Z" {...F} />
      <circle cx="18" cy="26" r="3.2" {...S} />
      <circle cx="27" cy="17" r="3.2" {...S} />
      <circle cx="39" cy="18" r="3.2" {...S} />
      <circle cx="17" cy="37" r="3.2" {...S} />
      <path d="M58 24 L40 44" strokeWidth={3} />
      <path d="M40 44 c-3 0 -6 3 -5 7 c4 1 7 -2 7 -5" {...S} />
    </>,
  ),
  // ---------- Ascenso ----------
  ascenso: art(
    <>
      <path d="M4 56 L22 28 L30 38 L40 18 L60 56 Z" {...F} />
      <path d="M34 30 l6 -12 l7 13 l-4 -2 l-3 3 l-3 -3 Z" {...S} />
      <path d="M40 18 V4" />
      <path d="M40 5 h12 l-3 4 l3 4 h-12" {...S} />
      <path d="M12 56 l10 -15 M48 42 l6 10" strokeOpacity={0.5} />
    </>,
  ),
  coleccionista: art(
    <>
      <path d="M20 8 h24 v14 c0 8 -5 14 -12 14 s-12 -6 -12 -14 Z" {...F} />
      <path d="M20 12 h-7 c0 7 3 11 8 12 M44 12 h7 c0 7 -3 11 -8 12" />
      <path d="M32 36 v8 M24 52 h16 l-2 -8 h-12 Z" {...S} />
      <path d="M20 58 h24" />
      <path d="M32 14 l1.8 3.7 4 0.6 -2.9 2.8 0.7 4 -3.6 -1.9 -3.6 1.9 0.7 -4 -2.9 -2.8 4 -0.6 Z" {...S} />
    </>,
  ),
  liga: art(
    <>
      <path d="M22 6 l-6 0 l8 18 M42 6 l6 0 l-8 18" />
      <path d="M22 6 l10 18 l10 -18" {...F} />
      <circle cx="32" cy="40" r="16" {...F} />
      <circle cx="32" cy="40" r="11" {...S} />
      <path d="M32 32 l2.6 5.3 5.8 0.8 -4.2 4.1 1 5.8 -5.2 -2.7 -5.2 2.7 1 -5.8 -4.2 -4.1 5.8 -0.8 Z" strokeWidth={1.4} />
    </>,
  ),
  amigos: art(
    <>
      <path d="M4 30 l10 -8 l10 4 h8 l-6 8 l-8 0" {...F} />
      <path d="M60 30 l-10 -8 l-12 6" />
      <path d="M18 34 l12 12 c2 2 5 1 5 -2 l3 3 c2 2 5 0 4 -3 l2 1 c2 1 4 -1 3 -3 l2 0 c2 0 3 -3 1 -5 L40 26" {...S} />
      <path d="M26 40 l6 6 M30 36 l7 7" strokeOpacity={0.55} />
      <path d="M2 30 l2 0 M60 30 l2 0" />
    </>,
  ),
  clan: art(
    <>
      <path d="M14 6 v54" strokeWidth={2} />
      <path d="M14 8 h34 l-6 8 l6 8 h-34 Z" {...F} />
      <path d="M14 8 h28 v26 l-14 8 l-14 -8 Z" {...F} />
      <path d="M28 16 l8 3 v6 c0 5 -4 8 -8 10 c-4 -2 -8 -5 -8 -10 v-6 Z" {...S} />
      <path d="M28 21 v8 M24.5 25 h7" strokeWidth={1.4} />
    </>,
  ),
  "primer-paso": art(
    <>
      {/* Two shoe prints walking up a dotted path toward a small star */}
      <g transform="rotate(-18 22 44)">
        <path d="M16 34 c0 -6 3 -10 7 -10 s7 4 7 10 c0 5 -2 8 -3 11 h-8 c-1 -3 -3 -6 -3 -11 Z" {...S} />
        <path d="M18 49 h10 c0 4 -2 7 -5 7 s-5 -3 -5 -7 Z" {...S} />
      </g>
      <g transform="rotate(-18 42 26)" strokeOpacity={0.75}>
        <path d="M36 16 c0 -6 3 -10 7 -10 s7 4 7 10 c0 5 -2 8 -3 11 h-8 c-1 -3 -3 -6 -3 -11 Z" {...F} />
        <path d="M38 31 h10 c0 4 -2 7 -5 7 s-5 -3 -5 -7 Z" {...F} />
      </g>
      <path d="M56 22 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1 Z" {...S} />
      <path d="M8 60 c4 -2 8 -4 10 -6 M38 46 c6 -2 12 -8 16 -14" strokeDasharray="1.5 3.5" strokeOpacity={0.55} />
    </>,
  ),
};
