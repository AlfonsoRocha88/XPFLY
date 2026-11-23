/** Bosque encantado (legendary): a misty forest in depth — trunks fading into fog, drifting fog banks,
 *  god-rays through the canopy, glowing spores rising — and three light wisps that follow your finger.
 *  Celebration: the forest floor blooms with glowing flowers and the light swells. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, burst, calm, clamp, easeOut, env, glow, makeLayer, mix, previewOf, rand, rgba, rng, scaleOf, sprite, vgrad, vignette,
} from "./shared";

const PAL = {
  dark: { bg: ["#04121a", "#0a2a30", "#0f3a3a"], fog: "#2f6f74", trunks: ["#1a4648", "#123536", "#0b2425", "#040d0e"], ray: "#9ff5d8", rayA: 0.12, spore: "#b6ff9e", wisp: "#d6fff2", wispGlow: "#5fffd0", bloom: ["#7ef9ff", "#ff9cf0", "#c3ff7a"], fern: "#06201c", edge: "#010507" },
  light: { bg: ["#e9f3e6", "#cfe5d2", "#b9d8c2"], fog: "#ffffff", trunks: ["#b4cfbd", "#8fb39d", "#5f8670", "#2f4a3c"], ray: "#fff4c4", rayA: 0.34, spore: "#ffd75e", wisp: "#fff6d0", wispGlow: "#ffb92e", bloom: ["#7fd8ff", "#ff8fc8", "#ffd84a"], fern: "#3f6a4f", edge: "#8fae98" },
};

const NW = 3, TRAIL = 14;

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, base: Layer, mid: Layer, fore: Layer;
  const ray = sprite(`bray${dark}`, 128, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, rgba(P.ray, 1)); gr.addColorStop(0.7, rgba(P.ray, 0.35)); gr.addColorStop(1, rgba(P.ray, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(s * 0.44, 0); g.lineTo(s * 0.56, 0); g.lineTo(s * 0.95, s); g.lineTo(s * 0.05, s); g.closePath(); g.fill();
  });
  const fogS = glow(P.fog, 0.5, 128), sporeS = glow(P.spore, 0.25, 32), wispCore = glow(P.wisp, 0.35, 48), wispHalo = glow(P.wispGlow, 0.12, 64);
  const bloomS = P.bloom.map((c) => glow(c, 0.2, 64));
  const spores = new Pool(56), sparks = new Pool(80), blooms = new Pool(18);
  const wx = new Float32Array(NW), wy = new Float32Array(NW), wvx = new Float32Array(NW), wvy = new Float32Array(NW);
  const tx = new Float32Array(NW * TRAIL), ty = new Float32Array(NW * TRAIL);
  let head = 0, follow = 0, fx = 0, fy = 0, swell = 0, trailT = 0;

  const trunk = (g: Ctx, x: number, wd: number, top: number, bottom: number, col: string, hi: string | null, r: () => number) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x - wd * 0.42, top); g.lineTo(x + wd * 0.42, top);
    g.quadraticCurveTo(x + wd * 0.5, bottom - wd, x + wd * 1.1, bottom); g.lineTo(x - wd * 1.1, bottom);
    g.quadraticCurveTo(x - wd * 0.5, bottom - wd, x - wd * 0.42, top); g.fill();
    // Branch stubs.
    for (let i = 0; i < 2; i++) {
      const by = top + (bottom - top) * (0.15 + r() * 0.4), sd = r() < 0.5 ? -1 : 1;
      g.beginPath(); g.moveTo(x + sd * wd * 0.3, by); g.quadraticCurveTo(x + sd * wd * 1.4, by - wd * 0.6, x + sd * wd * 2.2, by - wd * 1.6);
      g.lineTo(x + sd * wd * 2.1, by - wd * 1.5); g.quadraticCurveTo(x + sd * wd * 1.2, by - wd * 0.2, x + sd * wd * 0.3, by + wd * 0.5); g.fill();
    }
    if (hi) { g.fillStyle = hi; g.fillRect(x + wd * 0.12, top, wd * 0.16, bottom - top - wd * 0.6); }
  };

  const build = () => {
    base = makeLayer(k, W, H, 1.5);
    let g = base.g;
    g.fillStyle = vgrad(g, 0, H, [0, P.bg[0], 0.5, P.bg[1], 1, P.bg[2]]);
    g.fillRect(0, 0, W, H);
    g.globalAlpha = dark ? 0.35 : 0.55; blit(g, glow(P.ray, 0.2, 128), W * 0.75, H * 0.05, Math.max(W, H) * 0.45); g.globalAlpha = 1;
    const r = rng(29), U = Math.min(W, H);
    for (let L = 0; L < 2; L++) {
      const n = Math.round(W / (L ? 60 : 40));
      for (let i = 0; i < n; i++) trunk(g, (i + r()) * (W / n), U * (0.018 + L * 0.012) * (0.8 + r() * 0.4), -10, H * (0.82 + L * 0.06), P.trunks[L], null, r);
      g.fillStyle = vgrad(g, 0, H, [0, rgba(P.fog, 0.05), 0.6, rgba(P.fog, dark ? 0.28 : 0.45), 1, rgba(P.fog, dark ? 0.15 : 0.35)]);
      g.fillRect(0, 0, W, H);
    }
    calm(g, W, H, P.bg[1], dark ? 0.25 : 0.4, 0.45);

    mid = makeLayer(k, W, H, 1.5);
    g = mid.g;
    const n2 = Math.max(3, Math.round(W / 110));
    for (let i = 0; i < n2; i++) {
      const x = (i + 0.2 + r() * 0.6) * (W / n2);
      if (x > W * 0.3 && x < W * 0.7 && r() < 0.6) continue;
      trunk(g, x, U * 0.045 * (0.8 + r() * 0.4), -10, H * 0.93, P.trunks[2], rgba("#ffffff", dark ? 0.03 : 0.08), r);
    }
    g.fillStyle = vgrad(g, H * 0.75, H, [0, rgba(P.fog, 0), 1, rgba(P.fog, dark ? 0.2 : 0.4)]);
    g.fillRect(0, H * 0.75, W, H * 0.25);

    fore = makeLayer(k, W, H, 1.5);
    g = fore.g;
    // Big near trunks framing the edges.
    trunk(g, -U * 0.02, U * 0.11, -10, H + 4, P.trunks[3], rgba("#ffffff", dark ? 0.04 : 0.1), r);
    trunk(g, W + U * 0.03, U * 0.13, -10, H + 4, P.trunks[3], null, r);
    // Ferns and undergrowth along the bottom.
    g.fillStyle = P.fern;
    for (let i = 0; i < W / 14; i++) {
      const x = r() * W, l = H * (0.05 + r() * 0.07) * (x > W * 0.3 && x < W * 0.7 ? 0.6 : 1), a = -Math.PI / 2 + (r() - 0.5) * 1.2;
      const ex = x + Math.cos(a) * l, ey = H + Math.sin(a) * l;
      g.beginPath(); g.moveTo(x - 3, H + 2); g.quadraticCurveTo((x + ex) / 2 + 8 * Math.cos(a + 1.5), (H + ey) / 2, ex, ey); g.quadraticCurveTo((x + ex) / 2 - 8 * Math.cos(a + 1.5), (H + ey) / 2, x + 3, H + 2); g.fill();
    }
    // Canopy leaves along the top.
    for (let i = 0; i < W / 10; i++) {
      const x = r() * W, y = r() * H * 0.06 * (x > W * 0.25 && x < W * 0.75 ? 0.6 : 1.6), s = U * (0.02 + r() * 0.03);
      g.fillStyle = mix(P.trunks[3], P.fern, r());
      g.beginPath(); g.ellipse(x, y, s * 1.4, s * 0.7, r() * 3, 0, TAU); g.fill();
    }
    vignette(g, W, H, P.edge, dark ? 0.6 : 0.3, 0.45);

    spores.clear();
    for (let i = 0; i < 40; i++) { const p = spores.get(); p.x = rand(0, W); p.y = rand(0, H); p.vy = rand(-6, -14); p.a = rand(0, TAU); p.size = rand(1.2, 2.6); p.max = 1e9; }
    for (let i = 0; i < NW; i++) {
      wx[i] = W * (0.3 + i * 0.2); wy[i] = H * 0.7; wvx[i] = wvy[i] = 0;
      for (let j = 0; j < TRAIL; j++) { tx[i * TRAIL + j] = wx[i]; ty[i * TRAIL + j] = wy[i]; }
    }
  };
  build();

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    move(x, y) { fx = x; fy = y; if (follow > 0) follow = 2.5; },
    tap(x, y, big) {
      fx = x; fy = y; follow = 3;
      burst(sparks, x, y, big ? 40 : 10, big ? 200 : 80, big ? 2.2 : 1.3, big ? 2.6 : 2);
      if (big) {
        swell = 1;
        for (let i = 0; i < 14; i++) {
          const b = blooms.get(); b.x = rand(W * 0.04, W * 0.96); b.y = H * rand(0.88, 0.98); b.max = rand(3.5, 5); b.life = -i * 0.06 - rand(0, 0.3);
          b.size = Math.min(W, H) * rand(0.018, 0.03); b.kind = i % 3; b.a = rand(0, TAU);
        }
      }
    },
    frame(dt, t) {
      swell = Math.max(0, swell - dt * 0.3);
      if (follow > 0) follow -= dt;
      const ws = clamp(Math.min(W, H) / 400, 0.35, 1.2);
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);
      // Fog bank drifting between the far and middle trees.
      for (let i = 0; i < 2; i++) {
        const fw = W * 1.4, off = ((t * (6 + i * 4) + i * W * 0.6) % (fw + W)) - fw;
        ctx.globalAlpha = dark ? 0.22 : 0.4;
        ctx.drawImage(fogS, off, H * (0.55 + i * 0.18), fw, H * 0.22);
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(mid.c, 0, 0, W, H);
      // God-rays.
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (let i = 0; i < 5; i++) {
        const x = W * (0.45 + i * 0.16) + Math.sin(t * 0.13 + i) * 12;
        ctx.globalAlpha = P.rayA * (0.55 + 0.45 * Math.sin(t * 0.35 + i * 1.9)) * (1 + swell * 1.2);
        ctx.save(); ctx.translate(x, -20); ctx.rotate(0.42);
        ctx.drawImage(ray, -W * 0.09, 0, W * 0.18, H * 1.1); ctx.restore();
      }
      // Spores.
      for (const p of spores.items) {
        if (!p.on) continue;
        p.a += dt * 0.8;
        p.x += Math.sin(p.a) * 8 * dt; p.y += p.vy * dt;
        if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
        ctx.globalAlpha = (0.35 + 0.45 * Math.sin(p.a * 1.7)) * (dark ? 1 : 0.8) + swell * 0.3;
        blit(ctx, sporeS, p.x, p.y, p.size * 3);
      }
      // Blooms on the forest floor.
      for (const b of blooms.items) {
        if (!b.on) continue;
        b.life += dt;
        if (b.life < 0) continue;
        const q = b.life / b.max;
        if (q >= 1) { b.on = false; continue; }
        const grow = easeOut(clamp(q * 3)), fade = env(q, 0.01, 0.35);
        ctx.globalAlpha = fade * (0.6 + 0.4 * Math.sin(t * 3 + b.a));
        blit(ctx, bloomS[b.kind], b.x, b.y - b.size * grow, b.size * 4 * grow);
        ctx.globalAlpha = fade;
        ctx.fillStyle = P.bloom[b.kind];
        for (let j = 0; j < 5; j++) {
          const a = b.a + (j / 5) * TAU;
          ctx.beginPath(); ctx.ellipse(b.x + Math.cos(a) * b.size * 0.5 * grow, b.y - b.size * grow + Math.sin(a) * b.size * 0.5 * grow, b.size * 0.42 * grow, b.size * 0.24 * grow, a, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(b.x, b.y - b.size * grow, b.size * 0.2 * grow, 0, TAU); ctx.fill();
      }
      // Wisps: follow the finger, otherwise wander low in the forest.
      if (dt > 0) {
        trailT += dt;
        const push = trailT > 1 / 40;
        if (push) { trailT = 0; head = (head + 1) % TRAIL; }
        for (let i = 0; i < NW; i++) {
          let gx: number, gy: number;
          if (follow > 0) { const a = t * 2.2 + (i * TAU) / NW; gx = fx + Math.cos(a) * 30; gy = fy + Math.sin(a) * 22; }
          else { gx = W * (0.5 + 0.38 * Math.sin(t * 0.21 + i * 2.1)); gy = H * (0.72 + 0.12 * Math.sin(t * 0.33 + i * 1.3)); }
          const kk = follow > 0 ? 14 : 2.5, damp = Math.pow(follow > 0 ? 0.02 : 0.2, dt);
          wvx[i] = wvx[i] * damp + (gx - wx[i]) * kk * dt; wvy[i] = wvy[i] * damp + (gy - wy[i]) * kk * dt;
          wx[i] += wvx[i] * dt; wy[i] += wvy[i] * dt;
          if (push) { tx[i * TRAIL + head] = wx[i]; ty[i * TRAIL + head] = wy[i]; }
        }
      }
      for (let i = 0; i < NW; i++) {
        for (let j = 1; j < TRAIL; j++) {
          const idx = i * TRAIL + ((head - j + TRAIL) % TRAIL), q = 1 - j / TRAIL;
          ctx.globalAlpha = q * 0.5;
          blit(ctx, wispHalo, tx[idx], ty[idx], (4 + q * 10) * ws);
        }
        const pulse = 0.85 + 0.15 * Math.sin(t * 4 + i * 2);
        ctx.globalAlpha = 0.9;
        blit(ctx, wispHalo, wx[i], wy[i], 26 * pulse * ws);
        ctx.globalAlpha = 1;
        blit(ctx, wispCore, wx[i], wy[i], 8 * pulse * ws);
      }
      for (const p of sparks.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        const f = Math.pow(0.06, dt);
        p.vx *= f; p.vy = p.vy * f - 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = env(q, 0.05, 0.6);
        blit(ctx, sporeS, p.x, p.y, p.size * 3.4);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
