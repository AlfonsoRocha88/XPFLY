import { Application, Container, Graphics, Particle, ParticleContainer, Rectangle, Sprite, Texture } from "pixi.js";
import type { ConstellationId } from "@shared/achievements";
import { SHAPES, WORLD, shapeBounds } from "./layout";

export interface StarState {
  tier: 0 | 1 | 2 | 3;
  /** A tier is reached but not claimed yet. */
  ready: boolean;
}
export type GalaxyState = Partial<Record<ConstellationId, StarState[]>>;
export interface Camera { x: number; y: number; zoom: number }

const TIER_COLOR = [0x9fb0d0, 0xf0b07a, 0xe6eef7, 0xffe07a];
const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

/** Soft round glow used for every star point (a rendering primitive, drawn once). */
function glowTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.22)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return Texture.from(c);
}

function streakTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 6;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.85, "rgba(220,235,255,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = grad;
  g.fillRect(0, 1, 256, 4);
  return Texture.from(c);
}

/**
 * WebGL layer of the Logros galaxy: twinkling stars, constellations that light up per claimed
 * tier, shooting stars and a camera that flies between the overview and one constellation.
 * The canvas is transparent; the painted night sky lives in CSS underneath.
 */
export class GalaxyEngine {
  app = new Application();
  private world = new Container();
  private stars!: ParticleContainer;
  private twinkle: { base: number; speed: number; phase: number }[] = [];
  private groups = new Map<ConstellationId, Container>();
  private pulses: { sprite: Sprite; base: number }[] = [];
  private bursts: { s: Sprite; vx: number; vy: number; life: number; max: number }[] = [];
  private flashes: { s: Sprite; life: number; max: number; scale: number }[] = [];
  private glow!: Texture;
  private streak!: Texture;
  private state: GalaxyState = {};
  private focused: ConstellationId | null = null;
  private time = 0;
  private nextShooting = 2.5;
  private shooting: { s: Sprite; vx: number; vy: number; life: number }[] = [];
  private tween: { from: Camera; to: Camera; t: number; dur: number; done?: () => void } | null = null;
  cam: Camera = { x: WORLD.width / 2, y: WORLD.height / 2, zoom: 1 };
  reduceMotion = false;
  onCamera?: (cam: Camera, overview: Camera) => void;
  private destroyed = false;

  async init(el: HTMLElement) {
    this.reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    await this.app.init({
      resizeTo: el,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: "high-performance",
    });
    if (this.destroyed) return;
    el.appendChild(this.app.canvas);
    this.glow = glowTexture();
    this.streak = streakTexture();
    this.app.stage.addChild(this.world);
    this.buildStarfield();
    this.cam = this.overviewCamera();
    this.renderState();
    this.applyCamera();
    this.app.renderer.on("resize", () => {
      if (this.tween) return;
      this.cam = this.focused ? this.focusCamera(this.focused) : this.overviewCamera();
      this.applyCamera();
    });
    this.app.ticker.add((t) => this.tick(t.deltaMS / 1000));
  }

  private buildStarfield() {
    const area = new Rectangle(-300, -300, WORLD.width + 600, WORLD.height + 600);
    this.stars = new ParticleContainer({ texture: this.glow, boundsArea: area, dynamicProperties: { position: false, color: true, vertex: false } });
    for (let i = 0; i < 460; i++) {
      const size = Math.random() < 0.07 ? 0.15 + Math.random() * 0.1 : 0.035 + Math.random() * 0.06;
      const base = 0.3 + Math.random() * 0.6;
      const tint = [0xffffff, 0xcfe3ff, 0xffe9d6, 0xd9d2ff][Math.floor(Math.random() * 4)];
      this.stars.addParticle(new Particle({ texture: this.glow, x: area.x + Math.random() * area.width, y: area.y + Math.random() * area.height, scaleX: size, scaleY: size, anchorX: 0.5, anchorY: 0.5, tint, alpha: base }));
      this.twinkle.push({ base, speed: 0.6 + Math.random() * 2.2, phase: Math.random() * Math.PI * 2 });
    }
    this.stars.blendMode = "add";
    this.world.addChild(this.stars);
  }

  setState(state: GalaxyState) {
    this.state = state;
    if (this.app.renderer) this.renderState();
  }

