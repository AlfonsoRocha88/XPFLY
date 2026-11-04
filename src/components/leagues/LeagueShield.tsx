import { useId } from "react";

/**
 * Custom heraldic shield SVGs for every league family — Clash of Clans inspired.
 * Each variant has a unique silhouette + emblem and scales cleanly from 32px to 120px.
 * Pass `league` matching the league family name in `LEAGUES`.
 */

export type LeagueKey =
  | "mortal"
  | "guerrero"
  | "caballero"
  | "heroe"
  | "campeon"
  | "leyenda"
  | "rey"
  | "emperador"
  | "dios"
  | "titan"
  | "primordial"
  | "singularidad";

export function leagueKey(name: string): LeagueKey {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (n.startsWith("mortal")) return "mortal";
  if (n.startsWith("guerr")) return "guerrero";
  if (n.startsWith("caball")) return "caballero";
  if (n.startsWith("hero")) return "heroe";
  if (n.startsWith("camp")) return "campeon";
  if (n.startsWith("leye")) return "leyenda";
  if (n.startsWith("rey")) return "rey";
  if (n.startsWith("emper")) return "emperador";
  if (n.startsWith("dios")) return "dios";
  if (n.startsWith("tit")) return "titan";
  if (n.startsWith("primor")) return "primordial";
  return "singularidad";
}

interface ShieldProps {
  league: string;
  size?: number;
  locked?: boolean;
  active?: boolean;
  className?: string;
}

/** Linear vertical gradient builder. */
const VGrad = ({ id, top, mid, bot }: { id: string; top: string; mid: string; bot: string }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={top} />
    <stop offset="55%" stopColor={mid} />
    <stop offset="100%" stopColor={bot} />
  </linearGradient>
);

const RGrad = ({
  id,
  inner,
  outer,
  cx = "50%",
  cy = "35%",
}: {
  id: string;
  inner: string;
  outer: string;
  cx?: string;
  cy?: string;
}) => (
  <radialGradient id={id} cx={cx} cy={cy} r="0.7">
    <stop offset="0%" stopColor={inner} />
    <stop offset="100%" stopColor={outer} />
  </radialGradient>
);

/* =========================================================================
   Per-league shields (viewBox 0 0 100 115 unless noted).
   Each returns the inner SVG <g> content; outer <svg> is shared.
   ========================================================================= */

