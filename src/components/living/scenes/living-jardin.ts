/** Jardín (epic): a soft garden — rolling hills in atmospheric layers, vines swaying from the top,
 *  a meadow of grass and daisies breathing in the breeze, petals and leaves drifting, a pair of
 *  butterflies. Taps scatter petals; a celebration blooms a flower with a burst of petals. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, calm, env, glow, makeLayer, mix, previewOf, rand, rgba, ridge, rng, scaleOf, sprite, vgrad, vignette,
} from "./shared";

const PAL = {
  light: { sky: ["#eef8ff", "#f4fbf1", "#e4f3df"], hills: ["#cfe8cf", "#b2dbb2", "#94cc97"], sun: "#fff4c9", grassA: "#7fbf7a", grassB: "#5ea561", vine: "#5f9e62", leaf: "#7cbf73", petal: "#f7a8c6", petal2: "#ffd1e1", flower: "#ffffff", heart: "#ffd36b", edge: "#d9ecd6", bokeh: "#ffffff", wing: "#ffb36b" },
  dark: { sky: ["#0b1a16", "#10261e", "#0b1913"], hills: ["#163327", "#1b3d2d", "#1f4733"], sun: "#9fd8c0", grassA: "#2c5c3c", grassB: "#3c7a4e", vine: "#4f9a66", leaf: "#5fae73", petal: "#f39cc0", petal2: "#ffc3da", flower: "#f4f1ff", heart: "#ffe08a", edge: "#050d0a", bokeh: "#bdf5d6", wing: "#8fd6ff" },
};

function petalSprite(hex: string, hex2: string) {
  return sprite(`jpetal${hex}`, 48, (g, s) => {
    const gr = g.createLinearGradient(0, 0, s, s);
    gr.addColorStop(0, hex2); gr.addColorStop(1, hex);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(s * 0.5, s * 0.06);
    g.bezierCurveTo(s * 0.95, s * 0.25, s * 0.85, s * 0.8, s * 0.5, s * 0.94);
    g.bezierCurveTo(s * 0.15, s * 0.8, s * 0.05, s * 0.25, s * 0.5, s * 0.06);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = s * 0.03;
    g.beginPath(); g.moveTo(s * 0.5, s * 0.2); g.quadraticCurveTo(s * 0.55, s * 0.5, s * 0.5, s * 0.8); g.stroke();
  });
}
function leafSprite(hex: string) {
  return sprite(`jleaf${hex}`, 48, (g, s) => {
    g.fillStyle = hex;
    g.beginPath(); g.moveTo(s * 0.08, s * 0.5);
    g.quadraticCurveTo(s * 0.5, s * 0.08, s * 0.92, s * 0.5); g.quadraticCurveTo(s * 0.5, s * 0.92, s * 0.08, s * 0.5); g.fill();
    g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = s * 0.03;
    g.beginPath(); g.moveTo(s * 0.12, s * 0.5); g.lineTo(s * 0.88, s * 0.5); g.stroke();
  });
}
function daisySprite(petal: string, center: string) {
  return sprite(`jdaisy${petal}`, 96, (g, s) => {
    const c = s / 2;
    g.translate(c, c);
    for (let i = 0; i < 12; i++) {
      g.rotate(TAU / 12);
      g.fillStyle = i % 2 ? petal : mix(petal, "#ffd6e6", 0.35);
      g.beginPath(); g.ellipse(0, -s * 0.24, s * 0.085, s * 0.22, 0, 0, TAU); g.fill();
    }
    const gr = g.createRadialGradient(-s * 0.03, -s * 0.03, 0, 0, 0, s * 0.12);
    gr.addColorStop(0, "#fff3a8"); gr.addColorStop(1, center);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 0.11, 0, TAU); g.fill();
  });
}

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, base: Layer, fore: Layer;
  const petal = petalSprite(P.petal, P.petal2), leaf = leafSprite(P.leaf), daisy = daisySprite(P.flower, "#f2b23a");
  const bokeh = glow(P.bokeh, 0.5, 64), warm = glow(P.heart, 0.25, 64);
  const fall = new Pool(34), taps = new Pool(120), blooms = new Pool(4);
  // Meadow: blade params as typed arrays (no per-frame objects).
  const NB = 70;
  const bx = new Float32Array(NB), bh = new Float32Array(NB), bp = new Float32Array(NB), bl = new Uint8Array(NB);
  const NF = 7;
  const fx = new Float32Array(NF), fh = new Float32Array(NF), fs = new Float32Array(NF);
  const NV = 7;

  const spawnFall = (p = fall.get(), init = false) => {
    p.x = rand(-W * 0.1, W); p.y = init ? rand(-H * 0.1, H) : rand(-60, -10);
    p.vx = rand(8, 22); p.vy = rand(14, 30); p.max = rand(14, 24); p.life = init ? rand(0, p.max * 0.7) : 0;
    p.size = rand(5, 9); p.rot = rand(0, TAU); p.vr = rand(-1.2, 1.2); p.a = rand(0, TAU); p.kind = Math.random() < 0.65 ? 0 : 1;
  };

  const build = () => {
    base = makeLayer(k, W, H, 1.5);
    const g = base.g;
    g.fillStyle = vgrad(g, 0, H, [0, P.sky[0], 0.55, P.sky[1], 1, P.sky[2]]);
    g.fillRect(0, 0, W, H);
    // Soft sun / moon glow top right.
    g.drawImage(glow(P.sun, 0.3, 128), W * 0.55, -H * 0.15, W * 0.7, W * 0.7);
    const r = rng(5);
    for (let i = 0; i < 14; i++) {
      g.globalAlpha = (dark ? 0.12 : 0.35) * r();
      const rr = 10 + r() * 40;
      blit(g, bokeh, r() * W, H * (0.1 + r() * 0.5), rr);
    }
    g.globalAlpha = 1;
    const fog = dark ? P.sky[0] : "#ffffff";
    ridge(g, W, H, { y: H * 0.74, amp: H * 0.12, seed: 21, scale: 260, fill: P.hills[0], oct: 3 });
    g.fillStyle = vgrad(g, H * 0.6, H * 0.85, [0, rgba(fog, 0), 1, rgba(fog, dark ? 0.15 : 0.35)]); g.fillRect(0, H * 0.6, W, H * 0.4);
    ridge(g, W, H, { y: H * 0.82, amp: H * 0.1, seed: 33, scale: 200, fill: P.hills[1], oct: 3 });
    ridge(g, W, H, { y: H * 0.9, amp: H * 0.07, seed: 47, scale: 160, fill: P.hills[2], oct: 3 });
    calm(g, W, H, P.sky[1], dark ? 0.35 : 0.55);

    fore = makeLayer(k, W, H, 1);
    vignette(fore.g, W, H, P.edge, dark ? 0.55 : 0.25, 0.5);

    const rb = rng(9);
    for (let i = 0; i < NB; i++) { bx[i] = rb() * W; bh[i] = H * (0.035 + rb() * 0.075); bp[i] = rb() * TAU; bl[i] = rb() < 0.45 ? 0 : 1; }
    for (let i = 0; i < NF; i++) { fx[i] = W * ((i + 0.3 + rb() * 0.4) / NF); fh[i] = H * (0.07 + rb() * 0.07); fs[i] = Math.min(W, H) * (0.026 + rb() * 0.016); }
    fall.clear();
    for (let i = 0; i < 22; i++) spawnFall(fall.get(), true);
  };
  build();

  const drawBlades = (layer: number, t: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i < NB; i++) {
      if (bl[i] !== layer) continue;
      const x = bx[i], hh = bh[i] * (layer ? 1 : 1.25);
      const s = Math.sin(t * 1.3 + bp[i] + x * 0.01) * hh * 0.28 + wind * hh * 0.4;
      ctx.moveTo(x - 2.2, H + 2);
      ctx.quadraticCurveTo(x + s * 0.3, H - hh * 0.55, x + s, H - hh);
      ctx.quadraticCurveTo(x + s * 0.3 + 1, H - hh * 0.5, x + 2.2, H + 2);
    }
    ctx.fill();
  };
  let wind = 0;

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      const n = big ? 34 : 7;
      for (let i = 0; i < n; i++) {
        const p = taps.get(), a = rand(0, TAU), s = rand(40, big ? 230 : 95);
        p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - 40; p.max = rand(1.4, big ? 3 : 2.2);
        p.size = rand(4, big ? 9 : 6.5); p.rot = rand(0, TAU); p.vr = rand(-5, 5); p.a = rand(0, TAU); p.kind = big && Math.random() < 0.3 ? 1 : 0;
      }
      if (big) { const b = blooms.get(); b.x = x; b.y = y; b.max = 2.2; b.size = Math.min(W, H) * 0.09; }
    },
    frame(dt, t) {
      wind = Math.sin(t * 0.21) * 0.5 + Math.sin(t * 0.53 + 1) * 0.3;
      const sc = k;
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);

      // Vines from the top edge.
      const vineLen = H * 0.16;
      ctx.lineCap = "round";
      for (let i = 0; i < NV; i++) {
        const x0 = (W / NV) * (i + 0.5) + (i % 2 ? 8 : -8);
        const len = vineLen * (0.6 + ((i * 37) % 10) / 14) * (i === 0 || i === NV - 1 ? 1.4 : i === 3 ? 0.55 : 1);
        const sway = Math.sin(t * 0.55 + i * 1.3) * 9 + wind * 6;
        ctx.strokeStyle = P.vine; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, -4); ctx.quadraticCurveTo(x0 + sway * 0.4, len * 0.5, x0 + sway, len); ctx.stroke();
        for (let j = 1; j < 6; j++) {
          const q = j / 6, y = len * q, x = x0 + sway * q * q;
          ctx.save(); ctx.translate(x, y); ctx.rotate((j % 2 ? 0.7 : -0.7 + Math.PI) + Math.sin(t + j + i) * 0.12);
          ctx.drawImage(leaf, 0, -5, 15, 10); ctx.restore();
        }
        ctx.save(); ctx.translate(x0 + sway, len); ctx.rotate(Math.sin(t * 0.7 + i) * 0.3);
        ctx.drawImage(daisy, -9, -9, 18, 18); ctx.restore();
      }

      // Falling petals & leaves (tumbling: width follows a cosine so they flip in 3D).
      for (const p of fall.items) {
        if (!p.on) continue;
        p.life += dt;
        if (p.life >= p.max || p.y > H + 20) { spawnFall(p); continue; }
        p.a += dt * 2.2;
        p.x += (p.vx + wind * 25 + Math.sin(p.a * 0.7) * 10) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.globalAlpha = env(p.life / p.max, 0.08, 0.15) * 0.9;
        ctx.setTransform(sc, 0, 0, sc, 0, 0);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.a), 1);
        ctx.drawImage(p.kind ? leaf : petal, -p.size, -p.size, p.size * 2, p.size * 2);
      }
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      ctx.globalAlpha = 1;

      // Butterflies along the edges.
      for (let i = 0; i < 2; i++) {
        const bxp = W * (i ? 0.82 : 0.16) + Math.sin(t * 0.31 + i * 3) * W * 0.12;
        const byp = H * (i ? 0.62 : 0.3) + Math.sin(t * 0.47 + i) * H * 0.07;
        const flap = Math.abs(Math.sin(t * 9 + i * 2)) * 0.8 + 0.2, sz = Math.min(W, H) * 0.018;
        ctx.save(); ctx.translate(bxp, byp); ctx.rotate(Math.cos(t * 0.31 + i * 3) * 0.4);
        ctx.fillStyle = P.wing; ctx.globalAlpha = 0.85;
        for (let sdx = -1; sdx <= 1; sdx += 2) {
          ctx.beginPath(); ctx.ellipse(sdx * sz * flap * 0.9, -sz * 0.3, sz * flap, sz * 0.8, sdx * 0.5, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(sdx * sz * flap * 0.6, sz * 0.5, sz * flap * 0.6, sz * 0.5, sdx * -0.4, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = P.vine; ctx.fillRect(-0.8, -sz * 0.8, 1.6, sz * 1.6); ctx.restore();
      }

      // Meadow along the bottom.
      drawBlades(0, t, P.grassB);
      for (let i = 0; i < NF; i++) {
        const s = Math.sin(t * 1.1 + i * 1.7) * fh[i] * 0.12 + wind * fh[i] * 0.2;
        ctx.strokeStyle = P.grassB; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(fx[i], H + 2); ctx.quadraticCurveTo(fx[i] + s * 0.3, H - fh[i] * 0.5, fx[i] + s, H - fh[i]); ctx.stroke();
        ctx.save(); ctx.translate(fx[i] + s, H - fh[i]); ctx.rotate(s * 0.02);
        ctx.drawImage(daisy, -fs[i], -fs[i], fs[i] * 2, fs[i] * 2); ctx.restore();
      }
      drawBlades(1, t, P.grassA);

      // Tap petals.
      for (const p of taps.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        const f = Math.pow(0.25, dt);
        p.vx = p.vx * f + wind * 20 * dt; p.vy = p.vy * f + 50 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.a += dt * 6;
        ctx.globalAlpha = env(q, 0.05, 0.4);
        ctx.setTransform(sc, 0, 0, sc, 0, 0);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.a), 1);
        ctx.drawImage(p.kind ? daisy : petal, -p.size, -p.size, p.size * 2, p.size * 2);
      }
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      for (const b of blooms.items) {
        if (!b.on) continue;
        b.life += dt;
        const q = b.life / b.max;
        if (q >= 1) { b.on = false; continue; }
        const grow = 1 - Math.pow(1 - Math.min(1, q * 2.2), 3);
        ctx.globalAlpha = env(q, 0.02, 0.4) * 0.7;
        blit(ctx, warm, b.x, b.y, b.size * 2.4 * grow);
        ctx.globalAlpha = env(q, 0.02, 0.4);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(q * 1.2);
        ctx.drawImage(daisy, -b.size * grow, -b.size * grow, b.size * 2 * grow, b.size * 2 * grow); ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
