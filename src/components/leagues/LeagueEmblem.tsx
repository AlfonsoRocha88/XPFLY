import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./emblems.css";

/**
 * LeagueEmblem: one round badge per league family. A dark glass disc, the celestial body in the
 * middle, and the division as 1–3 small stars on a tilted orbit (III = 1 star, I = 3 stars).
 *
 * Motion: every loop is a CSS keyframe on transform/opacity (emblems.css). Nothing is driven from JS;
 * the component only toggles a paused class when the emblem is locked, `animated={false}`, or scrolled
 * off-screen. Reduced motion pauses everything in CSS.
 *
 * Transform pivots: animated groups never carry a `transform` attribute themselves (CSS would replace
 * it). They sit inside a static parent that moves the pivot to the local origin, and use `.le-o0`
 * (origin 0 0) or `.le-fb` (fill-box centre) for symmetric shapes.
 */

export type LeagueFamily =
  | "asteroide"
  | "cometa"
  | "luna"
  | "mercurio"
  | "marte"
  | "tierra"
  | "neptuno"
  | "saturno"
  | "jupiter"
  | "sol"
  | "supernova"
  | "galactica";

export type LeagueDivision = 1 | 2 | 3;

export const LEAGUE_DISPLAY: Record<LeagueFamily, string> = {
  asteroide: "Asteroide",
  cometa: "Cometa",
  luna: "Luna",
  mercurio: "Mercurio",
  marte: "Marte",
  tierra: "Tierra",
  neptuno: "Neptuno",
  saturno: "Saturno",
  jupiter: "Júpiter",
  sol: "Sol",
  supernova: "Supernova",
  galactica: "Galáctica",
};

const ROMAN: Record<LeagueDivision, string> = { 1: "I", 2: "II", 3: "III" };

/** Glow/tint per family: used by the glass disc and the orbit stars. */
const ACCENT: Record<LeagueFamily, string> = {
  asteroide: "#B4AED0",
  cometa: "#8FE3FF",
  luna: "#DCD6FF",
  mercurio: "#FFCF8A",
  marte: "#FF946E",
  tierra: "#73BCFF",
  neptuno: "#6F8CFF",
  saturno: "#F2CF7E",
  jupiter: "#E8BC8E",
  sol: "#FFD36B",
  supernova: "#FFA8E4",
  galactica: "#B9A4FF",
};

/* ---------- Geometry ---------- */

const C = 60; // centre of the 120×120 viewBox
const R = 27; // default body radius
const TILT = -14; // orbit (and Saturn ring) tilt, degrees
const ORBIT_RX = 54;
const ORBIT_RY = 20;
const ORBIT_K = ORBIT_RY / ORBIT_RX;
const RING_K = 0.3;

