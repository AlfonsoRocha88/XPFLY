/**
 * Scene engine for the "living" backgrounds: one full-screen Canvas 2D loop that hosts a scene
 * module. The engine owns everything shared — pixel ratio (capped at 2), resize, pausing while the
 * app is hidden, pointer taps, the `xpfly:celebrate` burst at the last touch, light/dark changes and
 * prefers-reduced-motion (one static frame, no loop). Scenes only draw.
 *
 * Every scene lives in its own module under ./scenes and is loaded with a dynamic import(), so each
 * one is a separate chunk that only downloads when it is equipped (or previewed).
 */

export type LivingScene =
  | "living-nebulosa"
  | "living-jardin"
  | "living-oceano"
  | "living-lluvia"
  | "living-aurora"
  | "living-luciernagas"
  | "living-nieve"
  | "living-sakura"
  | "living-gatitos"
  | "living-retro"
  | "living-ciudad"
  | "living-bosque"
  | "living-synthwave";

/** A running scene. Coordinates are CSS pixels; the engine has already applied the pixel ratio. */
export interface SceneInstance {
  /** Draw one frame. `dt` in seconds (0 for a static frame), `t` = seconds since start. */
  frame(dt: number, t: number): void;
  /** Viewport changed: rebuild the pre-rendered static layers. */
  resize(w: number, h: number): void;
  /** A tap (`big` = a celebration at the last touch). */
  tap(x: number, y: number, big: boolean): void;
  /** Optional: the finger / pointer moved (scenes with things that follow it). */
  move?(x: number, y: number): void;
}

export interface SceneModule {
  create(ctx: CanvasRenderingContext2D, w: number, h: number, dark: boolean): SceneInstance;
  /** Paint a single representative frame (thumbnails). */
  drawPreview(ctx: CanvasRenderingContext2D, w: number, h: number, dark?: boolean): void;
}

/** Each entry is its own chunk. Keep the import paths literal so Vite can split them. */
export const SCENE_LOADERS: Record<LivingScene, () => Promise<SceneModule>> = {
  "living-nebulosa": () => import("./scenes/living-nebulosa"),
  "living-jardin": () => import("./scenes/living-jardin"),
  "living-oceano": () => import("./scenes/living-oceano"),
  "living-lluvia": () => import("./scenes/living-lluvia"),
  "living-aurora": () => import("./scenes/living-aurora"),
  "living-luciernagas": () => import("./scenes/living-luciernagas"),
  "living-nieve": () => import("./scenes/living-nieve"),
  "living-sakura": () => import("./scenes/living-sakura"),
  "living-gatitos": () => import("./scenes/living-gatitos"),
  "living-retro": () => import("./scenes/living-retro"),
  "living-ciudad": () => import("./scenes/living-ciudad"),
  "living-bosque": () => import("./scenes/living-bosque"),
  "living-synthwave": () => import("./scenes/living-synthwave"),
};

export const LIVING_SCENES = Object.keys(SCENE_LOADERS) as LivingScene[];

export const isLivingScene = (id: string | null | undefined): id is LivingScene =>
  !!id && Object.prototype.hasOwnProperty.call(SCENE_LOADERS, id);

const moduleCache = new Map<LivingScene, Promise<SceneModule>>();
export function loadScene(id: LivingScene): Promise<SceneModule> {
  let p = moduleCache.get(id);
  if (!p) {
    p = SCENE_LOADERS[id]();
    p.catch(() => moduleCache.delete(id));
    moduleCache.set(id, p);
  }
  return p;
}

/** The app toggles `.dark` on <html> (see useAppTheme). */
export const isDocDark = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

/** Time used for still frames (reduced motion, thumbnails): a moment where every scene looks settled. */
export const STILL_T = 6;

export interface RunOptions {
  /** Always the night palette (sign-in screens). */
  forceDark?: boolean;
  /** Size to an element instead of the window (gallery live view). */
  container?: HTMLElement | null;
  /** Listen for taps only inside this element instead of the whole window. */
  pointerTarget?: HTMLElement | null;
}

/** Start a scene on `canvas`. Returns a cleanup that stops the loop and removes every listener. */
export function runScene(canvas: HTMLCanvasElement, mod: SceneModule, opts: RunOptions = {}): () => void {
  const ctx = canvas.getContext("2d", { alpha: false }) ?? canvas.getContext("2d");
  if (!ctx) return () => {};
  const reduce = prefersReducedMotion();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const container = opts.container ?? null;
  let w = 1, h = 1, raf = 0, last = performance.now(), t = 0, needsResize = false, stopped = false;
  let lastX = 0, lastY = 0, originX = 0, originY = 0;
  const darkNow = () => !!opts.forceDark || isDocDark();
  let dark = darkNow();

  const measure = () => {
    if (container) {
      const r = container.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      originX = r.left; originY = r.top;
    } else {
      w = window.innerWidth; h = window.innerHeight; originX = 0; originY = 0;
    }
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  measure();
  lastX = w / 2; lastY = h * 0.6;
  let scene = mod.create(ctx, w, h, dark);

  const still = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene.frame(0, STILL_T);
  };

  const loop = (now: number) => {
    raf = 0;
    if (stopped) return;
    if (needsResize) { needsResize = false; measure(); scene.resize(w, h); }
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now; t += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene.frame(dt, t);
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (reduce) { still(); return; }
    if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  start();

  const onResize = () => {
    if (reduce) { measure(); scene.resize(w, h); still(); return; }
    needsResize = true; // coalesced into the next frame
  };
  const onPointer = (e: PointerEvent) => {
    lastX = e.clientX - originX; lastY = e.clientY - originY;
    if (reduce) return;
    scene.tap(lastX, lastY, false);
  };
  const onMove = (e: PointerEvent) => {
    if (reduce || !scene.move) return;
    scene.move(e.clientX - originX, e.clientY - originY);
  };
  const onCelebrate = () => { if (!reduce) scene.tap(lastX, lastY, true); };
  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start();
  };
  const themeObserver = new MutationObserver(() => {
    const d = darkNow();
    if (d === dark) return;
    dark = d;
    scene = mod.create(ctx, w, h, dark);
    if (reduce) still();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const ro = container ? new ResizeObserver(onResize) : null;
  ro?.observe(container as HTMLElement);

  const tapTarget: HTMLElement | Window = opts.pointerTarget ?? window;
  window.addEventListener("resize", onResize);
  tapTarget.addEventListener("pointerdown", onPointer as EventListener, { passive: true });
  tapTarget.addEventListener("pointermove", onMove as EventListener, { passive: true });
  window.addEventListener("xpfly:celebrate", onCelebrate);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    themeObserver.disconnect();
    ro?.disconnect();
    window.removeEventListener("resize", onResize);
    tapTarget.removeEventListener("pointerdown", onPointer as EventListener);
    tapTarget.removeEventListener("pointermove", onMove as EventListener);
    window.removeEventListener("xpfly:celebrate", onCelebrate);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** Paint a still preview of a scene into a canvas sized to its CSS box. */
export function paintPreview(canvas: HTMLCanvasElement, mod: SceneModule, dark: boolean) {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mod.drawPreview(ctx, w, h, dark);
}

/** Fire from anywhere when something worth celebrating happens (e.g. a task is completed). */
export const celebrateBackground = () => window.dispatchEvent(new Event("xpfly:celebrate"));