function MortalShield(uid: string) {
  const body = `M50 4 C30 8 14 12 12 16 L12 70 C12 92 30 104 50 110 C70 104 88 92 88 70 L88 16 C86 12 70 8 50 4 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#F1EFE8" mid="#D3D1C7" bot="#8A8880" />
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#5A5852" strokeWidth="3" strokeLinejoin="round" />
      {/* cracks */}
      <g stroke="#6E6C66" strokeWidth="1.2" fill="none" opacity="0.7" strokeLinecap="round">
        <path d="M22 28 L34 38 L30 52 L42 60" />
        <path d="M70 24 L62 36 L74 48" />
        <path d="M40 80 L52 86 L60 78" />
      </g>
      {/* boulder emblem */}
      <g>
        <path
          d="M34 50 L42 42 L58 40 L68 48 L70 60 L62 70 L46 72 L34 64 Z"
          fill="#5C5A53"
          stroke="#2E2D2A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M40 52 L50 56 M54 50 L62 58 M44 64 L56 66" stroke="#2E2D2A" strokeWidth="1.4" fill="none" />
      </g>
      {/* scratched edge highlights */}
      <path d="M16 18 C16 14 30 10 50 8" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="2" fill="none" />
    </>
  );
}

function WarriorShield(uid: string) {
  // Kite shield (rounded top, pointed bottom)
  const body = `M50 4 C20 8 12 16 12 28 L18 78 C24 96 38 106 50 112 C62 106 76 96 82 78 L88 28 C88 16 80 8 50 4 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#EAF3DE" mid="#C0DD97" bot="#7BA84A" />
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#3B6D11" strokeWidth="3.5" strokeLinejoin="round" />
      {/* laurel */}
      <g fill="#3B6D11" opacity="0.85">
        <ellipse cx="32" cy="78" rx="4" ry="2.2" transform="rotate(-30 32 78)" />
        <ellipse cx="38" cy="84" rx="4" ry="2.2" transform="rotate(-20 38 84)" />
        <ellipse cx="46" cy="88" rx="4" ry="2.2" transform="rotate(-10 46 88)" />
        <ellipse cx="68" cy="78" rx="4" ry="2.2" transform="rotate(30 68 78)" />
        <ellipse cx="62" cy="84" rx="4" ry="2.2" transform="rotate(20 62 84)" />
        <ellipse cx="54" cy="88" rx="4" ry="2.2" transform="rotate(10 54 88)" />
      </g>
      {/* crossed swords */}
      <g stroke="#1F3A05" strokeWidth="2" strokeLinecap="round">
        <line x1="28" y1="28" x2="68" y2="78" stroke="#E7EFD8" strokeWidth="5" />
        <line x1="72" y1="28" x2="32" y2="78" stroke="#E7EFD8" strokeWidth="5" />
        <line x1="28" y1="28" x2="68" y2="78" />
        <line x1="72" y1="28" x2="32" y2="78" />
        {/* hilts */}
        <circle cx="26" cy="26" r="3" fill="#3B6D11" />
        <circle cx="74" cy="26" r="3" fill="#3B6D11" />
        <line x1="20" y1="32" x2="32" y2="20" strokeWidth="3" />
        <line x1="80" y1="32" x2="68" y2="20" strokeWidth="3" />
      </g>
    </>
  );
}

function KnightShield(uid: string) {
  // Heater shield silhouette
  const body = `M14 8 L86 8 L86 50 C86 82 68 102 50 112 C32 102 14 82 14 50 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#E6F1FB" mid="#85B7EB" bot="#3D7ABD" />
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#185FA5" strokeWidth="3.5" strokeLinejoin="round" />
      {/* polished sheen */}
      <path d="M22 14 L40 14 L28 70 Z" fill="#FFFFFF" opacity="0.35" />
      {/* upright sword */}
      <g>
        <rect x="48.5" y="20" width="3" height="62" fill="#F4F8FC" stroke="#0F3F73" strokeWidth="0.8" />
        <polygon points="50,16 53,22 47,22" fill="#F4F8FC" stroke="#0F3F73" strokeWidth="0.8" />
        <rect x="40" y="80" width="20" height="3.5" fill="#C9A24A" stroke="#7A5E1E" strokeWidth="0.8" />
        <rect x="48" y="83.5" width="4" height="10" fill="#7A5E1E" />
        <circle cx="50" cy="95" r="3" fill="#C9A24A" stroke="#7A5E1E" strokeWidth="0.8" />
        {/* shine */}
        <line x1="50" y1="22" x2="50" y2="60" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.85" />
      </g>
    </>
  );
}

function HeroShield(uid: string) {
  // Pointed-top crested shield
  const body = `M50 2 L62 10 L86 14 L84 60 C82 86 68 104 50 112 C32 104 18 86 16 60 L14 14 L38 10 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#FAEEDA" mid="#EF9F27" bot="#A86610" />
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#BA7517" strokeWidth="3.5" strokeLinejoin="round" />
      {/* radiant rays */}
      <g stroke="#FFE7AE" strokeWidth="2" opacity="0.85" strokeLinecap="round">
        <line x1="50" y1="64" x2="50" y2="38" />
        <line x1="32" y1="70" x2="22" y2="58" />
        <line x1="68" y1="70" x2="78" y2="58" />
        <line x1="38" y1="60" x2="28" y2="44" />
        <line x1="62" y1="60" x2="72" y2="44" />
      </g>
      {/* rising sun semicircle */}
      <path d="M30 70 A20 20 0 0 1 70 70 Z" fill="#FFE07A" stroke="#7A4A06" strokeWidth="2" />
      <path d="M30 70 L70 70" stroke="#7A4A06" strokeWidth="2" />
    </>
  );
}

