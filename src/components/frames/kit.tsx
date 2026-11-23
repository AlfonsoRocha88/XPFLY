import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for avatar frames.
 * Frames draw on a 120×120 viewBox around a round avatar (disc ≈ r50 at 60,60).
 * Art lives in the r≈46–62 ring and may overflow the box (overflow-visible).
 * Motion is pure CSS (frames.css): transform / opacity / stroke-dashoffset only,
 * and only runs inside `.fr-on` (animated && size >= 56) when motion is allowed.
 */
export type FrameProps = { size: number; animated?: boolean };

export const isAnimated = ({ size, animated }: FrameProps) => animated !== false && size >= 56;

/** Unique, url()-safe ids for gradients/filters inside one frame instance. */
export function useIds() {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (name: string) => `fr${base}${name}`;
}
export const url = (id: string) => `url(#${id})`;

export function FrameSvg({ size, animated, className, children }: FrameProps & { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cn("fr pointer-events-none absolute inset-0 overflow-visible", isAnimated({ size, animated }) && "fr-on", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const RAD = Math.PI / 180;
/** Point at radius r and angle deg (0 = right, 90 = bottom, -90 = top). */
export const pt = (r: number, deg: number, cx = 60, cy = 60) => ({ x: cx + r * Math.cos(deg * RAD), y: cy + r * Math.sin(deg * RAD) });

/** n points evenly spaced on a circle, starting at `offset` degrees. */
export const around = (n: number, r: number, offset = -90) =>
  Array.from({ length: n }, (_, i) => {
    const deg = offset + (i * 360) / n;
    return { ...pt(r, deg), deg };
  });

/** Round to 2 decimals for compact path strings. */
export const f = (n: number) => Math.round(n * 100) / 100;

/** Inline animation timing (delay / duration in seconds). */
export const t = (delay = 0, duration?: number, extra?: CSSProperties): CSSProperties => ({
  animationDelay: `${delay}s`,
  ...(duration ? { animationDuration: `${duration}s` } : null),
  ...extra,
});

/** Inline CSS custom properties (static values read by keyframes, never animated). */
export const vars = (v: Record<string, string>) => v as CSSProperties;

/** Deterministic pseudo-random generator so SSR/static art is stable. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A path string for a circle (lets many dots share one <path>). */
export const dot = (x: number, y: number, r: number) =>
  `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;

/** 4-point sparkle centered at 0,0 with radius r. */
export const sparkle = (r: number, w = 0.28) =>
  `M0 ${-r}C${f(r * w)} ${f(-r * w)} ${f(r * w)} ${f(-r * w)} ${r} 0C${f(r * w)} ${f(r * w)} ${f(r * w)} ${f(r * w)} 0 ${r}C${f(-r * w)} ${f(r * w)} ${f(-r * w)} ${f(r * w)} ${-r} 0C${f(-r * w)} ${f(-r * w)} ${f(-r * w)} ${f(-r * w)} 0 ${-r}Z`;