const r2 = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Circular arc around (cx, cy), angles in degrees (0 = +x, clockwise on screen). */
function arc(r: number, a0: number, a1: number, cx = 0, cy = 0) {
  const x0 = r2(cx + r * Math.cos(rad(a0)));
  const y0 = r2(cy + r * Math.sin(rad(a0)));
  const x1 = r2(cx + r * Math.cos(rad(a1)));
  const y1 = r2(cy + r * Math.sin(rad(a1)));
  return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

/** Smooth closed outline through points (quadratic curves between midpoints). */
function smoothClosed(pts: ReadonlyArray<readonly [number, number]>) {
  const mid = (p: readonly [number, number], q: readonly [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const n = pts.length;
  const m0 = mid(pts[n - 1], pts[0]);
  let d = `M${r2(m0[0])} ${r2(m0[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += `Q${r2(p[0])} ${r2(p[1])} ${r2(m[0])} ${r2(m[1])}`;
  }
  return `${d}Z`;
}

/** Horizontal band with a gentle wave on both edges. Period 30, so a 60px scroll loops seamlessly. */
function band(x0: number, x1: number, y0: number, y1: number, amp: number) {
  const n = Math.round((x1 - x0) / 15);
  let d = `M${x0} ${y0}q7.5 ${-amp} 15 0`;
  for (let i = 1; i < n; i++) d += "t15 0";
  d += `V${y1}q-7.5 ${amp} -15 0`;
  for (let i = 1; i < n; i++) d += "t-15 0";
  return `${d}Z`;
}

/** Deterministic pseudo-random numbers so the galaxy looks the same on every render. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROCK = smoothClosed(
  [23.5, 25, 21.5, 24, 26, 22, 24.5, 20.5, 23, 25.5, 22, 24].map((r, i, all) => {
    const a = (i / all.length) * Math.PI * 2;
    return [Math.cos(a) * r * 1.08, Math.sin(a) * r * 0.92] as const;
  }),
);

/** Tapered rays around the centre, alternating long/short. */
function rays(count: number, r0: number, long: number, short: number, half: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const a = rad(offset + (i * 360) / count);
    const d = half / r0;
    const tip = i % 2 ? short : long;
    const p = (r: number, ang: number) => `${r2(C + r * Math.cos(ang))} ${r2(C + r * Math.sin(ang))}`;
    return `M${p(r0, a - d)}L${p(tip, a)}L${p(r0, a + d)}Z`;
  }).join("");
}

const SUN_RAYS_A = rays(12, 18.5, 38, 30, 1.5);
const SUN_RAYS_B = rays(8, 18.5, 45, 40, 0.8, 22.5);

/** Galaxy: two logarithmic arms plus scattered disc stars, in the disc's own (unsquashed) space. */
const GALAXY = (() => {
  const rand = seeded(20261114);
  const A0 = 4.5;
  const B = 0.27;
  const tMax = 2.55 * Math.PI;
  const arms = [0, Math.PI].map((phase) => {
    let d = "";
    for (let i = 0; i <= 44; i++) {
      const t = (i / 44) * tMax;
      const r = A0 * Math.exp(B * t);
      d += `${i ? "L" : "M"}${r2(r * Math.cos(t + phase))} ${r2(r * Math.sin(t + phase))}`;
    }
    return d;
  });
  const tints = ["#FFFFFF", "#E2EAFF", "#ECDFFF", "#FFEBD8"];
  const stars: { x: number; y: number; r: number; o: number; c: string }[] = [];
  for (const phase of [0, Math.PI]) {
    for (let i = 0; i < 18; i++) {
      const t = tMax * ((i + 0.5) / 18) ** 0.85;
      const r = A0 * Math.exp(B * t) + (rand() - 0.5) * 4;
      const a = t + phase + (rand() - 0.5) * 0.26;
      stars.push({
        x: r2(r * Math.cos(a)),
        y: r2(r * Math.sin(a)),
        r: r2((0.55 + rand() * 0.85) * (1 - (t / tMax) * 0.35)),
        o: r2(0.6 + rand() * 0.4),
        c: tints[Math.floor(rand() * tints.length)],
      });
    }
  }
  for (let i = 0; i < 14; i++) {
    const r = 9 + rand() * 34;
    const a = rand() * Math.PI * 2;
    stars.push({ x: r2(r * Math.cos(a)), y: r2(r * Math.sin(a)), r: r2(0.4 + rand() * 0.4), o: r2(0.35 + rand() * 0.35), c: "#DCE4FF" });
  }
  return { arms, stars };
})();

/* ---------- Shared pieces ---------- */

type BodyProps = { id: string };

/** Fixed top-left light: darkens the limb and the far side of a sphere. */
function Shade({ id, r = R, strength = 1 }: { id: string; r?: number; strength?: number }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}sh`} cx=".36" cy=".32" r=".8">
          <stop offset="0" stopColor="#06051A" stopOpacity="0" />
          <stop offset=".5" stopColor="#06051A" stopOpacity="0" />
          <stop offset=".82" stopColor="#06051A" stopOpacity={0.45 * strength} />
          <stop offset="1" stopColor="#06051A" stopOpacity={0.8 * strength} />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={r} fill={`url(#${id}sh)`} />
    </>
  );
}

/** Thin back-light on the bottom-right limb. */
function Rim({ id, color, r = R }: { id: string; color: string; r?: number }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}rim`} x1=".2" y1=".15" x2=".85" y2=".92">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset=".55" stopColor={color} stopOpacity="0" />
          <stop offset="1" stopColor={color} stopOpacity=".8" />
        </linearGradient>
      </defs>
      <circle cx={C} cy={C} r={r - 0.4} fill="none" stroke={`url(#${id}rim)`} strokeWidth="1.1" />
    </>
  );
}

/** Crater: a dark bowl with a lit lower-right lip. */
const Crater = ({ x, y, r, dark, light }: { x: number; y: number; r: number; dark: string; light: string }) => (
  <>
    <circle cx={x + r * 0.18} cy={y + r * 0.18} r={r} fill={light} fillOpacity=".32" />
    <circle cx={x} cy={y} r={r * 0.9} fill={dark} fillOpacity=".55" />
  </>
);

/** Sphere gradient helper (light top-left). */
const Sphere = ({ id, stops }: { id: string; stops: [string, string, string] }) => (
  <radialGradient id={id} cx=".38" cy=".34" r=".72">
    <stop offset="0" stopColor={stops[0]} />
    <stop offset=".55" stopColor={stops[1]} />
    <stop offset="1" stopColor={stops[2]} />
  </radialGradient>
);

const ClipCircle = ({ id, r = R }: { id: string; r?: number }) => (
  <clipPath id={id}>
    <circle cx={C} cy={C} r={r} />
  </clipPath>
);

