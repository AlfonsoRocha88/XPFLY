import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Destello: Constela's currency, drawn flat to match the app. A tall four-point gold star
 * (long points up and down, shorter sideways) over four small diagonal rays, with a diamond of
 * four ice-blue crystals and a tiny gold cross at its heart. Taller than wide on purpose, so it
 * reads as a sparkle rather than a square.
 */
export function Destello({ size = 16, className, twinkle = false }: { size?: number; className?: string; twinkle?: boolean }) {
  const id = useId().replace(/:/g, "");
  const gold = `${id}g`, goldSoft = `${id}s`, ice = `${id}i`;
  // Four crystals in a 2×2 grid, turned 45° into a diamond.
  const cells = [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const;
  const c = 2.75; // crystal size
  const gap = 0.32;

  return (
    <svg
      viewBox="-12 -15 24 30"
      width={size * 0.8}
      height={size}
      className={cn("inline-block shrink-0 select-none overflow-visible drop-shadow-[0_0_3px_rgba(150,215,255,0.55)]", twinkle && "destello-twinkle", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF1C2" />
          <stop offset="0.45" stopColor="#F7C55A" />
          <stop offset="1" stopColor="#D8962A" />
        </linearGradient>
        <linearGradient id={goldSoft} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE6A0" />
          <stop offset="1" stopColor="#E6A93A" />
        </linearGradient>
        <linearGradient id={ice} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9FAFF" />
          <stop offset="0.5" stopColor="#9EDCF7" />
          <stop offset="1" stopColor="#5AAEE0" />
        </linearGradient>
      </defs>

      {/* Short diagonal rays behind the main star */}
      <path
        d="M0 -1.2 L7 -7 L1.2 0 L7 7 L0 1.2 L-7 7 L-1.2 0 L-7 -7 Z"
        fill={`url(#${goldSoft})`}
        opacity="0.85"
      />
      {/* Main star: long vertical points, shorter horizontal ones, softly concave sides */}
      <path
        d="M0 -15 Q1.7 -3.2 9 0 Q1.7 3.2 0 15 Q-1.7 3.2 -9 0 Q-1.7 -3.2 0 -15 Z"
        fill={`url(#${gold})`}
      />
      {/* Light edge on the upper-left faces for a crisp, flat bevel */}
      <path d="M0 -15 Q-1.7 -3.2 -9 0 L-3.2 0 Q-0.9 -1 0 -5 Z" fill="#FFFFFF" opacity="0.28" />

      {/* Crystal diamond */}
      <g transform="rotate(45)">
        <rect x={-c - gap - 0.55} y={-c - gap - 0.55} width={(c + gap) * 2 + 1.1} height={(c + gap) * 2 + 1.1} rx="0.9" fill="#C98B22" />
        {cells.map(([sx, sy]) => {
          const x = sx < 0 ? -c - gap / 2 : gap / 2;
          const y = sy < 0 ? -c - gap / 2 : gap / 2;
          return (
            <g key={`${sx}${sy}`}>
              <rect x={x} y={y} width={c} height={c} rx="0.35" fill={`url(#${ice})`} />
              <rect x={x + 0.55} y={y + 0.55} width={c - 1.1} height={c - 1.1} rx="0.2" fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="0.28" />
            </g>
          );
        })}
      </g>
      {/* Tiny gold cross at the center */}
      <path d="M0 -1.15 V1.15 M-1.15 0 H1.15" stroke="#FFE7A6" strokeWidth="0.55" strokeLinecap="round" />
    </svg>
  );
}

/** Balance pill: icon + amount. */
export function DestellosAmount({ value, className, size = 16 }: { value: number; className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold tabular-nums", className)}>
      <Destello size={size} twinkle />
      {value.toLocaleString("es-MX")}
    </span>
  );
}