function ChampionShield(uid: string) {
  // Aggressive jagged-edge shield
  const body = `M50 4 L66 8 L84 6 L88 22 L82 38 L88 56 L80 76 L66 96 L50 112 L34 96 L20 76 L12 56 L18 38 L12 22 L16 6 L34 8 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#FCEBEB" mid="#E24B4A" bot="#7A1E1E" />
        <RGrad id={`${uid}-g`} inner="#FFD08A" outer="#A32D2D" />
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#A32D2D" strokeWidth="3.5" strokeLinejoin="round" />
      {/* ember glow ring */}
      <path d={body} fill="none" stroke={`url(#${uid}-g)`} strokeWidth="2" opacity="0.7" />
      {/* fire engravings */}
      <g fill="#FFB347" opacity="0.85">
        <path d="M22 26 q4 -6 8 0 q-2 -2 -4 0 q2 4 -4 4 z" />
        <path d="M70 26 q4 -6 8 0 q-2 -2 -4 0 q2 4 -4 4 z" />
        <path d="M22 90 q4 -6 8 0 q-2 -2 -4 0 q2 4 -4 4 z" />
        <path d="M70 90 q4 -6 8 0 q-2 -2 -4 0 q2 4 -4 4 z" />
      </g>
      {/* skull */}
      <g>
        <path
          d="M34 44 C34 34 42 28 50 28 C58 28 66 34 66 44 L66 60 L60 64 L58 72 L42 72 L40 64 L34 60 Z"
          fill="#FBF7F0"
          stroke="#3A0B0B"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* eye sockets with flames */}
        <ellipse cx="43" cy="50" rx="4" ry="5" fill="#1A0202" />
        <ellipse cx="57" cy="50" rx="4" ry="5" fill="#1A0202" />
        <path d="M41 52 q2 -4 4 0 q-1 -3 -2 -1 q1 2 -2 1 z" fill="#FFB347" />
        <path d="M55 52 q2 -4 4 0 q-1 -3 -2 -1 q1 2 -2 1 z" fill="#FFB347" />
        <line x1="44" y1="64" x2="44" y2="70" stroke="#3A0B0B" strokeWidth="1.4" />
        <line x1="50" y1="64" x2="50" y2="70" stroke="#3A0B0B" strokeWidth="1.4" />
        <line x1="56" y1="64" x2="56" y2="70" stroke="#3A0B0B" strokeWidth="1.4" />
      </g>
    </>
  );
}