function Glass({ id, accent, crown }: { id: string; accent: string; crown: boolean }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}g`} cx=".5" cy=".42" r=".62">
          <stop offset="0" stopColor={accent} stopOpacity=".16" />
          <stop offset=".62" stopColor="#15123A" stopOpacity=".6" />
          <stop offset="1" stopColor="#0B0A24" stopOpacity=".86" />
        </radialGradient>
        <linearGradient id={`${id}gr`} x1=".15" y1="0" x2=".85" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".34" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".05" />
          <stop offset="1" stopColor={accent} stopOpacity=".3" />
        </linearGradient>
        {crown && (
          <linearGradient id={`${id}gc`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFE6A8" stopOpacity=".75" />
            <stop offset=".5" stopColor="#F2C46A" stopOpacity=".25" />
            <stop offset="1" stopColor="#B9A4FF" stopOpacity=".55" />
          </linearGradient>
        )}
      </defs>
      <circle cx={C} cy={C} r="57" fill={`url(#${id}g)`} />
      <circle cx={C} cy={C} r="56.6" fill="none" stroke={`url(#${id}gr)`} strokeWidth=".9" />
      {crown && <circle cx={C} cy={C} r="53.8" fill="none" stroke={`url(#${id}gc)`} strokeWidth=".6" />}
      {/* Glass reflection along the upper-left edge */}
      <path d={arc(53.4, 198, 246, C, C)} fill="none" stroke="#FFFFFF" strokeOpacity=".13" strokeWidth="1.2" strokeLinecap="round" />
    </>
  );
}

/** Where the stars sit at rest, chosen so none hides behind the body when paused. */
const ORBIT_START: Record<LeagueDivision, number> = { 3: 70, 2: 30, 1: 90 };

/**
 * Division stars on the tilted orbit. Drawn twice: the back half before the body, the front half
 * after it (each clipped to its half), so the stars pass behind the planet and in front of it.
 * The orbit group spins a circle inside a squashed frame (that's the ellipse); each star counter-spins
 * and un-squashes so it stays round and upright.
 */
function Orbit({ id, division, half }: { id: string; division: LeagueDivision; half: "back" | "front" }) {
  const count = 4 - division;
  const start = ORBIT_START[division];
  const back = half === "back";
  return (
    <g transform={`translate(${C} ${C}) rotate(${TILT})`}>
      <path
        d={`M${-ORBIT_RX} 0A${ORBIT_RX} ${ORBIT_RY} 0 0 ${back ? 1 : 0} ${ORBIT_RX} 0`}
        fill="none"
        stroke="#E6E2FF"
        strokeOpacity={back ? 0.14 : 0.28}
        strokeWidth=".7"
      />
      <g transform={`scale(1 ${r2(ORBIT_K)})`} clipPath={`url(#${id}${half})`}>
        <g className="le-anim le-orbit le-o0">
          {Array.from({ length: count }, (_, i) => {
            const a = start + (i * 360) / count;
            return (
              <g key={i} transform={`rotate(${a}) translate(${ORBIT_RX} 0) rotate(${-a})`}>
                <g className="le-anim le-orbit-counter le-o0">
                  <g transform={`scale(1 ${r2(1 / ORBIT_K)}) rotate(${-TILT})`}>
                    <circle r="6.5" fill={`url(#${id}st)`} />
                    <circle r="2.1" fill="#FFFFFF" />
                  </g>
                </g>
              </g>
            );
          })}
        </g>
      </g>
    </g>
  );
}

/* ---------- Bodies ---------- */

/** Asteroide: an irregular cratered rock rocking slowly, with a few drifting specks of debris. */
function Asteroide({ id }: BodyProps) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}ast`} cx=".36" cy=".3" r=".8">
          <stop offset="0" stopColor="#D8D4E6" />
          <stop offset=".45" stopColor="#8F8AA8" />
          <stop offset="1" stopColor="#2C2A40" />
        </radialGradient>
      </defs>
      {[
        [27, 40, 1.1],
        [95, 76, 1.4],
        [91, 34, 0.9],
      ].map(([x, y, r], i) => (
        <g key={i} className={`le-anim le-drift le-drift-${i + 1}`}>
          <circle cx={x} cy={y} r={r} fill="#CFCAE2" />
        </g>
      ))}
      <g transform={`translate(${C} ${C})`}>
        <g className="le-anim le-tumble le-o0">
          <path d={ROCK} fill={`url(#${id}ast)`} stroke="#ECE9F8" strokeOpacity=".2" strokeWidth=".6" />
          <Crater x={-8} y={-7} r={4.2} dark="#36324C" light="#E6E2F2" />
          <Crater x={7} y={5} r={5.4} dark="#36324C" light="#E6E2F2" />
          <Crater x={-4} y={11} r={2.8} dark="#36324C" light="#E6E2F2" />
          <Crater x={12} y={-9} r={2.4} dark="#36324C" light="#E6E2F2" />
          <Crater x={-15} y={4} r={2} dark="#36324C" light="#E6E2F2" />
        </g>
      </g>
    </g>
  );
}

