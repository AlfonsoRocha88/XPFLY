/** Luciérnagas (rare): a twilight meadow — layered hills, round trees, tall grass in silhouette — with
 *  glowing fireflies drifting and blinking. Taps call nearby fireflies to gather around the finger;
 *  a celebration pulls the whole swarm in and lets it burst outward in light. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, burst, calm, clamp, env, glow, makeLayer, mix, previewOf, rand, ridge, ridgeAt, rng, scaleOf, stars, vgrad, vignette,
} from "./shared";

const PAL = {
  dark: { sky: ["#0a1230", "#1c2a57", "#4a4f7a"], dusk: "#ff9d6b", moon: "#fff3cf", hills: ["#25335a", "#18233f", "#0d1526"], grass: "#070c17", fly: "#e8ff7a", core: "#fffde0", edge: "#02040b", star: "#ffffff" },
  light: { sky: ["#aab8e3", "#e7cfd6", "#f8cfa6"], dusk: "#ffb57a", moon: "#fffaf0", hills: ["#9aa6cc", "#7d86ad", "#5e6688"], grass: "#4a5070", fly: "#ffd23d", core: "#fff8d8", edge: "#7a7fa8", star: "#ffffff" },
};

const N = 42;

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, base: Layer, fore: Layer;
  const halo = glow(P.fly, 0.12, 64), core = glow(P.core, 0.4, 16);
  const fx = new Float32Array(N), fy = new Float32Array(N), fvx = new Float32Array(N), fvy = new Float32Array(N);
  const fa = new Float32Array(N), fph = new Float32Array(N), frt = new Float32Array(N), fsz = new Float32Array(N), fbright = new Float32Array(N);
  const NR = 16;
  const rx = new Float32Array(NR), rh = new Float32Array(NR), rp = new Float32Array(NR);
  const sparks = new Pool(70);
  let tx = 0, ty = 0, gather = 0, gatherAll = false, burstAt = -1;

  const build = () => {
    base = makeLayer(k, W, H, 1.5);
    const g = base.g;
    g.fillStyle = vgrad(g, 0, H, [0, P.sky[0], 0.45, P.sky[1], 0.7, P.sky[2], 1, P.sky[2]]);
    g.fillRect(0, 0, W, H);
    g.globalAlpha = dark ? 0.35 : 0.5;
    g.drawImage(glow(P.dusk, 0.35, 128), -W * 0.3, H * 0.45, W * 1.6, H * 0.4);
    g.globalAlpha = 1;
    stars(g, W, H * 0.5, Math.round(W * H / (dark ? 4200 : 16000)), 3, P.star, dark ? 0.8 : 0.5);
    // Moon with halo.
    const mx = W * 0.8, my = H * 0.13, mr = Math.min(W, H) * 0.05;
    g.globalAlpha = dark ? 0.5 : 0.6; blit(g, glow(P.moon, 0.2, 128), mx, my, mr * 5); g.globalAlpha = 1;
    g.fillStyle = P.moon; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
    g.fillStyle = mix(P.moon, P.sky[1], 0.25); g.beginPath(); g.arc(mx + mr * 0.3, my - mr * 0.2, mr * 0.22, 0, TAU); g.arc(mx - mr * 0.35, my + mr * 0.3, mr * 0.14, 0, TAU); g.fill();

    const far = mix(P.hills[0], P.sky[2], 0.3);
    ridge(g, W, H, { y: H * 0.7, amp: H * 0.1, seed: 2, scale: 300, fill: far, oct: 3 });
    const mid = ridge(g, W, H, { y: H * 0.8, amp: H * 0.08, seed: 6, scale: 220, fill: P.hills[1], oct: 3 });
    // Round trees on the mid hill (clusters of soft circles).
    const r = rng(8);
    g.fillStyle = P.hills[1];
    for (let i = 0; i < 7; i++) {
      const x = r() < 0.5 ? r() * W * 0.3 : W * 0.7 + r() * W * 0.3, by = ridgeAt(mid, x) + 2, s = H * (0.03 + r() * 0.035);
      g.fillRect(x - s * 0.06, by - s * 1.2, s * 0.12, s * 1.2);
      for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(x + (r() - 0.5) * s * 1.1, by - s * 1.3 - r() * s * 0.9, s * (0.45 + r() * 0.3), 0, TAU); g.fill(); }
    }
    g.fillStyle = vgrad(g, H * 0.72, H * 0.86, [0, "rgba(255,255,255,0)", 1, dark ? "rgba(120,140,200,.12)" : "rgba(255,255,255,.3)"]);
    g.fillRect(0, H * 0.72, W, H * 0.14);
    ridge(g, W, H, { y: H * 0.9, amp: H * 0.06, seed: 10, scale: 180, fill: P.hills[2], oct: 3 });
    calm(g, W, H, P.sky[1], dark ? 0.2 : 0.3, 0.4);

    // Foreground grass silhouettes.
    fore = makeLayer(k, W, H, 1.5);
    const f = fore.g, rg = rng(14);
    f.fillStyle = P.grass;
    f.beginPath();
    for (let i = 0; i < W / 3; i++) {
      const x = rg() * W, hh = H * (0.03 + rg() * 0.07) * (0.6 + 0.4 * Math.abs(Math.sin(x / W * 5))), lean = (rg() - 0.5) * hh * 0.6;
      f.moveTo(x - 2, H + 1); f.quadraticCurveTo(x + lean * 0.3, H - hh * 0.6, x + lean, H - hh); f.quadraticCurveTo(x + lean * 0.3 + 1, H - hh * 0.5, x + 2, H + 1);
    }
    f.fill();
    vignette(f, W, H, P.edge, dark ? 0.55 : 0.25, 0.5);

    for (let i = 0; i < NR; i++) { rx[i] = rg() * W; rh[i] = H * (0.09 + rg() * 0.08); rp[i] = rg() * TAU; }
    for (let i = 0; i < N; i++) {
      fx[i] = Math.random() * W; fy[i] = H * (0.35 + Math.random() * 0.6); fvx[i] = fvy[i] = 0;
      fa[i] = Math.random() * TAU; fph[i] = Math.random() * TAU; frt[i] = rand(0.6, 1.4); fsz[i] = rand(1.6, 2.8); fbright[i] = 0;
    }
  };
  build();

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      tx = x; ty = y; gather = big ? 1.6 : 3.5; gatherAll = big;
      if (big) burstAt = 0.9;
      else burst(sparks, x, y, 5, 40, 1, 1.6);
    },
    frame(dt, t) {
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);
      if (gather > 0) gather -= dt;
      if (burstAt > 0) {
        burstAt -= dt;
        if (burstAt <= 0) {
          for (let i = 0; i < N; i++) { const a = Math.atan2(fy[i] - ty, fx[i] - tx) + rand(-0.3, 0.3), s = rand(160, 320); fvx[i] = Math.cos(a) * s; fvy[i] = Math.sin(a) * s; fbright[i] = 1; }
          burst(sparks, tx, ty, 36, 240, 1.8, 2.6);
          gather = 0;
        }
      }

      // Reeds swaying in front of the far hills.
      ctx.strokeStyle = P.grass; ctx.fillStyle = P.grass; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < NR; i++) {
        const s = Math.sin(t * 0.8 + rp[i]) * rh[i] * 0.08;
        ctx.moveTo(rx[i], H + 2); ctx.quadraticCurveTo(rx[i] + s * 0.4, H - rh[i] * 0.5, rx[i] + s, H - rh[i]);
      }
      ctx.stroke();
      for (let i = 0; i < NR; i++) {
        const s = Math.sin(t * 0.8 + rp[i]) * rh[i] * 0.08;
        ctx.beginPath(); ctx.ellipse(rx[i] + s, H - rh[i] - 5, 2.2, 6, s * 0.03, 0, TAU); ctx.fill();
      }

      // Fireflies.
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      const reach = Math.max(W, H) * 0.45;
      for (let i = 0; i < N; i++) {
        fa[i] += (Math.sin(t * 0.7 + fph[i] * 3) * 1.6) * dt;
        let ax = Math.cos(fa[i]) * 14, ay = Math.sin(fa[i]) * 10;
        if (gather > 0) {
          const dx = tx - fx[i], dy = ty - fy[i], d = Math.hypot(dx, dy) || 1;
          if (gatherAll || d < reach) {
            const orbit = 34 + (i % 5) * 9;
            const pull = (d - orbit) / d;
            ax += dx * pull * 2.6 - dy / d * 40; ay += dy * pull * 2.6 + dx / d * 40;
          }
        } else {
          // Drift toward the lower part of the screen (the UI sits higher up).
          if (fy[i] < H * 0.4) ay += 12;
          if (fy[i] > H * 0.97) ay -= 20;
          if (fx[i] < 10) ax += 15; if (fx[i] > W - 10) ax -= 15;
        }
        const damp = Math.pow(0.35, dt);
        fvx[i] = fvx[i] * damp + ax * dt; fvy[i] = fvy[i] * damp + ay * dt;
        fx[i] += fvx[i] * dt; fy[i] += fvy[i] * dt;
        fbright[i] = Math.max(0, fbright[i] - dt * 0.8);
        const s = Math.sin(t * frt[i] + fph[i]);
        const b = clamp(0.15 + 0.85 * s * s * s * s + fbright[i] + (gather > 0 ? 0.3 : 0));
        ctx.globalAlpha = b * (dark ? 0.9 : 0.75);
        blit(ctx, halo, fx[i], fy[i], fsz[i] * 9);
        ctx.globalAlpha = b;
        blit(ctx, core, fx[i], fy[i], fsz[i] * 1.6);
      }
      for (const p of sparks.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        const f = Math.pow(0.08, dt);
        p.vx *= f; p.vy = p.vy * f - 8 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = env(q, 0.05, 0.6) * 0.9;
        blit(ctx, halo, p.x, p.y, p.size * 5);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