function LegendShield(uid: string) {
  // Asymmetric mystical shield (slight curve/tilt)
  const body = `M50 4 C24 6 12 18 14 36 L20 76 C28 100 44 110 52 112 C62 108 76 96 84 76 L88 32 C86 16 74 6 50 4 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#FBEAF0" mid="#ED93B1" bot="#993556" />
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#993556" strokeWidth="3.5" strokeLinejoin="round" />
      {/* stars */}
      <g fill="#FFF5FA">
        <circle cx="26" cy="36" r="1.6" />
        <circle cx="74" cy="40" r="1.6" />
        <circle cx="50" cy="86" r="1.6" />
      </g>
      {/* crescent with eye */}
      <g>
        <path d="M30 56 A22 22 0 1 0 70 56 A16 16 0 1 1 30 56 Z" fill="#FFF5FA" stroke="#5C1A30" strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="50" cy="56" rx="6" ry="4" fill="#FFF5FA" stroke="#5C1A30" strokeWidth="1.8" />
        <circle cx="50" cy="56" r="2.2" fill="#5C1A30" />
        <circle cx="50.8" cy="55.2" r="0.7" fill="#FFF5FA" />
      </g>
    </>
  );
}

function KingShield(uid: string) {
  // Ornate rounded heater with filigree corners
  const body = `M14 12 C14 8 18 6 22 6 L78 6 C82 6 86 8 86 12 L86 54 C86 84 70 104 50 112 C30 104 14 84 14 54 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#FAC775" mid="#EF9F27" bot="#A86610" />
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#7A4A06" strokeWidth="3.5" strokeLinejoin="round" />
      {/* filigree */}
      <g stroke="#7A4A06" strokeWidth="1.6" fill="none" opacity="0.85" strokeLinecap="round">
        <path d="M18 14 q6 -2 10 4 q-4 -2 -8 2" />
        <path d="M82 14 q-6 -2 -10 4 q4 -2 8 2" />
        <path d="M16 30 q4 6 0 14 q-3 -6 0 -12" />
        <path d="M84 30 q-4 6 0 14 q3 -6 0 -12" />
        <path d="M28 96 q6 6 22 8 q16 -2 22 -8" />
      </g>
      {/* inner panel */}
      <path
        d="M26 22 C26 20 28 18 30 18 L70 18 C72 18 74 20 74 22 L74 50 C74 72 62 88 50 96 C38 88 26 72 26 50 Z"
        fill="#FFE6B0"
        opacity="0.55"
      />
      {/* crown */}
      <g>
        <path
          d="M28 60 L34 42 L42 54 L50 36 L58 54 L66 42 L72 60 Z"
          fill="#FFE07A"
          stroke="#5A3500"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="28" y="60" width="44" height="8" fill="#EF9F27" stroke="#5A3500" strokeWidth="2" />
        <circle cx="34" cy="42" r="2.4" fill="#E24B4A" stroke="#5A3500" strokeWidth="1" />
        <circle cx="50" cy="36" r="2.6" fill="#3D7ABD" stroke="#5A3500" strokeWidth="1" />
        <circle cx="66" cy="42" r="2.4" fill="#1D9E75" stroke="#5A3500" strokeWidth="1" />
        <circle cx="42" cy="64" r="1.5" fill="#FFFFFF" />
        <circle cx="58" cy="64" r="1.5" fill="#FFFFFF" />
      </g>
    </>
  );
}

function EmperorShield(uid: string) {
  // Wide hexagonal-ish shield with notched top
  const body = `M50 4 L42 10 L14 14 L10 30 L18 60 L30 92 L50 112 L70 92 L82 60 L90 30 L86 14 L58 10 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#AFA9EC" mid="#7F77DD" bot="#3F388A" />
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#534AB7" strokeWidth="3.5" strokeLinejoin="round" />
      {/* roman laurel border */}
      <path
        d="M22 22 L78 22"
        stroke="#FFE07A"
        strokeWidth="1.4"
        strokeDasharray="3 2"
        opacity="0.8"
      />
      {/* double-headed eagle */}
      <g fill="#F4F1FF" stroke="#2A2466" strokeWidth="1.6" strokeLinejoin="round">
        {/* body */}
        <path d="M50 46 L46 70 L54 70 Z" />
        {/* heads */}
        <path d="M44 44 C42 40 40 38 38 40 C40 44 42 46 44 48 Z" />
        <path d="M56 44 C58 40 60 38 62 40 C60 44 58 46 56 48 Z" />
        {/* wings spread */}
        <path d="M46 50 C34 48 26 54 22 64 C30 60 38 60 46 64 Z" />
        <path d="M54 50 C66 48 74 54 78 64 C70 60 62 60 54 64 Z" />
        {/* tail */}
        <path d="M44 70 L50 80 L56 70 Z" />
      </g>
      {/* orb + scepter */}
      <circle cx="32" cy="76" r="3" fill="#FFE07A" stroke="#2A2466" strokeWidth="1.2" />
      <line x1="68" y1="72" x2="74" y2="84" stroke="#FFE07A" strokeWidth="2" strokeLinecap="round" />
      <circle cx="74" cy="84" r="2" fill="#FFE07A" stroke="#2A2466" strokeWidth="1" />
    </>
  );
}

function GodShield(uid: string) {
  // Pointed top with rays around edge
  const body = `M50 2 L60 14 L86 18 L82 60 C80 86 66 104 50 112 C34 104 20 86 18 60 L14 18 L40 14 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#E1F5EE" mid="#1D9E75" bot="#063D31" />
        <radialGradient id={`${uid}-h`} cx="50%" cy="40%" r="0.6">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#085041" strokeWidth="3.5" strokeLinejoin="round" />
      {/* divine rays around emblem */}
      <g stroke="#CFEFE2" strokeWidth="1.4" opacity="0.85" strokeLinecap="round">
        <line x1="50" y1="20" x2="50" y2="28" />
        <line x1="30" y1="32" x2="36" y2="38" />
        <line x1="70" y1="32" x2="64" y2="38" />
        <line x1="22" y1="56" x2="30" y2="56" />
        <line x1="78" y1="56" x2="70" y2="56" />
        <line x1="30" y1="80" x2="36" y2="74" />
        <line x1="70" y1="80" x2="64" y2="74" />
      </g>
      {/* aura halo */}
      <circle cx="50" cy="60" r="20" fill={`url(#${uid}-h)`} />
      {/* halo ring */}
      <ellipse cx="50" cy="46" rx="14" ry="3" fill="none" stroke="#FFE07A" strokeWidth="1.6" />
      {/* cloud */}
      <path d="M36 52 q-4 0 -4 4 q0 4 6 4 l24 0 q6 0 6 -4 q0 -4 -4 -4 q0 -4 -6 -4 q-4 -4 -10 0 q-6 -2 -12 4 Z" fill="#F4FFFB" stroke="#085041" strokeWidth="1.4" />
      {/* lightning bolt */}
      <path d="M50 60 L42 78 L50 78 L46 92 L60 72 L52 72 L58 60 Z" fill="#FFE07A" stroke="#085041" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  );
}