/** Cometa: icy nucleus and a two-tone tail whose layers breathe out of phase. */
function Cometa({ id }: BodyProps) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}ta`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="56" y2="0">
          <stop offset="0" stopColor="#C4B2FF" stopOpacity=".6" />
          <stop offset="1" stopColor="#B9A4FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}tb`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="48" y2="0">
          <stop offset="0" stopColor="#B8F0FF" stopOpacity=".9" />
          <stop offset=".6" stopColor="#8FE3FF" stopOpacity=".35" />
          <stop offset="1" stopColor="#8FE3FF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}coma`}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".95" />
          <stop offset=".35" stopColor="#BFEFFF" stopOpacity=".5" />
          <stop offset="1" stopColor="#8FE3FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(70 50) rotate(145)">
        <g className="le-anim le-tail-a le-o0">
          <path d="M0 -6.5C18 -9 36 -12 56 -9C38 -2 20 4 0 6.5Z" fill={`url(#${id}ta)`} />
        </g>
        <g className="le-anim le-tail-b le-o0">
          <path d="M0 -4C14 -5 30 -5 48 -1C30 1.5 14 3.5 0 4Z" fill={`url(#${id}tb)`} />
          <path d="M2 0C18 -.8 32 -1.4 50 -3.4" fill="none" stroke="#DFF8FF" strokeOpacity=".35" strokeWidth=".6" strokeLinecap="round" />
        </g>
        <g className="le-anim le-coma le-fb">
          <circle r="13" fill={`url(#${id}coma)`} />
        </g>
        <circle r="4.2" fill="#F2FBFF" />
        <circle cx="-1.2" cy="1.1" r="1.4" fill="#FFFFFF" />
      </g>
    </g>
  );
}

/** Luna: pale cratered moon; a soft shadow slides back and forth like the phases. */
function Luna({ id }: BodyProps) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}moon`} cx=".4" cy=".36" r=".72">
          <stop offset="0" stopColor="#FBF9FF" />
          <stop offset=".55" stopColor="#D9D4E6" />
          <stop offset="1" stopColor="#9892AD" />
        </radialGradient>
        <radialGradient id={`${id}halo`}>
          <stop offset=".6" stopColor="#E6E1FF" stopOpacity=".22" />
          <stop offset="1" stopColor="#E6E1FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}night`}>
          <stop offset="0" stopColor="#0D0B26" stopOpacity=".86" />
          <stop offset=".8" stopColor="#0D0B26" stopOpacity=".86" />
          <stop offset="1" stopColor="#0D0B26" stopOpacity="0" />
        </radialGradient>
        <ClipCircle id={`${id}clip`} />
      </defs>
      <circle cx={C} cy={C} r={R + 9} fill={`url(#${id}halo)`} />
      <circle cx={C} cy={C} r={R} fill={`url(#${id}moon)`} />
      <g fill="#ABA4C2" fillOpacity=".5">
        <ellipse cx="52" cy="52" rx="7.5" ry="5.5" transform="rotate(-20 52 52)" />
        <ellipse cx="66.5" cy="63" rx="6" ry="4.8" />
        <ellipse cx="55" cy="71" rx="3.6" ry="2.8" />
      </g>
      <Crater x={68} y={46} r={2.6} dark="#8E88A6" light="#FFFFFF" />
      <Crater x={45.5} y={64} r={2.2} dark="#8E88A6" light="#FFFFFF" />
      <Crater x={72} y={72} r={1.8} dark="#8E88A6" light="#FFFFFF" />
      <g clipPath={`url(#${id}clip)`}>
        <g className="le-anim le-phase">
          <circle cx={C} cy={C} r="31" fill={`url(#${id}night)`} />
        </g>
      </g>
      <g opacity=".5">
        <Shade id={id} />
      </g>
    </g>
  );
}

