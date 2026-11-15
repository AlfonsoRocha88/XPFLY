import { useCallback, useSyncExternalStore } from "react";

/**
 * "Liquid Glass" look (iOS 26 clear glass): almost no frost, a lens that bends the background
 * near the rim, and a bright specular edge. Opt-in per device; the class lives on <html> so the
 * CSS in index.css ("Liquid Glass") can restyle every glass surface at once.
 */
const KEY = "liquid-glass";
const listeners = new Set<() => void>();

const read = () => {
  try { return localStorage.getItem(KEY) === "on"; } catch { return false; }
};
export const applyLiquidGlass = (on = read()) => document.documentElement.classList.toggle("liquid-glass", on);

export function useLiquidGlass() {
  const on = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, read);
  const set = useCallback((v: boolean) => {
    try { localStorage.setItem(KEY, v ? "on" : "off"); } catch { /* storage blocked: applies for this visit only */ }
    applyLiquidGlass(v);
    listeners.forEach((l) => l());
  }, []);
  return [on, set] as const;
}

/*
 * Displacement map for the lens, stretched over each surface (preserveAspectRatio="none").
 * Neutral grey (0.5) = no shift. Red drives x, green drives y: near the left edge red > 0.5 pulls
 * the backdrop in from further inside (and < 0.5 near the right), likewise green top/bottom, so the
 * background magnifies and curves toward the rim like thick glass. The two ramps are combined with
 * `screen`, which keeps red and green in their own channels.
 */
const RAMP = (dir: "x" | "y", ch: "r" | "g") => {
  const c = (v: number) => (ch === "r" ? `rgb(${v},0,0)` : `rgb(0,${v},0)`);
  const [x2, y2] = dir === "x" ? ["1", "0"] : ["0", "1"];
  return `<linearGradient id='${dir}' x1='0' y1='0' x2='${x2}' y2='${y2}'>`
    + `<stop offset='0' stop-color='${c(255)}'/><stop offset='0.035' stop-color='${c(205)}'/><stop offset='0.09' stop-color='${c(128)}'/>`
    + `<stop offset='0.91' stop-color='${c(128)}'/><stop offset='0.965' stop-color='${c(51)}'/><stop offset='1' stop-color='${c(0)}'/></linearGradient>`;
};
const MAP_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' preserveAspectRatio='none'><defs>${RAMP("x", "r")}${RAMP("y", "g")}</defs>`
  + `<rect width='100' height='100' fill='url(#x)'/><rect width='100' height='100' fill='url(#y)' style='mix-blend-mode:screen'/></svg>`;
const MAP_URL = `data:image/svg+xml;utf8,${encodeURIComponent(MAP_SVG)}`;

/** Mounted once (App). Chromium applies it through backdrop-filter: url(#lg-lens). */
export const LiquidGlassFilter = () => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
    <filter id="lg-lens" x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
      <feImage href={MAP_URL} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map" />
      <feDisplacementMap in="SourceGraphic" in2="map" scale="0.06" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);
