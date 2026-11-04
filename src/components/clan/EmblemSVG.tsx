import { useId } from "react";
import type { EmblemConfig, EmblemIcon, EmblemShape } from "@/lib/clan-emblem";
import { normalizeEmblem } from "@/lib/clan-emblem";

interface Props {
  config: any;
  size?: number;
  className?: string;
  glow?: boolean;
}

/** Path data for each shield silhouette in viewBox 0 0 100 110. */
function shapePath(shape: EmblemShape): string {
  switch (shape) {
    case "round":
      return "M50 4 C16 4 8 22 8 44 C8 78 28 102 50 108 C72 102 92 78 92 44 C92 22 84 4 50 4 Z";
    case "angular":
      return "M50 2 L86 14 L94 44 L82 92 L50 108 L18 92 L6 44 L14 14 Z";
    case "kite":
      return "M50 2 C26 8 14 18 14 30 L18 76 C26 96 38 104 50 108 C62 104 74 96 82 76 L86 30 C86 18 74 8 50 2 Z";
    case "tower":
      return "M14 8 L14 24 L8 28 L8 60 C8 86 26 102 50 108 C74 102 92 86 92 60 L92 28 L86 24 L86 8 L70 8 L70 18 L58 18 L58 8 L42 8 L42 18 L30 18 L30 8 Z";
    case "crest":
      return "M50 2 L60 10 L80 8 L86 22 L92 16 L88 36 L92 56 L84 90 L66 102 L50 108 L34 102 L16 90 L8 56 L12 36 L8 16 L14 22 L20 8 L40 10 Z";
    case "heater":
    default:
      return "M14 6 L86 6 L86 50 C86 84 66 104 50 108 C34 104 14 84 14 50 Z";
  }
}

