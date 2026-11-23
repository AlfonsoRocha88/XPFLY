/** Nieve (rare): snowfall over layered pine forests fading into the haze, a little cabin with a warm
 *  window and a curl of chimney smoke. Flakes fall in three depths (parallax).
 *  Taps puff up a cloud of snow; a celebration makes a big puff with glinting ice sparkles. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, calm, env, glow, makeLayer, mix, pine, previewOf, rand, rgba, ridge, ridgeAt, rng, scaleOf, sparkle, sprite, vgrad, vignette,
} from "./shared";

const PAL = {
  light: { sky: ["#bccde6", "#dfe8f4", "#f1f5fa"], pines: ["#9fb1cb", "#7f93b2", "#5f7597", "#3f5577"], snow: ["#eef3fa", "#e3ebf6", "#d8e2f0"], flake: "#ffffff", flakeEdge: "#8ea4c4", win: "#ffc46b", smoke: "#ffffff", edge: "#90a3c2", glint: "#bfe3ff" },
  dark: { sky: ["#07101f", "#142440", "#2a3d5e"], pines: ["#22344f", "#1a2a42", "#122034", "#0b1626"], snow: ["#3b5071", "#30445f", "#253650"], flake: "#ffffff", flakeEdge: "#a9c3ec", win: "#ffb854", smoke: "#9fb3d1", edge: "#02050c", glint: "#cfeaff" },
};

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, base: Layer, fore: Layer, chimX = 0, chimY = 0;
  const flake = sprite(`nflake${dark}`, 32, (g, s) => {
    const c = s / 2;
    const gr = g.createRadialGradient(c, c, 0, c, c, c);
    gr.addColorStop(0, rgba(P.flake, 1)); gr.addColorStop(0.45, rgba(P.flake, 0.9)); gr.addColorStop(0.62, rgba(P.flakeEdge, 0.45)); gr.addColorStop(1, rgba(P.flakeEdge, 0));
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  const winGlow = glow(P.win, 0.25, 64), smokeS = glow(P.smoke, 0.3, 64);
  const NF = 130;
  const x = new Float32Array(NF), y = new Float32Array(NF), z = new Float32Array(NF), ph = new Float32Array(NF);
  const puffs = new Pool(120), smoke = new Pool(14), glints = new Pool(24);
  let smokeT = 0;

  const resetFlake = (i: number, init: boolean) => {
    z[i] = i < 70 ? 0 : i < 112 ? 1 : 2;
    x[i] = Math.random() * W; y[i] = init ? Math.random() * H : -10 - Math.random() * 40; ph[i] = Math.random() * TAU;
  };

  const build = () => {
    base = makeLayer(k, W, H, 1.5);
    const g = base.g;
    g.fillStyle = vgrad(g, 0, H, [0, P.sky[0], 0.5, P.sky[1], 1, P.sky[2]]);
    g.fillRect(0, 0, W, H);
    if (dark) { g.globalAlpha = 0.35; blit(g, glow("#cfe0ff", 0.2, 128), W * 0.22, H * 0.12, Math.min(W, H) * 0.35); g.globalAlpha = 1; }
    const r = rng(23);
    for (let L = 0; L < 4; L++) {
      const yb = H * (0.6 + L * 0.1), haze = 1 - L / 4;
      const col = mix(P.pines[L], P.sky[1], haze * 0.55);
      const snowCol = mix(P.snow[Math.min(2, L)], P.sky[1], haze * 0.4);
      const ys = ridge(g, W, H, { y: yb, amp: H * 0.05, seed: 40 + L, scale: 200 - L * 30, fill: snowCol, oct: 3 });
      g.fillStyle = col;
      const n = Math.round(W / (26 + L * 14));
      for (let i = 0; i < n; i++) {
        const px = (i + r()) * (W / n);
        if (L === 3 && px > W * 0.28 && px < W * 0.72) continue; // keep the foreground centre open
        const ht = H * (0.06 + L * 0.035) * (0.7 + r() * 0.6);
        pine(g, px, ridgeAt(ys, px) + 4, ht, r);
      }
      // Snow bank in front of each row.
      ridge(g, W, H, { y: yb + H * 0.03, amp: H * 0.025, seed: 60 + L, scale: 140, fill: snowCol, oct: 3 });
      if (L === 1) {
        // Cabin on the second ridge, right side.
        const cx = W * 0.74, cb = yb + H * 0.02, cw = Math.min(W, H) * 0.075, ch = cw * 0.6;
        g.fillStyle = mix(P.pines[2], P.sky[1], 0.25); g.fillRect(cx - cw / 2, cb - ch, cw, ch);
        g.fillStyle = snowCol; g.beginPath(); g.moveTo(cx - cw * 0.62, cb - ch); g.lineTo(cx, cb - ch - cw * 0.42); g.lineTo(cx + cw * 0.62, cb - ch); g.closePath(); g.fill();
        g.fillStyle = mix(P.pines[2], P.sky[1], 0.25); g.fillRect(cx + cw * 0.2, cb - ch - cw * 0.38, cw * 0.1, cw * 0.22);
        chimX = cx + cw * 0.25; chimY = cb - ch - cw * 0.4;
        g.globalAlpha = 0.8; blit(g, winGlow, cx - cw * 0.15, cb - ch * 0.5, cw * 0.7); g.globalAlpha = 1;
        g.fillStyle = P.win; g.fillRect(cx - cw * 0.26, cb - ch * 0.66, cw * 0.22, ch * 0.34);
      }
    }
    calm(g, W, H, P.sky[1], dark ? 0.25 : 0.4, 0.4);
    fore = makeLayer(k, W, H, 1);
    vignette(fore.g, W, H, P.edge, dark ? 0.55 : 0.25, 0.5);
    for (let i = 0; i < NF; i++) resetFlake(i, true);
    puffs.clear(); smoke.clear();
  };
  build();

  const SPEED = [26, 48, 80], SIZE = [1.6, 2.8, 5.2], ALPHA = [0.55, 0.85, 0.7];

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(px, py, big) {
      const n = big ? 60 : 18;
      for (let i = 0; i < n; i++) {
        const p = puffs.get(), a = rand(0, TAU), s = rand(20, big ? 240 : 110);
        p.x = px; p.y = py; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - (big ? 60 : 30);
        p.max = rand(1.8, big ? 3.6 : 2.6); p.size = rand(1.6, big ? 5 : 3.6); p.a = rand(0, TAU);
      }
      if (big) for (let i = 0; i < 14; i++) { const gl = glints.get(); gl.x = px + rand(-90, 90); gl.y = py + rand(-90, 90); gl.max = rand(0.6, 1.2); gl.life = -rand(0, 0.6); gl.size = rand(5, 11); }
    },
    frame(dt, t) {
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);
      const wind = Math.sin(t * 0.17) * 14 + Math.max(0, Math.sin(t * 0.07)) * 22;

      // Chimney smoke.
      smokeT -= dt;
      if (dt > 0 && smokeT <= 0) { smokeT = 0.55; const s = smoke.get(); s.x = chimX; s.y = chimY; s.vx = rand(4, 9); s.vy = rand(-14, -10); s.max = 5; s.size = 4; }
      for (const s of smoke.items) {
        if (!s.on) continue;
        s.life += dt;
        const q = s.life / s.max;
        if (q >= 1) { s.on = false; continue; }
        s.x += (s.vx + wind * 0.3) * dt; s.y += s.vy * dt;
        ctx.globalAlpha = env(q, 0.1, 0.8) * (dark ? 0.35 : 0.55);
        blit(ctx, smokeS, s.x + Math.sin(s.life * 1.3) * 4, s.y, s.size + q * 16);
      }

      // Flakes in three depths.
      for (let i = 0; i < NF; i++) {
        const d = z[i];
        y[i] += SPEED[d] * dt;
        x[i] += (wind * (0.4 + d * 0.3) + Math.sin(t * (0.8 + d * 0.2) + ph[i]) * (8 + d * 6)) * dt;
        if (y[i] > H + 10) resetFlake(i, false);
        if (x[i] > W + 10) x[i] -= W + 20; else if (x[i] < -10) x[i] += W + 20;
        ctx.globalAlpha = ALPHA[d];
        blit(ctx, flake, x[i], y[i], SIZE[d] * (0.8 + 0.4 * ((i * 0.618) % 1)));
      }

      // Tap puffs.
      for (const p of puffs.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        const f = Math.pow(0.04, dt);
        p.vx = p.vx * f + wind * 0.5 * dt; p.vy = p.vy * f + 70 * dt; // heavy drag + gravity: settles into a slow fall
        p.a += dt * 2;
        p.x += (p.vx + Math.sin(p.a) * 6) * dt; p.y += p.vy * dt;
        ctx.globalAlpha = env(q, 0.04, 0.5) * 0.9;
        blit(ctx, flake, p.x, p.y, p.size);
      }
      ctx.fillStyle = P.glint;
      for (const gl of glints.items) {
        if (!gl.on) continue;
        gl.life += dt;
        if (gl.life < 0) continue;
        const q = gl.life / gl.max;
        if (q >= 1) { gl.on = false; continue; }
        ctx.globalAlpha = Math.sin(q * Math.PI);
        sparkle(ctx, gl.x, gl.y, gl.size * Math.sin(q * Math.PI));
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