/** Mercurio: small grey-gold world; the sun-facing limb glows and slowly pulses. */
function Mercurio({ id }: BodyProps) {
  const r = 21;
  return (
    <g>
      <defs>
        <Sphere id={`${id}b`} stops={["#EFE2C2", "#A99A86", "#3F394E"]} />
        <linearGradient id={`${id}hot`} gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="72" y2="72">
          <stop offset="0" stopColor="#FFE6AE" />
          <stop offset=".45" stopColor="#FFB35C" stopOpacity=".6" />
          <stop offset=".78" stopColor="#FFB35C" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}wash`} cx=".22" cy=".22" r=".72">
          <stop offset="0" stopColor="#FFD08C" stopOpacity=".4" />
          <stop offset="1" stopColor="#FFD08C" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={r} fill={`url(#${id}b)`} />
      <Crater x={55} y={54} r={2.6} dark="#5E5566" light="#FFF1D4" />
      <Crater x={66} y={63} r={3.2} dark="#5E5566" light="#FFF1D4" />
      <Crater x={58} y={70} r={1.6} dark="#5E5566" light="#FFF1D4" />
      <Crater x={68} y={51} r={1.4} dark="#5E5566" light="#FFF1D4" />
      <Shade id={id} r={r} />
      <g className="le-anim le-heat">
        <circle cx={C} cy={C} r={r} fill={`url(#${id}wash)`} />
        <circle cx={C} cy={C} r={r + 1.6} fill="none" stroke={`url(#${id}hot)`} strokeWidth="5" strokeOpacity=".35" />
        <circle cx={C} cy={C} r={r - 0.2} fill="none" stroke={`url(#${id}hot)`} strokeWidth="1.5" />
      </g>
    </g>
  );
}

/** Marte: rust planet with a polar cap; faint dust haze drifts across the face. */
function Marte({ id }: BodyProps) {
  const r = 26;
  return (
    <g>
      <defs>
        <Sphere id={`${id}b`} stops={["#F4A77D", "#C4532F", "#4E1A1F"]} />
        <ClipCircle id={`${id}clip`} r={r} />
      </defs>
      <circle cx={C} cy={C} r={r} fill={`url(#${id}b)`} />
      <g clipPath={`url(#${id}clip)`}>
        <g fill="#7D2F22" fillOpacity=".45">
          <ellipse cx="54" cy="62" rx="10" ry="4.5" transform="rotate(-15 54 62)" />
          <ellipse cx="70" cy="54" rx="6" ry="3" />
          <ellipse cx="63" cy="74" rx="7" ry="3" />
        </g>
        <ellipse cx="60" cy="37.5" rx="13" ry="6" fill="#FFF5EF" fillOpacity=".3" />
        <ellipse cx="60" cy="36.5" rx="9.5" ry="4" fill="#FFF5EF" fillOpacity=".92" />
        <g className="le-anim le-haze le-haze-1">
          <ellipse cx={C} cy="51" rx="26" ry="4.5" fill="#FFD2B0" fillOpacity=".2" />
        </g>
        <g className="le-anim le-haze le-haze-2">
          <ellipse cx={C} cy="68" rx="24" ry="4" fill="#FFD2B0" fillOpacity=".16" />
        </g>
      </g>
      <Shade id={id} r={r} />
      <Rim id={id} r={r} color="#FF9D76" />
    </g>
  );
}

const LAND = [
  "M38 44c4-5 12-6 16-2c3 3 1 7 4 9c3 2 2 7-2 8c-4 1-6 5-10 4c-4-1-3-6-7-8c-4-2-5-8-1-11z",
  "M64 62c5-3 12-1 14 4c2 5-2 8-1 12c1 4-4 7-8 5c-4-2-3-7-6-9c-3-2-3-9 1-12z",
  "M72 40c3-2 7-1 7 2c0 3-4 4-7 3c-2-1-2-4 0-5z",
];
const CLOUDS = ["M31 48h20", "M57 70h17", "M40 79h11", "M66 52h15", "M34 61h9"];

/** Tierra: ocean world; continents and cloud bands scroll at two speeds inside the disc. */
function Tierra({ id }: BodyProps) {
  return (
    <g>
      <defs>
        <Sphere id={`${id}b`} stops={["#86CCFF", "#2E6FD8", "#0D2466"]} />
        <ClipCircle id={`${id}clip`} />
      </defs>
      <circle cx={C} cy={C} r={R + 2.4} fill="none" stroke="#6FB8FF" strokeOpacity=".16" strokeWidth="3.5" />
      <circle cx={C} cy={C} r={R} fill={`url(#${id}b)`} />
      <g clipPath={`url(#${id}clip)`}>
        <g className="le-anim le-scroll-land">
          {[0, 60].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`} fill="#5CCF8F" fillOpacity=".92">
              {LAND.map((d) => (
                <path key={d} d={d} />
              ))}
              <ellipse cx="46" cy="49" rx="3" ry="2" fill="#3FA673" />
              <ellipse cx="70" cy="70" rx="2.6" ry="1.8" fill="#3FA673" />
            </g>
          ))}
        </g>
        <g className="le-anim le-scroll-cloud">
          {[0, 60].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`} fill="none" stroke="#FFFFFF" strokeOpacity=".78" strokeWidth="2.4" strokeLinecap="round">
              {CLOUDS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          ))}
        </g>
      </g>
      <Shade id={id} />
      <circle cx={C} cy={C} r={R + 0.6} fill="none" stroke="#9EDCFF" strokeOpacity=".55" strokeWidth="1" />
    </g>
  );
}

