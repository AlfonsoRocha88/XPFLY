/**
 * Toolkit shared by the living scenes (its own small chunk). Everything here is either used at
 * build time (layers, ridges, trees, sprites — run on resize, never per frame) or is allocation-free
 * per frame (pools, sprite blits).
 */
import type { SceneInstance } from "../engine";

export type Ctx = CanvasRenderingContext2D;
export type Layer = { c: HTMLCanvasElement; g: Ctx };

export const TAU = Math.PI * 2;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);
export const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));

/** Deterministic random (mulberry32) so static layers look the same after every resize. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────── colour ───────── */
const hexCache = new Map<string, [number, number, number]>();
export function rgbOf(hex: string): [number, number, number] {
  let v = hexCache.get(hex);
  if (!v) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache.set(hex, v);
  }
  return v;
}
const hx = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
/** Blend two hex colours → hex. */
export function mix(a: string, b: string, t: number): string {
  const A = rgbOf(a), B = rgbOf(b);
  return `#${hx(lerp(A[0], B[0], t))}${hx(lerp(A[1], B[1], t))}${hx(lerp(A[2], B[2], t))}`;
}
export function rgba(hex: string, a: number) {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ───────── layers ───────── */
/** Backing-store scale of a context whose CSS width is `w`. */
export const scaleOf = (ctx: Ctx, w: number) => ctx.canvas.width / Math.max(1, w);

/** An offscreen canvas in CSS-pixel coordinates (scaled like the target, optionally capped). */
export function makeLayer(scale: number, w: number, h: number, maxScale = 2): Layer {
  const s = Math.max(0.25, Math.min(scale, maxScale));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w * s));
  c.height = Math.max(1, Math.ceil(h * s));
  const g = c.getContext("2d") as Ctx;
  g.setTransform(s, 0, 0, s, 0, 0);
  return { c, g };
}

/** Vertical gradient. `stops` = [offset, colour, offset, colour, …]. */
export function vgrad(g: Ctx, y0: number, y1: number, stops: (number | string)[]) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (let i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i] as number, stops[i + 1] as string);
  return gr;
}
export function radial(g: Ctx, x: number, y: number, r: number, stops: (number | string)[]) {
  const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
  for (let i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i] as number, stops[i + 1] as string);
  return gr;
}

/** Soft radial glow sprite (cached). Draw it with `blit` — far cheaper than shadowBlur. */
const spriteCache = new Map<string, HTMLCanvasElement>();
export function glow(hex: string, core = 0.18, size = 64): HTMLCanvasElement {
  const key = `${hex}|${core}|${size}`;
  let c = spriteCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d") as Ctx;
    const r = size / 2;
    g.fillStyle = radial(g, r, r, r, [0, rgba(hex, 1), core, rgba(hex, 0.55), 0.45, rgba(hex, 0.16), 1, rgba(hex, 0)]);
    g.fillRect(0, 0, size, size);
    spriteCache.set(key, c);
  }
  return c;
}
/** Draw a square sprite centred at x,y with radius r. */
export const blit = (ctx: Ctx, img: CanvasImageSource, x: number, y: number, r: number) => ctx.drawImage(img, x - r, y - r, r * 2, r * 2);

/** Cached sprite drawn by a callback (petals, hearts, flakes…). */
export function sprite(key: string, size: number, draw: (g: Ctx, s: number) => void): HTMLCanvasElement {
  let c = spriteCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = size;
    draw(c.getContext("2d") as Ctx, size);
    spriteCache.set(key, c);
  }
  return c;
}

/* ───────── noise & terrain ───────── */
/** Smooth 1-D value noise in [0,1]. */
export function noise1(seed: number) {
  const r = rng(seed), T = new Float32Array(256);
  for (let i = 0; i < 256; i++) T[i] = r();
  const n = (x: number) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(T[i & 255], T[(i + 1) & 255], u);
  };
  return (x: number, oct = 4) => {
    let s = 0, a = 0.5, fr = 1, norm = 0;
    for (let o = 0; o < oct; o++) { s += n(x * fr + o * 17.3) * a; norm += a; a *= 0.5; fr *= 2.03; }
    return s / norm;
  };
}

export interface RidgeOpts {
  y: number; amp: number; seed: number;
  /** Feature width in px. */
  scale: number;
  fill: string | CanvasGradient;
  oct?: number;
  /** Ridged noise: sharp peaks (mountains) instead of rolling hills. */
  sharp?: boolean;
  /** Extra shape multiplier per x (0..1 across). */
  shape?: (u: number) => number;
}
/** Fill a silhouette from a noisy skyline down to the bottom. Returns the heights (for placing things on it). */
export function ridge(g: Ctx, w: number, h: number, o: RidgeOpts): Float32Array {
  const nz = noise1(o.seed), step = 3, n = Math.ceil(w / step) + 2;
  const ys = new Float32Array(n);
  g.beginPath();
  g.moveTo(-2, h + 2);
  for (let i = 0; i < n; i++) {
    const x = i * step;
    let v = nz(x / o.scale, o.oct ?? 5);
    if (o.sharp) v = 1 - Math.abs(v * 2 - 1);
    const y = o.y - v * o.amp * (o.shape ? o.shape(x / w) : 1);
    ys[i] = y;
    g.lineTo(x, y);
  }
  g.lineTo(w + 2, h + 2);
  g.closePath();
  g.fillStyle = o.fill;
  g.fill();
  return ys;
}
/** Height of a ridge returned by `ridge` at x. */
export const ridgeAt = (ys: Float32Array, x: number) => ys[clamp(Math.round(x / 3), 0, ys.length - 1)];