function TitanShield(uid: string) {
  // Largest, jagged, heavy proportions
  const body = `M50 2 L70 6 L88 4 L92 18 L86 30 L94 50 L88 70 L78 96 L66 108 L50 114 L34 108 L22 96 L12 70 L6 50 L14 30 L8 18 L12 4 L30 6 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#444441" mid="#2C2C2A" bot="#0E0E0D" />
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#888780" strokeWidth="3.5" strokeLinejoin="round" />
      {/* rocky cracks */}
      <g stroke="#5A5A57" strokeWidth="1.2" fill="none" opacity="0.8">
        <path d="M22 32 L34 42 L30 56 L42 64" />
        <path d="M78 28 L70 42 L80 56" />
      </g>
      {/* volcano */}
      <g>
        <path
          d="M28 88 L42 50 L46 56 L50 44 L54 56 L58 50 L72 88 Z"
          fill="#3A3A37"
          stroke="#888780"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* lava */}
        <path d="M42 60 L46 56 L50 60 L54 56 L58 60 L56 74 L44 74 Z" fill="#E24B4A" />
        <path d="M44 74 L46 84 M50 74 L48 88 M56 74 L54 84" stroke="#FFB347" strokeWidth="1.6" />
        {/* eruption sparks */}
        <circle cx="42" cy="44" r="1.4" fill="#FFB347" />
        <circle cx="58" cy="42" r="1.4" fill="#FFB347" />
        <circle cx="50" cy="36" r="1.6" fill="#FFE07A" />
        {/* smoke */}
        <path d="M40 38 q4 -6 10 -4 q4 -6 12 0 q-4 4 -10 2 q-4 6 -12 2 z" fill="#5A5A57" opacity="0.7" />
      </g>
    </>
  );
}

function PrimordialShield(uid: string) {
  // Non-euclidean hex + curves
  const body = `M50 2 L80 8 L94 26 L90 56 L80 86 L50 114 L20 86 L10 56 L6 26 L20 8 Z`;
  return (
    <>
      <defs>
        <VGrad id={`${uid}-b`} top="#185FA5" mid="#042C53" bot="#01122A" />
        <radialGradient id={`${uid}-c`} cx="50%" cy="55%" r="0.45">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="60%" stopColor="#042C53" />
          <stop offset="100%" stopColor="#378ADD" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <path d={body} fill={`url(#${uid}-b)`} stroke="#378ADD" strokeWidth="3.5" strokeLinejoin="round" />
      {/* scattered stars */}
      <g fill="#CFE3FF">
        <circle cx="22" cy="22" r="1" />
        <circle cx="32" cy="38" r="0.8" />
        <circle cx="78" cy="20" r="1.2" />
        <circle cx="70" cy="40" r="0.8" />
        <circle cx="20" cy="60" r="0.9" />
        <circle cx="82" cy="62" r="1" />
        <circle cx="36" cy="92" r="0.9" />
        <circle cx="64" cy="92" r="1" />
        <circle cx="50" cy="20" r="0.7" />
      </g>
      {/* black hole + light ring */}
      <circle cx="50" cy="60" r="22" fill={`url(#${uid}-c)`} />
      <ellipse cx="50" cy="60" rx="22" ry="6" fill="none" stroke="#7CC2FF" strokeWidth="1.6" opacity="0.9" />
      <ellipse cx="50" cy="60" rx="22" ry="6" fill="none" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.7" transform="rotate(-15 50 60)" />
      {/* spiral hint */}
      <path
        d="M50 60 m-14 0 a14 14 0 1 1 28 0 a10 10 0 1 0 -20 0 a6 6 0 1 1 12 0"
        fill="none"
        stroke="#7CC2FF"
        strokeWidth="1"
        opacity="0.7"
      />
    </>
  );
}