/** Neptuno: deep-blue banded giant; a dark storm with a white wisp drifts across. */
function Neptuno({ id }: BodyProps) {
  return (
    <g>
      <defs>
        <Sphere id={`${id}b`} stops={["#8FBAFF", "#2F52D6", "#0C1556"]} />
        <ClipCircle id={`${id}clip`} />
      </defs>
      <circle cx={C} cy={C} r={R} fill={`url(#${id}b)`} />
      <g clipPath={`url(#${id}clip)`}>
        <rect x="30" y="43" width="60" height="2.2" fill="#B4D2FF" fillOpacity=".2" />
        <rect x="30" y="50" width="60" height="1.2" fill="#B4D2FF" fillOpacity=".14" />
        <rect x="30" y="58" width="60" height="4" fill="#1D2F9A" fillOpacity=".35" />
        <rect x="30" y="72" width="60" height="1.6" fill="#B4D2FF" fillOpacity=".16" />
        <g className="le-anim le-storm">
          <ellipse cx={C} cy="65" rx="6" ry="3.4" fill="#0A1342" fillOpacity=".75" />
          <path d="M54 60.4q6-2.4 13-.4" fill="none" stroke="#E8F1FF" strokeOpacity=".7" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      </g>
      <Shade id={id} />
      <Rim id={id} color="#7FA8FF" />
    </g>
  );
}

/** Saturn's ring bands, drawn as circles in a squashed frame (so they foreshorten like real rings). */
const RingBands = () => (
  <g fill="none">
    <circle r="43.4" stroke="#8F7448" strokeWidth="1" />
    <circle r="40" stroke="#CDB07A" strokeWidth="4.4" />
    <circle r="32" stroke="#F1DFB1" strokeWidth="5.4" />
    <circle r="26.6" stroke="#8B7658" strokeWidth="2.2" />
  </g>
);

/** A soft highlight that travels around the rings (three stacked arcs fade its edges). */
const RingSheen = () => (
  <g className="le-anim le-sheen le-o0" fill="none" stroke="#FFFAF0" strokeLinecap="round">
    {[
      [22, 0.12],
      [13, 0.16],
      [6, 0.24],
    ].map(([span, o]) => (
      <g key={span} strokeOpacity={o}>
        <path d={arc(40, -span, span)} strokeWidth="4.4" />
        <path d={arc(32, -span, span)} strokeWidth="5.4" />
      </g>
    ))}
  </g>
);

/** Saturno: golden planet in tilted rings (back half behind it, front half over it), with a sheen. */
function Saturno({ id }: BodyProps) {
  const r = 20;
  const frame = `translate(${C} ${C}) rotate(${TILT}) scale(1 ${RING_K})`;
  return (
    <g>
      <defs>
        <Sphere id={`${id}b`} stops={["#FFF0C4", "#E2B45F", "#6D4620"]} />
        <ClipCircle id={`${id}clip`} r={r} />
      </defs>
      <g transform={frame}>
        <RingBands />
        <g clipPath={`url(#${id}back)`}>
          <RingSheen />
        </g>
      </g>
      <circle cx={C} cy={C} r={r} fill={`url(#${id}b)`} />
      <g clipPath={`url(#${id}clip)`}>
        <rect x="38" y="52" width="44" height="3" fill="#C9964D" fillOpacity=".35" />
        <rect x="38" y="57" width="44" height="1.6" fill="#FFF3D2" fillOpacity=".25" />
        <rect x="38" y="63" width="44" height="2.5" fill="#C9964D" fillOpacity=".3" />
      </g>
      <Shade id={id} r={r} />
      <g transform={frame} clipPath={`url(#${id}front)`}>
        <RingBands />
        <RingSheen />
      </g>
    </g>
  );
}

