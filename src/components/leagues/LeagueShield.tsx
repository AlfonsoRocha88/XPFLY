import { useId } from "react";
import { leagueColor } from "@/lib/leagues";
import { cn } from "@/lib/utils";

interface ShieldProps {
  /** League family name, as in LEAGUES (e.g. "Plata") */
  league: string;
  size?: number;
  locked?: boolean;
  active?: boolean;
  className?: string;
}

/** Mixes a hex color toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * League medallion: a faceted coin in the league's metal or stone color,
 * with the league initial set in the serif typeface.
 */
export function LeagueShield({ league, size = 96, locked = false, active = false, className }: ShieldProps) {
  const uid = useId().replace(/[:]/g, "");
  const base = leagueColor(league);
  const initial = league.normalize("NFD").replace(/\p{Diacritic}/gu, "").charAt(0).toUpperCase();

  return (
    <div
      className={cn("relative shrink-0 transition-transform", active && "scale-105", locked && "opacity-40 saturate-50", className)}
      style={{ width: size, height: size }}
      aria-label={`Liga ${league}`}
      role="img"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={shade(base, 0.55)} />
            <stop offset="50%" stopColor={base} />
            <stop offset="100%" stopColor={shade(base, -0.45)} />
          </linearGradient>
          <linearGradient id={`${uid}-face`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shade(base, 0.35)} />
            <stop offset="100%" stopColor={shade(base, -0.2)} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="47" fill={`url(#${uid}-rim)`} />
        <circle cx="50" cy="50" r="38" fill={`url(#${uid}-face)`} />
        <circle cx="50" cy="50" r="38" fill="none" stroke={shade(base, 0.6)} strokeOpacity="0.6" strokeWidth="1.2" />
        <path d="M18 38 A34 34 0 0 1 72 18" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />
        <text
          x="50"
          y="51"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Fraunces Variable', Fraunces, Georgia, serif"
          fontWeight="500"
          fontSize="40"
          fill="#fff"
          fillOpacity="0.95"
        >
          {initial}
        </text>
      </svg>
      {active && <span className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background" />}
    </div>
  );
}

export default LeagueShield;