function SingularityShield(uid: string) {
  // Octagonal — should-not-exist
  const body = `M50 2 L74 6 L92 22 L96 50 L92 78 L74 108 L50 114 L26 108 L8 78 L4 50 L8 22 L26 6 Z`;
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-r`} cx="50%" cy="50%" r="0.7">
          <stop offset="0%" stopColor="#7B2BD6" />
          <stop offset="55%" stopColor="#501313" />
          <stop offset="100%" stopColor="#0A0A0C" />
        </radialGradient>
        <radialGradient id={`${uid}-v`} cx="50%" cy="50%" r="0.5">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={body} fill={`url(#${uid}-r)`} stroke="#9333EA" strokeWidth="3.5" strokeLinejoin="round" />
      {/* faint orbital rings */}
      <g fill="none" stroke="#E879F9" strokeWidth="0.7" opacity="0.55">
        <ellipse cx="50" cy="58" rx="32" ry="10" />
        <ellipse cx="50" cy="58" rx="32" ry="10" transform="rotate(60 50 58)" />
        <ellipse cx="50" cy="58" rx="32" ry="10" transform="rotate(-60 50 58)" />
      </g>
      {/* 8-point star */}
      <g>
        <polygon
          points="50,22 56,46 78,40 60,56 84,62 60,66 70,90 52,72 50,96 48,72 30,90 40,66 16,62 40,56 22,40 44,46"
          fill="#FBD8FF"
          stroke="#3A0B5C"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <polygon
          points="50,32 54,50 68,48 56,58 72,62 56,64 62,82 52,68 50,86 48,68 38,82 44,64 28,62 44,58 32,48 46,50"
          fill="#7B2BD6"
          opacity="0.85"
        />
        <circle cx="50" cy="60" r="7" fill={`url(#${uid}-v)`} />
        <circle cx="50" cy="60" r="5" fill="#000000" stroke="#E879F9" strokeWidth="0.8" />
      </g>
      {/* orbiting particles */}
      <g fill="#FBD8FF">
        <circle cx="20" cy="60" r="1.4" />
        <circle cx="80" cy="60" r="1.4" />
        <circle cx="50" cy="20" r="1.2" />
        <circle cx="50" cy="100" r="1.2" />
        <circle cx="28" cy="32" r="0.9" />
        <circle cx="72" cy="32" r="0.9" />
        <circle cx="28" cy="88" r="0.9" />
        <circle cx="72" cy="88" r="0.9" />
      </g>
    </>
  );
}

