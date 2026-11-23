/** Nebulosa (free, default): slow luminous gas clouds over a deep starfield, twinkling stars,
 *  the odd shooting star. Taps leave light trails; a celebration is a star burst with a shock ring. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, burst, env, glow, makeLayer, previewOf, radial, rand, rgba, rng, scaleOf, sparkle, stars, vignette,
} from "./shared";

const PAL = {
  dark: { sky: ["#090820", "#171040", "#0a0d26"], clouds: ["#8f5cff", "#3fa9ff", "#ff6ec7", "#5b4bff"], star: "#ffffff", spark: "#cfe3ff", ring: "#b9a8ff", edge: "#04040f", cloudA: 0.55 },
  light: { sky: ["#f3f1ff", "#e8e1fc", "#eef4ff"], clouds: ["#b49cff", "#8ccfff", "#ffb1dc", "#a5a0ff"], star: "#6d5bd0", spark: "#8b7bff", ring: "#8f7cf0", edge: "#c9c0f2", cloudA: 0.5 },
};

function cloudSprite(hex: string, seed: number, a: number): HTMLCanvasElement {
  const S = 256, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d") as Ctx, r = rng(seed);
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 9; i++) {
    const x = S / 2 + (r() - 0.5) * S * 0.45, y = S / 2 + (r() - 0.5) * S * 0.35, rad = S * (0.18 + r() * 0.22);
    g.fillStyle = radial(g, x, y, rad, [0, rgba(hex, a * (0.25 + r() * 0.2)), 0.5, rgba(hex, a * 0.1), 1, rgba(hex, 0)]);
    g.fillRect(0, 0, S, S);
  }
  return c;
}

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, base: Layer, fore: Layer;
  const clouds = P.clouds.map((c, i) => cloudSprite(c, 11 + i * 7, P.cloudA));
  const starSprite = glow(P.star, 0.12, 48), sparkSprite = glow(P.spark, 0.2, 48);
  const tw = new Pool(46), sparks = new Pool(140), rings = new Pool(8);
  let shoot = { on: false, x: 0, y: 0, a: 0, life: 0, next: 3 };
  const streak = (() => {
    const c = document.createElement("canvas"); c.width = 220; c.height = 6;
    const g = c.getContext("2d") as Ctx, gr = g.createLinearGradient(0, 0, 220, 0);
    gr.addColorStop(0, rgba(P.star, 0)); gr.addColorStop(1, rgba(P.star, 0.95));
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 3); g.lineTo(214, 0.6); g.arc(214, 3, 2.4, -Math.PI / 2, Math.PI / 2); g.lineTo(0, 3); g.fill();
    return c;
  })();

  const build = () => {
    base = makeLayer(k, W, H, 1.5);
    const g = base.g;
    const gr = g.createLinearGradient(0, 0, W * 0.35, H);
    gr.addColorStop(0, P.sky[0]); gr.addColorStop(0.55, P.sky[1]); gr.addColorStop(1, P.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // Milky band: a soft diagonal haze dusted with tiny stars.
    g.save(); g.translate(W / 2, H / 2); g.rotate(-0.5); g.scale(1, 0.22);
    g.fillStyle = radial(g, 0, 0, Math.max(W, H) * 0.8, [0, rgba(P.clouds[1], dark ? 0.12 : 0.1), 1, rgba(P.clouds[1], 0)]);
    g.fillRect(-W * 2, -H * 4, W * 4, H * 8); g.restore();
    stars(g, W, H, Math.round((W * H) / (dark ? 2600 : 5200)), 7, P.star, dark ? 0.85 : 0.35);
    fore = makeLayer(k, W, H, 1);
    vignette(fore.g, W, H, P.edge, dark ? 0.6 : 0.35, 0.45);
    tw.clear();
    for (let i = 0; i < tw.items.length; i++) {
      const p = tw.get();
      p.x = Math.random() * W; p.y = Math.random() * H; p.size = rand(1.2, 3.2) * Math.min(1, Math.max(0.4, Math.min(W, H) / 420)); p.a = rand(0.6, 2.2); p.b = rand(0, TAU);
    }
  };
  build();

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      burst(sparks, x, y, big ? 46 : 10, big ? 260 : 90, big ? 2 : 1.2, big ? 3.2 : 2.2);
      const r = rings.get(); r.x = x; r.y = y; r.max = big ? 1.4 : 0.8; r.size = big ? Math.min(W, H) * 0.45 : 60; r.kind = big ? 1 : 0;
    },
    frame(dt, t) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(base.c, 0, 0, W, H);
      // Drifting gas clouds.
      const M = Math.max(W, H);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (let i = 0; i < clouds.length; i++) {
        const sz = M * (0.95 + 0.15 * i);
        const cx = W * (0.22 + 0.56 * ((i * 0.37) % 1) + Math.sin(t * 0.045 + i * 2.1) * 0.07);
        const cy = H * (0.2 + 0.6 * ((i * 0.61) % 1) + Math.cos(t * 0.038 + i * 1.3) * 0.05);
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.2 + i);
        ctx.drawImage(clouds[i], cx - sz / 2, cy - sz / 2, sz, sz);
      }
      // Twinkling stars.
      for (const p of tw.items) {
        const v = 0.5 + 0.5 * Math.sin(t * p.a + p.b);
        ctx.globalAlpha = 0.25 + 0.75 * v * v;
        blit(ctx, starSprite, p.x, p.y, p.size * (2.5 + v));
      }
      ctx.globalCompositeOperation = "source-over";
      // Shooting star.
      if (dt > 0) {
        shoot.next -= dt;
        if (!shoot.on && shoot.next <= 0) shoot = { on: true, x: rand(W * 0.3, W * 1.1), y: rand(-20, H * 0.3), a: rand(2.4, 2.75), life: 0, next: rand(7, 14) };
        if (shoot.on) {
          shoot.life += dt;
          const q = shoot.life / 1.1;
          if (q >= 1) shoot.on = false;
          else {
            const d = q * Math.min(W, 700) * 0.9;
            ctx.save(); ctx.globalAlpha = Math.sin(q * Math.PI) * (dark ? 0.9 : 0.6);
            ctx.translate(shoot.x + Math.cos(shoot.a) * d, shoot.y + Math.sin(shoot.a) * d); ctx.rotate(shoot.a);
            ctx.drawImage(streak, -220, -3); ctx.restore();
          }
        }
      }
      // Tap trails and celebration.
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (const p of sparks.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        const f = Math.pow(0.04, dt);
        p.vx *= f; p.vy *= f; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = env(q, 0.05, 0.7);
        blit(ctx, sparkSprite, p.x, p.y, p.size * 3.2);
        if (p.size > 2.6) { ctx.fillStyle = P.star; sparkle(ctx, p.x, p.y, p.size * 2.2 * (1 - q)); }
      }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = P.ring;
      for (const r of rings.items) {
        if (!r.on) continue;
        r.life += dt;
        const q = r.life / r.max;
        if (q >= 1) { r.on = false; continue; }
        const e = 1 - (1 - q) * (1 - q) * (1 - q);
        ctx.globalAlpha = (1 - q) * (r.kind ? 0.8 : 0.5);
        ctx.beginPath(); ctx.arc(r.x, r.y, 4 + r.size * e, 0, TAU); ctx.stroke();
        if (r.kind) { ctx.fillStyle = P.star; ctx.globalAlpha = (1 - q); sparkle(ctx, r.x, r.y, 26 * Math.sin(Math.min(1, q * 2) * Math.PI) + 2); }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
