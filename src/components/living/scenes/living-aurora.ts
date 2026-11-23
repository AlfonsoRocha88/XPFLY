/** Aurora (common): flowing curtains of light over a calm lake, mountains on the horizon, every
 *  ribbon mirrored in the water. Rendered at half resolution (it is all soft light anyway).
 *  Taps send a shimmer of light; a celebration makes the aurora flare and ripple from the touch. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, blit, burst, env, glow, makeLayer, mix, previewOf, rgba, ridge, scaleOf, sprite, stars, vgrad, vignette,
} from "./shared";

const PAL = {
  dark: { sky: ["#020817", "#0a1d38", "#14365a"], lake: ["#0c2340", "#030a17"], mtn: ["#0d1b30", "#07101e"], ribbon: ["#3dffb0", "#7d6bff", "#2fe0ff"], top: "#ff6ad5", star: "#ffffff", edge: "#01030a", shimmer: "#9ff7dd" },
  light: { sky: ["#c9d9f2", "#e3e9f6", "#f7e6ee"], lake: ["#d2ddef", "#aebdd9"], mtn: ["#8f9cc0", "#6f7ca3"], ribbon: ["#2bd9a0", "#9a7dff", "#33c6f0"], top: "#ff7fc6", star: "#7b83b8", edge: "#9aa6c9", shimmer: "#ffffff" },
};

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, HY = h * 0.68, base: Layer, mtn: Layer, aur: Layer, fore: Layer;
  const AS = 0.5; // aurora layer scale (CSS px → backing px)
  const strips = P.ribbon.map((c) => sprite(`astrip${c}${dark}`, 64, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, rgba(P.top, 0));
    gr.addColorStop(0.45, rgba(mix(P.top, c, 0.6), dark ? 0.25 : 0.2));
    gr.addColorStop(0.86, rgba(c, dark ? 0.85 : 0.6));
    gr.addColorStop(0.93, rgba(mix(c, "#ffffff", 0.4), dark ? 1 : 0.75));
    gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }));
  const spark = glow(P.ribbon[0], 0.2, 48);
  const sparks = new Pool(80), waves = new Pool(4);
  let flare = 0;

  const build = () => {
    HY = H * 0.68;
    base = makeLayer(k, W, H, 1.5);
    let g = base.g;
    g.fillStyle = vgrad(g, 0, HY, [0, P.sky[0], 0.6, P.sky[1], 1, P.sky[2]]);
    g.fillRect(0, 0, W, HY + 1);
    stars(g, W, HY * 0.9, Math.round((W * HY) / (dark ? 1800 : 6000)), 4, P.star, dark ? 0.9 : 0.4);
    g.fillStyle = vgrad(g, HY, H, [0, P.lake[0], 1, P.lake[1]]);
    g.fillRect(0, HY, W, H - HY);

    // Mountains + their reflection (static, drawn over the aurora's reflection).
    mtn = makeLayer(k, W, H, 1.5);
    g = mtn.g;
    const far = mix(P.mtn[0], P.sky[2], 0.45);
    const drawM = () => {
      ridge(g, W, H, { y: HY, amp: H * 0.14, seed: 12, scale: 170, fill: far, sharp: true, oct: 5, shape: (u) => 0.6 + 0.4 * Math.sin(u * 3.1) });
      ridge(g, W, H, { y: HY + 1, amp: H * 0.08, seed: 19, scale: 120, fill: P.mtn[0], sharp: true, oct: 5, shape: (u) => 1 - 0.7 * Math.sin(u * Math.PI) });
    };
    g.save(); g.beginPath(); g.rect(0, 0, W, HY + 1); g.clip(); drawM(); g.restore();
    g.save(); g.beginPath(); g.rect(0, HY, W, H - HY); g.clip();
    g.translate(0, HY * 2); g.scale(1, -1); g.globalAlpha = 0.75; drawM(); g.restore();
    g.globalAlpha = 1;
    // Water tint & fade so reflections sink into the lake.
    g.fillStyle = vgrad(g, HY, H, [0, rgba(P.lake[0], 0.15), 1, rgba(P.lake[1], 0.85)]);
    g.fillRect(0, HY, W, H - HY);
    g.fillStyle = rgba(P.shimmer, dark ? 0.25 : 0.6);
    g.fillRect(0, HY, W, 1);

    aur = makeLayer(AS, W, HY, AS);
    fore = makeLayer(k, W, H, 1);
    vignette(fore.g, W, H, P.edge, dark ? 0.55 : 0.25, 0.5);
  };
  build();

  const drawAurora = (t: number) => {
    const g = aur.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, aur.c.width, aur.c.height);
    g.setTransform(AS, 0, 0, AS, 0, 0);
    g.globalCompositeOperation = "lighter";
    const step = 6;
    for (let j = 0; j < 3; j++) {
      const by = HY * (0.32 + j * 0.13), amp = HY * 0.09, hh = HY * (0.3 - j * 0.05), sp = 0.05 + j * 0.02;
      for (let x = -20; x < W + 20; x += step) {
        const u = x / W;
        const y = by + Math.sin(u * 3.3 + t * sp + j * 2) * amp + Math.sin(u * 7.1 - t * sp * 1.7 + j) * amp * 0.35;
        let a = 0.35 + 0.35 * Math.sin(u * 5 + t * 0.35 + j * 1.7) + 0.3 * Math.sin(u * 13 - t * 0.6 + j);
        for (const wv of waves.items) if (wv.on) { const d = Math.abs(x - wv.x) - wv.life * W * 0.6; a += Math.max(0, 1 - Math.abs(d) / 60) * (1 - wv.life / wv.max) * 1.2; }
        a = Math.max(0, a) * (0.85 + flare * 0.8);
        if (a < 0.03) continue;
        const ht = hh * (0.6 + 0.4 * Math.sin(u * 9 + t * 0.21 + j));
        g.globalAlpha = Math.min(1, a) * (j === 1 ? 0.8 : 1);
        g.drawImage(strips[j], x, y - ht, step, ht * 1.08);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  };

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      burst(sparks, x, y, big ? 40 : 10, big ? 220 : 80, big ? 2 : 1.2, big ? 3 : 2);
      if (big) { flare = 1; const wv = waves.get(); wv.x = x; wv.max = 1.8; }
    },
    frame(dt, t) {
      flare = Math.max(0, flare - dt * 0.45);
      for (const wv of waves.items) if (wv.on) { wv.life += dt; if (wv.life >= wv.max) wv.on = false; }
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);
      drawAurora(t);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      ctx.drawImage(aur.c, 0, 0, W, HY);
      // Reflection, slightly squashed and dimmer.
      ctx.save();
      ctx.globalAlpha = dark ? 0.45 : 0.4;
      ctx.translate(0, HY * 2); ctx.scale(1, -1);
      ctx.drawImage(aur.c, 0, 0, W, HY);
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(mtn.c, 0, 0, W, H);

      // Lake shimmer.
      ctx.fillStyle = P.shimmer;
      for (let i = 0; i < 14; i++) {
        const yy = HY + 6 + ((i * 37) % 100) / 100 * (H - HY) * 0.8;
        const xx = ((i * 0.173 + t * 0.006 * (1 + (i % 3))) % 1) * (W + 80) - 40;
        ctx.globalAlpha = (dark ? 0.18 : 0.4) * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 2));
        ctx.fillRect(xx, yy, 18 + (i % 4) * 10, 1);
      }

      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (const p of sparks.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        const f = Math.pow(0.05, dt);
        p.vx *= f; p.vy = p.vy * f - 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = env(q, 0.05, 0.6);
        blit(ctx, spark, p.x, p.y, p.size * 3.5);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