const VARIANTS: Record<LeagueKey, (uid: string) => JSX.Element> = {
  mortal: MortalShield,
  guerrero: WarriorShield,
  caballero: KnightShield,
  heroe: HeroShield,
  campeon: ChampionShield,
  leyenda: LegendShield,
  rey: KingShield,
  emperador: EmperorShield,
  dios: GodShield,
  titan: TitanShield,
  primordial: PrimordialShield,
  singularidad: SingularityShield,
};

export function LeagueShield({ league, size = 96, locked = false, active = false, className }: ShieldProps) {
  const reactId = useId().replace(/[:]/g, "");
  const key = leagueKey(league);
  const Variant = VARIANTS[key];
  const isSingularity = key === "singularidad";
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size * (115 / 100) }}
    >
      {/* drop-shadow glow */}
      <svg
        viewBox="0 0 100 115"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="block overflow-visible"
        style={{
          filter: active
            ? "drop-shadow(0 0 10px rgba(255,255,255,0.45)) drop-shadow(0 6px 8px rgba(0,0,0,0.55))"
            : "drop-shadow(0 4px 6px rgba(0,0,0,0.55))",
        }}
      >
        {Variant(reactId)}
      </svg>

      {/* Singularity: subtle shimmer sweep + orbiting twinkles */}
      {isSingularity && !locked && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="sing-shimmer absolute -inset-y-2 left-0 w-1/3"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(251,216,255,0.55) 50%, transparent 100%)",
              mixBlendMode: "screen",
            }}
          />
          <svg viewBox="0 0 100 115" className="absolute inset-0 h-full w-full overflow-visible">
            <g className="sing-orbit">
              <circle cx="50" cy="22" r="1.4" fill="#FBD8FF" className="sing-twinkle" />
              <circle cx="86" cy="60" r="1.2" fill="#E879F9" className="sing-twinkle" style={{ animationDelay: "0.6s" }} />
              <circle cx="50" cy="98" r="1.4" fill="#FBD8FF" className="sing-twinkle" style={{ animationDelay: "1.2s" }} />
              <circle cx="14" cy="60" r="1.2" fill="#E879F9" className="sing-twinkle" style={{ animationDelay: "1.8s" }} />
            </g>
          </svg>
        </div>
      )}

      {/* Locked overlay: chains + small padlock — keep shield colors visible */}
      {locked && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Chains (thin diagonal cross) */}
          <svg
            viewBox="0 0 100 115"
            className="absolute inset-0 h-full w-full"
            fill="none"
            stroke="rgba(20,20,25,0.85)"
            strokeLinecap="round"
          >
            {/* chain links — represented as a dashed pill stroke */}
            <g strokeWidth="3.2">
              <line x1="6" y1="34" x2="94" y2="80" stroke="rgba(15,15,20,0.55)" strokeWidth="5" />
              <line x1="6" y1="34" x2="94" y2="80" strokeDasharray="5 4" stroke="#C9C9D2" />
              <line x1="94" y1="34" x2="6" y2="80" stroke="rgba(15,15,20,0.55)" strokeWidth="5" />
              <line x1="94" y1="34" x2="6" y2="80" strokeDasharray="5 4" stroke="#C9C9D2" />
            </g>
          </svg>
          {/* Small padlock in front-center */}
          <svg
            viewBox="0 0 24 24"
            width={size * 0.34}
            height={size * 0.34}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]"
            fill="#1a1a20"
            stroke="#F4F4F8"
            strokeWidth="1.6"
            strokeLinejoin="round"
          >
            <path d="M7 10V8a5 5 0 1 1 10 0v2" fill="none" />
            <rect x="5" y="10" width="14" height="9" rx="2" />
            <circle cx="12" cy="14.2" r="1.4" fill="#F4F4F8" />
            <rect x="11.3" y="14.2" width="1.4" height="2.6" fill="#F4F4F8" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default LeagueShield;