  /** Draw every constellation: dim outline when off, warm lines and stars as tiers are claimed. */
  private renderState() {
    this.pulses = [];
    for (const [id, shape] of Object.entries(SHAPES) as [ConstellationId, (typeof SHAPES)[ConstellationId]][]) {
      this.groups.get(id)?.destroy({ children: true });
      const states = this.state[id] ?? shape.stars.map(() => ({ tier: 0 as const, ready: false }));
      const group = new Container({ label: id });
      group.alpha = this.focused && this.focused !== id ? 0.22 : 1;
      const [cx, cy] = shape.center;
      const complete = states.length > 0 && states.every((s) => s.tier === 3);
      const lit = states.filter((s) => s.tier > 0).length / Math.max(1, states.length);

      if (lit > 0) {
        const aura = new Sprite({ texture: this.glow, anchor: 0.5, x: cx, y: cy, tint: shape.glow, blendMode: "add" });
        aura.scale.set((complete ? 5.4 : 3.2) * (0.6 + 0.4 * lit));
        aura.alpha = complete ? 0.34 : 0.1 + 0.12 * lit;
        group.addChild(aura);
      }

      const lines = new Graphics();
      for (const [a, b] of shape.edges) {
        const [ax, ay] = shape.stars[a];
        const [bx, by] = shape.stars[b];
        const on = (states[a]?.tier ?? 0) > 0 && (states[b]?.tier ?? 0) > 0;
        lines.moveTo(cx + ax, cy + ay).lineTo(cx + bx, cy + by).stroke({ width: on ? 8 : 2.6, color: on ? shape.glow : 0xc4ceff, alpha: on ? 0.18 : 0.3, cap: "round" });
        if (on) lines.moveTo(cx + ax, cy + ay).lineTo(cx + bx, cy + by).stroke({ width: 2.4, color: 0xfff4dc, alpha: complete ? 0.95 : 0.72, cap: "round" });
      }
      lines.blendMode = "add";
      group.addChild(lines);

      shape.stars.forEach(([sx, sy], i) => {
        const st = states[i] ?? { tier: 0, ready: false };
        const halo = new Sprite({ texture: this.glow, anchor: 0.5, x: cx + sx, y: cy + sy, tint: st.tier ? TIER_COLOR[st.tier] : 0x8fa2d8, blendMode: "add" });
        halo.scale.set(st.tier ? 0.6 + st.tier * 0.2 : 0.42);
        halo.alpha = st.tier ? 0.85 : 0.5;
        const core = new Sprite({ texture: this.glow, anchor: 0.5, x: cx + sx, y: cy + sy, tint: 0xffffff, blendMode: "add" });
        core.scale.set(st.tier ? 0.17 + st.tier * 0.03 : 0.1);
        core.alpha = st.tier ? 1 : 0.6;
        group.addChild(halo, core);
        if (st.ready) {
          const ring = new Sprite({ texture: this.glow, anchor: 0.5, x: cx + sx, y: cy + sy, tint: 0xffd76a, blendMode: "add" });
          group.addChild(ring);
          this.pulses.push({ sprite: ring, base: 1.15 });
        }
      });
      this.world.addChild(group);
      this.groups.set(id, group);
    }
  }

  // ---------------- Camera ----------------
  /** Screen space covered by the app's own chrome (section header above, tab bar below), in px. */
  insets = { top: 0, bottom: 0 };
  setInsets(top: number, bottom: number) {
    if (top === this.insets.top && bottom === this.insets.bottom) return;
    this.insets = { top, bottom };
    if (!this.app.renderer || this.tween) return;
    this.cam = this.focused ? this.focusCamera(this.focused) : this.overviewCamera();
    this.applyCamera();
  }

  /** Whole galaxy, framed between the summary bar (below the header) and the tab bar. */
  overviewCamera(): Camera {
    const { width: W, height: H } = this.app.screen;
    const top = this.insets.top + 78;
    const bottom = this.insets.bottom + 40;
    const zoom = Math.min(W / WORLD.width, (H - top - bottom) / WORLD.height) * 0.97;
    return { x: WORLD.width / 2, y: WORLD.height / 2 - (top - bottom) / 2 / zoom, zoom };
  }

