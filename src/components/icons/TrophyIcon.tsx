import { useId } from "react";
import { cn } from "@/lib/utils";
import "../leagues/emblems.css";

/**
 * TrophyIcon: Constela's trophy mark. A small five-point gold star inside a tilted orbit ring;
 * the ring's far half passes behind the star and its near half in front, so it reads as "in orbit".
 * Built to stay legible at 14–18px inline next to numbers. Optional `animated` adds a spark that
 * travels along the ring.
 */

const TILT = -20;
const RX = 10.4;
const RY = 3.9;
const FAR = `M${-RX} 0A${RX} ${RY} 0 0 1 ${RX} 0`;
const NEAR = `M${-RX} 0A${RX} ${RY} 0 0 0 ${RX} 0`;
const NEAR_HI = `M${-(RX - 0.35)} 0A${RX - 0.35} ${RY - 0.35} 0 0 0 ${RX - 0.35} 0`;

const STAR = (() => {
  const cx = 12;
  const cy = 12.6;
  const outer = 5.5;
  const inner = 2.45;
  let d = "";
  for (let k = 0; k < 10; k++) {
    const a = ((-90 + k * 36) * Math.PI) / 180;
    const r = k % 2 ? inner : outer;
    d += `${k ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
})();

export function TrophyIcon({ size = 16, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, "");
  const ringFrame = `translate(12 12) rotate(${TILT})`;
  const spark = (half: "far" | "near") => (
    <g transform={`scale(1 ${(RY / RX).toFixed(3)})`} clipPath={`url(#${id}${half})`}>
      <g className="tr-spark">
        <circle cx={RX} cy="0" r="2.2" fill={`url(#${id}s)`} />
      </g>
    </g>
  );

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("inline-block shrink-0 overflow-visible", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0" stopColor="#FFD36B" stopOpacity=".34" />
          <stop offset="1" stopColor="#FFD36B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF6CF" />
          <stop offset=".45" stopColor="#F7C95A" />
          <stop offset="1" stopColor="#D9861A" />
        </linearGradient>
        <linearGradient id={`${id}r`} gradientUnits="userSpaceOnUse" x1={-RX} y1="0" x2={RX} y2="0">
          <stop offset="0" stopColor="#FFEBB0" />
          <stop offset=".55" stopColor="#F2B544" />
          <stop offset="1" stopColor="#C97A16" />
        </linearGradient>
        {animated && (
          <>
            <radialGradient id={`${id}s`}>
              <stop offset="0" stopColor="#FFFDF2" />
              <stop offset=".4" stopColor="#FFF1C2" stopOpacity=".8" />
              <stop offset="1" stopColor="#FFE08A" stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${id}far`}>
              <rect x="-20" y="-20" width="40" height="20" />
            </clipPath>
            <clipPath id={`${id}near`}>
              <rect x="-20" y="0" width="40" height="20" />
            </clipPath>
          </>
        )}
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}h)`} />
      {/* Far half of the orbit, behind the star */}
      <g transform={ringFrame}>
        <path d={FAR} fill="none" stroke={`url(#${id}r)`} strokeOpacity=".6" strokeWidth="1.5" strokeLinecap="round" />
        {animated && spark("far")}
      </g>
      <path d={STAR} fill={`url(#${id}g)`} stroke="#FFF3C4" strokeOpacity=".7" strokeWidth=".45" strokeLinejoin="round" />
      {/* Near half, over the star, with a thin highlight */}
      <g transform={ringFrame}>
        <path d={NEAR} fill="none" stroke={`url(#${id}r)`} strokeWidth="1.7" strokeLinecap="round" />
        <path d={NEAR_HI} fill="none" stroke="#FFF8E0" strokeOpacity=".75" strokeWidth=".4" strokeLinecap="round" />
        {animated && spark("near")}
      </g>
    </svg>
  );
}

export default TrophyIcon;