/** A layered pine silhouette with drooping, slightly ragged tiers. */
export function pine(g: Ctx, x: number, base: number, ht: number, r: () => number) {
  const wd = ht * (0.3 + r() * 0.08);
  const tiers = 5 + Math.floor(r() * 3);
  const Y0 = base - ht, Y1 = base - ht * 0.09;
  g.fillRect(x - ht * 0.02, base - ht * 0.14, ht * 0.04, ht * 0.15);
  g.beginPath();
  for (let i = 0; i < tiers; i++) {
    const k = (i + 1) / tiers;
    const yt = Y0 + (Y1 - Y0) * (i / tiers) * 0.78;
    const yb = Y0 + (Y1 - Y0) * k;
    const hw = wd * (0.18 + 0.82 * k) * (0.9 + r() * 0.2);
    const d = (yb - yt) * 0.1;
    g.moveTo(x, yt);
    g.quadraticCurveTo(x - hw * 0.28, yt + (yb - yt) * 0.62, x - hw, yb + d * 0.4);
    g.lineTo(x - hw * 0.62, yb - d);
    g.lineTo(x - hw * 0.34, yb + d * 0.3);
    g.lineTo(x, yb - d * 0.6);
    g.lineTo(x + hw * 0.34, yb + d * 0.3);
    g.lineTo(x + hw * 0.62, yb - d);
    g.lineTo(x + hw, yb + d * 0.4);
    g.quadraticCurveTo(x + hw * 0.28, yt + (yb - yt) * 0.62, x, yt);
    g.closePath();
  }
  g.fill();
}

/** Darken / tint the edges so the middle (where the UI sits) stays calm. */
export function vignette(g: Ctx, w: number, h: number, hex: string, alpha: number, inner = 0.35) {
  const r = Math.hypot(w, h) * 0.6;
  g.fillStyle = radial(g, w / 2, h * 0.48, r, [inner, rgba(hex, 0), 1, rgba(hex, alpha)]);
  g.fillRect(0, 0, w, h);
}
/** A soft wash of the background colour over the content column. */
export function calm(g: Ctx, w: number, h: number, hex: string, alpha: number, cy = 0.45) {
  g.save();
  g.translate(w / 2, h * cy);
  g.scale(Math.min(w, 560) / 2, h * 0.42);
  g.fillStyle = radial(g, 0, 0, 1, [0, rgba(hex, alpha), 0.6, rgba(hex, alpha * 0.55), 1, rgba(hex, 0)]);
  g.fillRect(-1, -1, 2, 2);
  g.restore();
}

/** Bake a starfield (tiny dots + a few soft bright ones) into a layer region. */
export function stars(g: Ctx, w: number, h: number, count: number, seed: number, hex = "#ffffff", maxA = 0.9) {
  const r = rng(seed);
  g.fillStyle = hex;
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h, s = r();
    g.globalAlpha = (0.25 + 0.75 * r()) * maxA * (1 - (y / h) * 0.6);
    const rad = s > 0.97 ? 1.4 : s > 0.85 ? 0.95 : 0.6;
    g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

/* ───────── particles ───────── */
export interface Particle {
  on: boolean; x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; rot: number; vr: number; a: number; b: number; kind: number;
}
const blank = (): Particle => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, rot: 0, vr: 0, a: 0, b: 0, kind: 0 });

/** Fixed-size pool: no allocation after construction. `get()` recycles the oldest slot when full. */
export class Pool {
  items: Particle[];
  private cur = 0;
  constructor(n: number) { this.items = Array.from({ length: n }, blank); }
  get(): Particle {
    const it = this.items, n = it.length;
    for (let k = 0; k < n; k++) {
      const p = it[(this.cur + k) % n];
      if (!p.on) { this.cur = (this.cur + k + 1) % n; return reset(p); }
    }
    const p = it[this.cur]; this.cur = (this.cur + 1) % n; return reset(p);
  }
  clear() { for (const p of this.items) p.on = false; }
}
function reset(p: Particle) {
  p.on = true; p.life = 0; p.vx = p.vy = p.rot = p.vr = p.a = p.b = 0; p.kind = 0; p.max = 1; p.size = 1;
  return p;
}
/** Fade-in / fade-out envelope for a particle's life (0..1). */
export const env = (k: number, inn = 0.15, out = 0.35) => clamp(Math.min(k / inn, (1 - k) / out));

/** Radial spark burst helper used by several scenes. */
export function burst(pool: Pool, x: number, y: number, n: number, speed: number, life: number, size: number, up = 0) {
  for (let i = 0; i < n; i++) {
    const p = pool.get(), a = Math.random() * TAU, s = speed * (0.25 + Math.random() * 0.75);
    p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - up;
    p.max = life * (0.6 + Math.random() * 0.6); p.size = size * (0.5 + Math.random() * 0.8);
    p.rot = Math.random() * TAU; p.vr = rand(-4, 4); p.kind = 1;
  }
}

/** Simple four-point twinkle star path. */
export function sparkle(ctx: Ctx, x: number, y: number, r: number) {
  const q = r * 0.22;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + q, y - q, x + r, y);
  ctx.quadraticCurveTo(x + q, y + q, x, y + r); ctx.quadraticCurveTo(x - q, y + q, x - r, y);
  ctx.quadraticCurveTo(x - q, y - q, x, y - r);
  ctx.fill();
}

/** Build a `drawPreview` from a scene's `create`: one settled still frame. */
export const previewOf =
  (create: (ctx: Ctx, w: number, h: number, dark: boolean) => SceneInstance) =>
  (ctx: Ctx, w: number, h: number, dark = document.documentElement.classList.contains("dark")) => {
    create(ctx, w, h, dark).frame(0, 6);
  };