  /** Frame one constellation between the title row and the glass list panel (40% of the free space). */
  focusCamera(id: ConstellationId): Camera {
    const { width: W, height: H } = this.app.screen;
    const b = shapeBounds(SHAPES[id], 70);
    const free = H - this.insets.top - this.insets.bottom;
    const topPx = this.insets.top + 64;
    const bottomPx = this.insets.bottom + free * 0.4 + 12;
    const usableH = H - topPx - bottomPx;
    const zoom = Math.min(W / b.w, usableH / b.h, 3.2);
    const centerScreenY = topPx + usableH / 2;
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 + (H / 2 - centerScreenY) / zoom, zoom };
  }

  /** Fly to a constellation (or back to the overview with null). */
  focus(id: ConstellationId | null, done?: () => void) {
    this.focused = id;
    const to = id ? this.focusCamera(id) : this.overviewCamera();
    if (this.reduceMotion) {
      this.cam = to;
      for (const [gid, g] of this.groups) g.alpha = id && gid !== id ? 0.22 : 1;
      this.applyCamera();
      done?.();
      return;
    }
    this.tween = { from: { ...this.cam }, to, t: 0, dur: id ? 1.15 : 0.95, done };
  }

  worldToScreen(x: number, y: number) {
    const { width: W, height: H } = this.app.screen;
    return { x: W / 2 + (x - this.cam.x) * this.cam.zoom, y: H / 2 + (y - this.cam.y) * this.cam.zoom };
  }

  /** Light burst when a whole constellation is completed in gold. */
  celebrate(id: ConstellationId) {
    if (this.reduceMotion) return;
    const s = SHAPES[id];
    const [cx, cy] = s.center;
    const flash = new Sprite({ texture: this.glow, anchor: 0.5, x: cx, y: cy, tint: s.glow, blendMode: "add" });
    this.world.addChild(flash);
    this.flashes.push({ s: flash, life: 1.6, max: 1.6, scale: 9 });
    for (const [sx, sy] of s.stars) {
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 60 + Math.random() * 140;
        const p = new Sprite({ texture: this.glow, anchor: 0.5, x: cx + sx, y: cy + sy, tint: i % 2 ? 0xffe07a : 0xffffff, blendMode: "add" });
        p.scale.set(0.08 + Math.random() * 0.08);
        this.world.addChild(p);
        this.bursts.push({ s: p, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2 + Math.random() * 0.6, max: 1.8 });
      }
    }
  }

  private applyCamera() {
    const { width: W, height: H } = this.app.screen;
    const { x, y, zoom } = this.cam;
    this.world.scale.set(zoom);
    this.world.position.set(W / 2 - x * zoom, H / 2 - y * zoom);
    this.onCamera?.(this.cam, this.overviewCamera());
  }

  private tick(dt: number) {
    this.time += dt;
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = easeInOutQuart(tw.t);
      // Zoom interpolates in log space so the move feels even from far to near.
      this.cam = {
        x: tw.from.x + (tw.to.x - tw.from.x) * k,
        y: tw.from.y + (tw.to.y - tw.from.y) * k,
        zoom: Math.exp(Math.log(tw.from.zoom) + (Math.log(tw.to.zoom) - Math.log(tw.from.zoom)) * k),
      };
      for (const [gid, g] of this.groups) {
        const target = this.focused && gid !== this.focused ? 0.22 : 1;
        g.alpha += (target - g.alpha) * Math.min(1, dt * 6);
      }
      if (tw.t >= 1) {
        this.tween = null;
        tw.done?.();
      }
      this.applyCamera();
    }
    if (this.reduceMotion) return;

    const ps = this.stars.particleChildren as Particle[];
    for (let i = 0; i < ps.length; i++) {
      const tw = this.twinkle[i];
      ps[i].alpha = tw.base * (0.55 + 0.45 * Math.sin(this.time * tw.speed + tw.phase));
    }
    for (const p of this.pulses) {
      const k = (this.time * 0.8) % 1;
      p.sprite.scale.set(p.base * (0.8 + k * 0.9));
      p.sprite.alpha = 0.7 * (1 - k);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      const k = 1 - f.life / f.max;
      f.s.scale.set(f.scale * (0.3 + k));
      f.s.alpha = 0.6 * (1 - k);
      if (f.life <= 0) { f.s.destroy(); this.flashes.splice(i, 1); }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      b.s.x += b.vx * dt;
      b.s.y += b.vy * dt;
      b.vx *= 0.97;
      b.vy *= 0.97;
      b.s.alpha = Math.max(0, b.life / b.max);
      if (b.life <= 0) { b.s.destroy(); this.bursts.splice(i, 1); }
    }
    this.nextShooting -= dt;
    if (this.nextShooting <= 0) {
      this.spawnShootingStar();
      this.nextShooting = 4 + Math.random() * 6;
    }
    for (let i = this.shooting.length - 1; i >= 0; i--) {
      const s = this.shooting[i];
      s.life -= dt;
      s.s.x += s.vx * dt;
      s.s.y += s.vy * dt;
      s.s.alpha = Math.max(0, Math.min(1, s.life * 2));
      if (s.life <= 0) { s.s.destroy(); this.shooting.splice(i, 1); }
    }
  }

  private spawnShootingStar() {
    const { width: W, height: H } = this.app.screen;
    const angle = (20 + Math.random() * 25) * (Math.PI / 180);
    const speed = 650 + Math.random() * 400;
    const s = new Sprite({ texture: this.streak, anchor: { x: 1, y: 0.5 }, blendMode: "add" });
    s.rotation = angle;
    s.scale.set(0.5 + Math.random() * 0.6, 0.8);
    s.position.set(Math.random() * W * 0.7, Math.random() * H * 0.45);
    this.app.stage.addChild(s);
    this.shooting.push({ s, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.9 + Math.random() * 0.4 });
  }

  destroy() {
    this.destroyed = true;
    try {
      this.app.destroy({ removeView: true }, { children: true });
    } catch {
      /* not initialised yet */
    }
  }
}