/** Júpiter: beige/brown giant; neighbouring belts scroll in opposite directions, red spot rides between. */
function Jupiter({ id }: BodyProps) {
  return (
    <g>
      <defs>
        <Sphere id={`${id}b`} stops={["#F7E9D2", "#D8B98F", "#6E5038"]} />
        <ClipCircle id={`${id}clip`} />
      </defs>
      <circle cx={C} cy={C} r={R} fill={`url(#${id}b)`} />
      <g clipPath={`url(#${id}clip)`}>
        <g className="le-anim le-scroll-west">
          <path d={band(30, 150, 40, 44.5, 1.2)} fill="#C49A6F" />
          <path d={band(30, 150, 63, 69, 1.6)} fill="#A8724C" />
          <path d={band(30, 150, 77, 80, 1)} fill="#C8A57C" />
        </g>
        <g className="le-anim le-scroll-east">
          <path d={band(-30, 90, 49, 55.5, 1.8)} fill="#9A6643" />
          <path d={band(-30, 90, 57, 58.6, 0.6)} fill="#F6EAD6" />
          <path d={band(-30, 90, 71, 73, 0.8)} fill="#EAD6B6" />
        </g>
        <g className="le-anim le-sway">
          <ellipse cx="67" cy="70.5" rx="6.5" ry="3.6" fill="#C4553C" stroke="#F3C9A8" strokeOpacity=".6" strokeWidth=".7" />
          <ellipse cx="67" cy="70.5" rx="3.8" ry="1.9" fill="#DE7C5C" />
        </g>
      </g>
      <Shade id={id} />
      <Rim id={id} color="#F3D2A8" />
    </g>
  );
}

/** Sol: white-gold core, two breathing corona layers and two ray sets turning against each other. */
function Sol({ id }: BodyProps) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}core`} cx=".42" cy=".4" r=".62">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".4" stopColor="#FFF6D4" />
          <stop offset=".8" stopColor="#FFD572" />
          <stop offset="1" stopColor="#FFAB45" />
        </radialGradient>
        <radialGradient id={`${id}c1`}>
          <stop offset="0" stopColor="#FFE7A1" stopOpacity=".55" />
          <stop offset=".55" stopColor="#FFCF5A" stopOpacity=".22" />
          <stop offset="1" stopColor="#FFCF5A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}c2`}>
          <stop offset="0" stopColor="#FFB547" stopOpacity=".2" />
          <stop offset="1" stopColor="#FFB547" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}ray`} gradientUnits="userSpaceOnUse" cx={C} cy={C} r="46">
          <stop offset=".38" stopColor="#FFF1C2" stopOpacity=".85" />
          <stop offset=".7" stopColor="#FFC95A" stopOpacity=".32" />
          <stop offset="1" stopColor="#FFB547" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="le-anim le-corona le-corona-2 le-fb">
        <circle cx={C} cy={C} r="42" fill={`url(#${id}c2)`} />
      </g>
      <g className="le-anim le-corona le-corona-1 le-fb">
        <circle cx={C} cy={C} r="30" fill={`url(#${id}c1)`} />
      </g>
      <g className="le-anim le-rays-b le-oc" opacity=".55">
        <path d={SUN_RAYS_B} fill={`url(#${id}ray)`} />
      </g>
      <g className="le-anim le-rays-a le-oc">
        <path d={SUN_RAYS_A} fill={`url(#${id}ray)`} />
      </g>
      <circle cx={C} cy={C} r="17" fill={`url(#${id}core)`} />
      <circle cx={C} cy={C} r="17.3" fill="none" stroke="#FFF3C8" strokeOpacity=".6" strokeWidth=".8" />
    </g>
  );
}

/** Supernova: brilliant core inside a faint remnant; shockwave rings loop outward and fade. */
function Supernova({ id }: BodyProps) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}core`}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".25" stopColor="#FFFFFF" />
          <stop offset=".5" stopColor="#FFE3F5" stopOpacity=".85" />
          <stop offset="1" stopColor="#C9A8FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}rem`}>
          <stop offset=".42" stopColor="#FF9BE0" stopOpacity="0" />
          <stop offset=".62" stopColor="#FF9BE0" stopOpacity=".15" />
          <stop offset=".8" stopColor="#8FE3FF" stopOpacity=".1" />
          <stop offset="1" stopColor="#8FE3FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}sw`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD1EF" />
          <stop offset=".5" stopColor="#C2AEFF" />
          <stop offset="1" stopColor="#8FE3FF" />
        </linearGradient>
      </defs>
      <circle cx={C} cy={C} r="40" fill={`url(#${id}rem)`} />
      {[1, 2, 3].map((n) => (
        <g key={n} className={`le-anim le-shock le-shock-${n} le-fb`}>
          <circle cx={C} cy={C} r="28" fill="none" stroke={`url(#${id}sw)`} strokeWidth="1.3" />
        </g>
      ))}
      {[
        [36, 46, "#FFB8E6"],
        [84, 52, "#8FE3FF"],
        [77, 83, "#C2AEFF"],
        [41, 79, "#8FE3FF"],
        [62, 31, "#FFD1EF"],
      ].map(([x, y, c]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r=".9" fill={c as string} fillOpacity=".6" />
      ))}
      <g className="le-anim le-flare le-fb">
        <circle cx={C} cy={C} r="18" fill={`url(#${id}core)`} />
      </g>
      <circle cx={C} cy={C} r="3.6" fill="#FFFFFF" />
    </g>
  );
}

