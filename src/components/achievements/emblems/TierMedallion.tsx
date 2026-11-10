import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tier = 0 | 1 | 2 | 3;

/** Metal palettes: rim highlight → mid → shadow, face, and the ink used for the emblem. */
export const TIER_STYLE: Record<Exclude<Tier, 0>, { rim: [string, string, string]; face: [string, string]; ink: string; glow: string; name: string }> = {
  1: { rim: ["#F3C79A", "#C07A43", "#7A4522"], face: ["#E7AE7C", "#A8622F"], ink: "#FFF6EC", glow: "rgba(205,127,50,0.45)", name: "Bronce" },
  2: { rim: ["#FFFFFF", "#B9C3CD", "#6E7B88"], face: ["#E9EEF3", "#A3AFBB"], ink: "#2E3A47", glow: "rgba(185,195,205,0.5)", name: "Plata" },
  3: { rim: ["#FFF3B0", "#E1B12C", "#8A6410"], face: ["#FBD860", "#C99417"], ink: "#4A3300", glow: "rgba(240,190,40,0.6)", name: "Oro" },
};

/** Laurel branch along one side of the medallion (mirrored for the other side). */
function Laurel({ side }: { side: 1 | -1 }) {
  // Screen angles (y down): 100° is just left of the bottom, 220° is the upper-left.
  // Leaves climb from the bottom up each side; the right branch mirrors the left.
  const leaves = Array.from({ length: 6 }, (_, i) => {
    const deg = 100 + i * 23;
    const a = (deg * Math.PI) / 180;
    const x = 50 + side * 46 * Math.cos(a);
    const y = 50 + 46 * Math.sin(a);
    // An unrotated ellipse is vertical (pointing at 90°); rotating by `deg` lays it along the rim,
    // and ±25° tilts it outward like a real laurel leaf.
    const rot = side === 1 ? deg + 25 : 180 - deg - 25;
    return <ellipse key={i} cx={x} cy={y} rx="3.2" ry="7.5" transform={`rotate(${rot} ${x} ${y})`} />;
  });
  return <g fill="#E1B12C" stroke="#8A6410" strokeWidth=".8">{leaves}</g>;
}

/**
 * Round medallion around an emblem. Tier 0 = locked silhouette.
 * `shine` sweeps a highlight across the face (CSS, off under reduced motion).
 */
export function TierMedallion({ tier, size = 64, shine = false, onDark = false, children, className }: { tier: Tier; size?: number; shine?: boolean; onDark?: boolean; children: ReactNode; className?: string }) {
  const uid = useId().replace(/:/g, "");
  if (tier === 0 && onDark) {
    // Locked star on the night sky: frosted glass with a faint emblem, waiting to be lit.
    return (
      <div className={cn("relative grid place-items-center rounded-full", className)} style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0" aria-hidden>
          <defs>
            <radialGradient id={`${uid}g`} cx=".35" cy=".3" r=".9">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity=".16" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity=".04" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill={`url(#${uid}g)`} stroke="#FFFFFF" strokeOpacity=".28" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#FFFFFF" strokeOpacity=".14" strokeWidth="1" strokeDasharray="2 4" />
        </svg>
        <div className="relative text-white/55" style={{ width: size * 0.52, height: size * 0.52 }}>{children}</div>
      </div>
    );
  }
  if (tier === 0) {
    return (
      <div className={cn("relative grid place-items-center rounded-full", className)} style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0" aria-hidden>
          <circle cx="50" cy="50" r="44" fill="hsl(var(--muted))" fillOpacity=".55" stroke="hsl(var(--muted-foreground))" strokeOpacity=".35" strokeWidth="2" strokeDasharray="4 5" />
        </svg>
        <div className="relative text-muted-foreground/45" style={{ width: size * 0.56, height: size * 0.56 }}>{children}</div>
      </div>
    );
  }
  const t = TIER_STYLE[tier];
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size, filter: `drop-shadow(0 ${size * 0.04}px ${size * 0.1}px ${t.glow})` }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0 overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`${uid}r`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={t.rim[0]} />
            <stop offset=".5" stopColor={t.rim[1]} />
            <stop offset="1" stopColor={t.rim[2]} />
          </linearGradient>
          <radialGradient id={`${uid}f`} cx=".35" cy=".3" r=".8">
            <stop offset="0" stopColor={t.face[0]} />
            <stop offset="1" stopColor={t.face[1]} />
          </radialGradient>
          <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${uid}c`}>
            <circle cx="50" cy="50" r="37" />
          </clipPath>
        </defs>
        {tier === 3 && (
          <>
            <Laurel side={-1} />
            <Laurel side={1} />
          </>
        )}
        <circle cx="50" cy="50" r={tier === 3 ? 41 : 45} fill={`url(#${uid}r)`} />
        {/* Milled edge */}
        <circle cx="50" cy="50" r={tier === 3 ? 39 : 42.5} fill="none" stroke={t.rim[2]} strokeOpacity=".35" strokeWidth="1.2" strokeDasharray="1.2 2.2" />
        <circle cx="50" cy="50" r="37" fill={`url(#${uid}f)`} />
        <circle cx="50" cy="50" r="37" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1" />
        <path d="M22 40 A30 30 0 0 1 60 15" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2.5" strokeLinecap="round" />
        {shine && (
          <g clipPath={`url(#${uid}c)`}>
            <rect className="emblem-shine" x="-60" y="0" width="40" height="100" fill={`url(#${uid}s)`} transform="skewX(-20)" />
          </g>
        )}
      </svg>
      <div className="relative" style={{ width: size * 0.5, height: size * 0.5, color: t.ink }}>{children}</div>
    </div>
  );
}
