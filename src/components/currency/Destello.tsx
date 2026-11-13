import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Destello: Constela's currency. A faceted four-point crystal with a soft halo.
 * Pale iridescent fill (white → ice blue → lilac) reads as precious without shouting.
 */
export function Destello({ size = 16, className, twinkle = false }: { size?: number; className?: string; twinkle?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("inline-block shrink-0 overflow-visible", twinkle && "destello-twinkle", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}h`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#C9D8FF" stopOpacity=".55" />
          <stop offset="1" stopColor="#C9D8FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".45" stopColor="#BFE3FF" />
          <stop offset="1" stopColor="#B9A4FF" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9F4FF" />
          <stop offset="1" stopColor="#8F9CFF" />
        </linearGradient>
      </defs>
      {/* Halo */}
      <circle cx="16" cy="16" r="15" fill={`url(#${id}h)`} />
      {/* Four facets: light ones face the top-left light, darker ones the bottom-right */}
      <path d="M16 2 L19 13 L16 16 Z" fill={`url(#${id}a)`} />
      <path d="M16 2 L13 13 L16 16 Z" fill="#FFFFFF" />
      <path d="M30 16 L19 13 L16 16 Z" fill={`url(#${id}a)`} />
      <path d="M30 16 L19 19 L16 16 Z" fill={`url(#${id}b)`} />
      <path d="M16 30 L19 19 L16 16 Z" fill={`url(#${id}b)`} />
      <path d="M16 30 L13 19 L16 16 Z" fill={`url(#${id}a)`} />
      <path d="M2 16 L13 19 L16 16 Z" fill={`url(#${id}a)`} />
      <path d="M2 16 L13 13 L16 16 Z" fill="#FFFFFF" />
      {/* Rim and a tiny specular point */}
      <path d="M16 2 L19 13 L30 16 L19 19 L16 30 L13 19 L2 16 L13 13 Z" fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth=".6" strokeLinejoin="round" />
      <circle cx="13.2" cy="12.4" r="1.1" fill="#FFFFFF" />
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