/** Galáctica: a tilted two-armed spiral of star dust turning slowly around a bright core. */
function Galactica({ id }: BodyProps) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}halo`}>
          <stop offset="0" stopColor="#8B7BFF" stopOpacity=".26" />
          <stop offset=".6" stopColor="#8B7BFF" stopOpacity=".08" />
          <stop offset="1" stopColor="#8B7BFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}disc`}>
          <stop offset="0" stopColor="#D6CBFF" stopOpacity=".3" />
          <stop offset="1" stopColor="#D6CBFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}arm`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="44">
          <stop offset="0" stopColor="#F6EFFF" stopOpacity=".95" />
          <stop offset=".45" stopColor="#BDA8FF" stopOpacity=".6" />
          <stop offset="1" stopColor="#7B8CFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}core`}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".3" stopColor="#FFF0D6" stopOpacity=".85" />
          <stop offset="1" stopColor="#D6C4FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r="52" fill={`url(#${id}halo)`} />
      {[
        [26, 40],
        [95, 45],
        [88, 93],
        [31, 87],
      ].map(([x, y], i) => (
        <g key={i} className={`le-anim le-twinkle le-twinkle-${i + 1}`}>
          <circle cx={x} cy={y} r=".9" fill="#FFFFFF" />
        </g>
      ))}
      <g transform={`translate(${C} ${C}) rotate(-22) scale(1 .66)`}>
        <g className="le-anim le-galaxy le-o0">
          <circle r="46" fill={`url(#${id}disc)`} />
          {GALAXY.arms.map((d) => (
            <g key={d} fill="none" stroke={`url(#${id}arm)`} strokeLinecap="round" strokeLinejoin="round">
              <path d={d} strokeWidth="9" strokeOpacity=".26" />
              <path d={d} strokeWidth="2.6" strokeOpacity=".85" />
            </g>
          ))}
          {GALAXY.stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.c} fillOpacity={s.o} />
          ))}
        </g>
        <circle r="13" fill={`url(#${id}core)`} />
      </g>
      <g className="le-anim le-flare le-flare-slow le-fb">
        <circle cx={C} cy={C} r="6" fill={`url(#${id}core)`} />
      </g>
      <circle cx={C} cy={C} r="2.6" fill="#FFFFFF" />
    </g>
  );
}

const BODIES: Record<LeagueFamily, (p: BodyProps) => ReactNode> = {
  asteroide: Asteroide,
  cometa: Cometa,
  luna: Luna,
  mercurio: Mercurio,
  marte: Marte,
  tierra: Tierra,
  neptuno: Neptuno,
  saturno: Saturno,
  jupiter: Jupiter,
  sol: Sol,
  supernova: Supernova,
  galactica: Galactica,
};

/** Accessible name, e.g. "Liga Saturno II" or "Liga Galáctica". */
export function leagueLabel(family: LeagueFamily, division?: LeagueDivision | null) {
  return `Liga ${LEAGUE_DISPLAY[family]}${division ? ` ${ROMAN[division]}` : ""}`;
}

/** Pause loops while the emblem is off-screen (lists of emblems shouldn't all animate). */
function useOnScreen(ref: React.RefObject<Element>, enabled: boolean) {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "64px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);
  return onScreen;
}

export function LeagueEmblem({
  family,
  division = null,
  size = 96,
  locked = false,
  animated = true,
  className,
}: {
  family: LeagueFamily;
  division?: LeagueDivision | null;
  size?: number;
  locked?: boolean;
  animated?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const wantsMotion = animated && !locked;
  const onScreen = useOnScreen(ref, wantsMotion);
  const Body = BODIES[family];
  const label = `${leagueLabel(family, division)}${locked ? ", bloqueada" : ""}`;

  return (
    <svg
      ref={ref}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={cn("le-emblem", (!wantsMotion || !onScreen) && "le-paused", locked && "le-locked", className)}
    >
      <defs>
        <radialGradient id={`${id}st`}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".3" stopColor={ACCENT[family]} stopOpacity=".6" />
          <stop offset="1" stopColor={ACCENT[family]} stopOpacity="0" />
        </radialGradient>
        {/* Half-planes in a tilted frame's own space: y < 0 is the far side, y ≥ 0 the near side. */}
        <clipPath id={`${id}back`}>
          <rect x="-200" y="-200" width="400" height="200" />
        </clipPath>
        <clipPath id={`${id}front`}>
          <rect x="-200" y="0" width="400" height="200" />
        </clipPath>
      </defs>
      <Glass id={id} accent={ACCENT[family]} crown={family === "galactica"} />
      {division && <Orbit id={id} division={division} half="back" />}
      <Body id={id} />
      {division && <Orbit id={id} division={division} half="front" />}
    </svg>
  );
}

export default LeagueEmblem;