/** Render an icon glyph centered around (50, 58) inside the shield. */
function IconGlyph({ icon, color }: { icon: EmblemIcon; color: string }) {
  const stroke = color;
  const fill = color;
  const sw = 3;
  const opts = { stroke, fill: "none", strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (icon) {
    case "sword":
      return (
        <g {...opts}>
          <line x1="50" y1="28" x2="50" y2="78" />
          <polygon points="50,24 53,30 47,30" fill={fill} />
          <line x1="40" y1="78" x2="60" y2="78" />
          <line x1="50" y1="78" x2="50" y2="86" />
        </g>
      );
    case "crown":
      return (
        <g {...opts} fill={fill}>
          <path d="M30 70 L34 44 L42 56 L50 38 L58 56 L66 44 L70 70 Z" stroke={stroke} />
          <rect x="30" y="70" width="40" height="6" stroke={stroke} />
        </g>
      );
    case "star":
      return <polygon {...opts} fill={fill} points="50,30 56,50 78,50 60,62 66,82 50,70 34,82 40,62 22,50 44,50" />;
    case "skull":
      return (
        <g {...opts}>
          <path d="M30 50 C30 36 38 28 50 28 C62 28 70 36 70 50 L70 64 L62 70 L60 78 L40 78 L38 70 L30 64 Z" fill={fill} stroke={stroke} />
          <circle cx="42" cy="54" r="4" fill="hsl(var(--background))" />
          <circle cx="58" cy="54" r="4" fill="hsl(var(--background))" />
          <line x1="50" y1="64" x2="50" y2="74" stroke="hsl(var(--background))" />
        </g>
      );
    case "fist":
      return (
        <g {...opts} fill={fill}>
          <rect x="34" y="42" width="32" height="32" rx="6" />
          <line x1="40" y1="50" x2="60" y2="50" stroke={"hsl(var(--background))"} />
          <line x1="40" y1="58" x2="60" y2="58" stroke={"hsl(var(--background))"} />
          <line x1="40" y1="66" x2="60" y2="66" stroke={"hsl(var(--background))"} />
        </g>
      );
    case "shield":
      return (
        <path
          d="M50 28 L70 34 L70 56 C70 70 60 78 50 82 C40 78 30 70 30 56 L30 34 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    case "gem":
      return (
        <g {...opts} fill={fill}>
          <polygon points="50,30 70,46 60,82 40,82 30,46" />
          <polyline points="30,46 50,46 70,46" stroke={"hsl(var(--background))"} />
          <line x1="50" y1="46" x2="50" y2="82" stroke={"hsl(var(--background))"} />
        </g>
      );
    case "fire":
      return <path d="M50 28 C58 40 68 48 64 64 C62 76 54 82 50 82 C46 82 36 78 36 64 C36 56 42 52 44 46 C46 52 48 56 50 50 C52 44 50 36 50 28 Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "lightning":
      return <polygon points="54,28 36,62 48,62 42,82 64,52 52,52 60,28" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    case "ice":
      return (
        <g {...opts}>
          <line x1="50" y1="30" x2="50" y2="80" />
          <line x1="28" y1="55" x2="72" y2="55" />
          <line x1="32" y1="36" x2="68" y2="74" />
          <line x1="68" y1="36" x2="32" y2="74" />
        </g>
      );
    case "water":
      return <path d="M50 30 C42 46 34 56 34 66 C34 76 42 82 50 82 C58 82 66 76 66 66 C66 56 58 46 50 30 Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "earth":
      return (
        <g {...opts}>
          <circle cx="50" cy="58" r="22" fill={fill} />
          <path d="M28 58 Q40 50 50 58 T72 58" stroke={"hsl(var(--background))"} fill="none" />
          <path d="M30 66 Q42 60 50 66 T70 66" stroke={"hsl(var(--background))"} fill="none" />
        </g>
      );
    case "wolf":
      return (
        <g {...opts} fill={fill}>
          <path d="M30 36 L36 52 L26 60 L36 72 L50 80 L64 72 L74 60 L64 52 L70 36 L60 44 L50 38 L40 44 Z" stroke={stroke} />
          <circle cx="42" cy="58" r="2" fill={"hsl(var(--background))"} />
          <circle cx="58" cy="58" r="2" fill={"hsl(var(--background))"} />
        </g>
      );
    case "eagle":
      return (
        <g {...opts} fill={fill}>
          <path d="M50 32 L34 46 L24 58 L36 58 L34 70 L50 64 L66 70 L64 58 L76 58 L66 46 Z" stroke={stroke} />
          <polygon points="48,64 50,76 52,64" stroke={stroke} />
        </g>
      );
    case "lion":
      return (
        <g {...opts} fill={fill}>
          <circle cx="50" cy="58" r="18" stroke={stroke} />
          <g stroke={stroke}>
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              const x1 = 50 + Math.cos(a) * 18;
              const y1 = 58 + Math.sin(a) * 18;
              const x2 = 50 + Math.cos(a) * 26;
              const y2 = 58 + Math.sin(a) * 26;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
          <circle cx="44" cy="56" r="2" fill={"hsl(var(--background))"} />
          <circle cx="56" cy="56" r="2" fill={"hsl(var(--background))"} />
        </g>
      );
    case "dragon":
      return (
        <g {...opts} fill={fill}>
          <path d="M28 44 Q40 30 50 38 Q60 30 72 44 Q66 56 60 60 L70 78 L50 70 L30 78 L40 60 Q34 56 28 44 Z" stroke={stroke} />
          <circle cx="44" cy="48" r="2" fill={"hsl(var(--background))"} />
          <circle cx="56" cy="48" r="2" fill={"hsl(var(--background))"} />
        </g>
      );
    case "snake":
      return (
        <g {...opts}>
          <path d="M30 78 Q34 60 50 60 Q66 60 66 46 Q66 34 52 34" />
          <circle cx="52" cy="34" r="3" fill={fill} />
          <line x1="50" y1="32" x2="46" y2="28" />
        </g>
      );
    case "spiral":
      return <path {...opts} d="M50 58 m-2 0 a2 2 0 1 0 4 0 a4 4 0 1 0 -8 0 a6 6 0 1 0 12 0 a10 10 0 1 0 -20 0 a16 16 0 1 0 32 0" />;
    case "eye":
      return (
        <g {...opts}>
          <path d="M22 58 Q50 30 78 58 Q50 86 22 58 Z" fill={fill} stroke={stroke} />
          <circle cx="50" cy="58" r="8" fill={"hsl(var(--background))"} />
          <circle cx="50" cy="58" r="3" fill={fill} />
        </g>
      );
    case "infinity":
      return (
        <g {...opts}>
          <path d="M30 58 C30 46 42 46 50 58 C58 70 70 70 70 58 C70 46 58 46 50 58 C42 70 30 70 30 58 Z" />
        </g>
      );
    case "cross":
      return (
        <g {...opts} fill={fill}>
          <rect x="46" y="32" width="8" height="52" stroke={stroke} />
          <rect x="32" y="50" width="36" height="8" stroke={stroke} />
        </g>
      );
    default:
      return null;
  }
}

const EmblemSVG = ({ config, size = 56, className, glow = false }: Props) => {
  const cfg = normalizeEmblem(config) as EmblemConfig;
  const uid = useId().replace(/[:]/g, "");
  const path = shapePath(cfg.shape);
  const filterId = `emblem-glow-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 110"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: `drop-shadow(0 0 8px ${cfg.primary}88)` } : undefined}
      role="img"
      aria-label="Emblema del clan"
    >
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cfg.primary} stopOpacity="1" />
          <stop offset="100%" stopColor={cfg.primary} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* outer border */}
      <path d={path} fill={cfg.secondary} stroke={cfg.secondary} strokeWidth="6" strokeLinejoin="round" />
      {/* inner fill */}
      <path d={path} fill={`url(#g-${uid})`} stroke={cfg.secondary} strokeWidth="2.5" strokeLinejoin="round" />
      {/* sheen */}
      <path d="M22 12 Q40 10 32 50 Z" fill="white" opacity="0.18" />
      {/* icon */}
      <IconGlyph icon={cfg.icon} color={cfg.secondary} />
    </svg>
  );
};

export default EmblemSVG;