/** Synthwave (legendary): a neon perspective grid rolling toward a striped retro sun, wireframe
 *  mountains on the horizon, palm silhouettes, soft scanlines. Tap = a neon ring with sparks;
 *  celebration = the grid pulses, the sun flares and sparks shower. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, burst, env, glow, makeLayer, mix, previewOf, rgba, ridge, rng, scaleOf, sprite, stars, vgrad, vignette,
} from "./shared";

const PAL = {
  dark: { sky: ["#0b0220", "#2a0a4c", "#7a1a72", "#ff4f8b"], sun: ["#ffe96b", "#ff9a3d", "#ff2f8e"], floor: ["#2a0848", "#0c0220"], grid: "#ff3fd0", grid2: "#3ff3ff", mtn: "#1a0738", mtnEdge: "#ff58da", palm: "#07000f", star: "#ffffff", haze: "#ff4f8b", scan: "#000000", scanA: 0.12, edge: "#030008" },
  light: { sky: ["#9fd3ff", "#cdbdff", "#ffb8dc", "#ffd0b5"], sun: ["#fff4a3", "#ffbf8f", "#ff7ab8"], floor: ["#efd4ff", "#d8b8f5"], grid: "#c14fd8", grid2: "#4fb8e8", mtn: "#b99be8", mtnEdge: "#ff6fc0", palm: "#6a4c9c", star: "#ffffff", haze: "#ffd0e6", scan: "#ffffff", scanA: 0.12, edge: "#b89ad8" },
};

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, HY = h * 0.62, base: Layer, ground: Layer, fore: Layer, haze: Layer, sunL: Layer, R = 60, SX = 0, SY = 0;
  const sunDisk = sprite(`swsun${dark}`, 256, (g, s) => {
    g.fillStyle = vgrad(g, 0, s, [0, P.sun[0], 0.55, P.sun[1], 1, P.sun[2]]);
    g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, TAU); g.fill();
  });
  const sunGlow = glow(P.sun[2], 0.2, 128), spark = glow(P.grid2, 0.25, 32), spark2 = glow(P.grid, 0.25, 32);
  const rings = new Pool(8), sparks = new Pool(120);
  let pulse = 0, flare = 0;

  const palm = (g: Ctx, x: number, base: number, ht: number, lean: number, r: () => number) => {
    g.fillStyle = P.palm; g.strokeStyle = P.palm;
    // Segmented curved trunk.
    const tx = x + lean * ht, ty = base - ht;
    g.lineCap = "round";
    for (let i = 0; i < 18; i++) {
      const u0 = i / 18, u1 = (i + 1) / 18;
      const x0 = x + lean * ht * u0 * u0, y0 = base - ht * u0, x1 = x + lean * ht * u1 * u1, y1 = base - ht * u1;
      g.lineWidth = ht * (0.05 - u0 * 0.025);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    // Fronds: arching midribs with leaflets drooping off both sides.
    const dirs = [-1, -0.78, -0.45, -0.12, 0.2, 0.5, 0.8, 1];
    for (const d0 of dirs) {
      const d = d0 * (0.9 + r() * 0.2), len = ht * (0.36 + r() * 0.12) * (1 - Math.abs(d) * 0.1);
      const rise = len * (0.12 + (1 - Math.abs(d)) * 0.3);
      const fx = (u: number) => tx + d * len * u;
      const fy = (u: number) => ty - rise * Math.sin(u * Math.PI * 0.7) + len * 0.55 * u * u * (0.4 + Math.abs(d) * 0.6);
      g.lineWidth = Math.max(1.5, ht * 0.012);
      g.beginPath(); g.moveTo(tx, ty);
      for (let j = 1; j <= 16; j++) g.lineTo(fx(j / 16), fy(j / 16));
      g.stroke();
      g.lineWidth = Math.max(1.2, ht * 0.008);
      g.beginPath();
      for (let j = 2; j <= 18; j++) {
        const u = j / 18, px = fx(u), py = fy(u), ll = len * 0.2 * Math.sin(Math.min(1, u * 1.3) * Math.PI * 0.9 + 0.2);
        const dx = fx(u + 0.02) - px, dy = fy(u + 0.02) - py, m = Math.hypot(dx, dy) || 1;
        const nx = -dy / m, ny = dx / m;
        for (const s of [-1, 1]) {
          g.moveTo(px, py);
          g.lineTo(px + (nx * s * 0.75 + dx / m * 0.35) * ll, py + (ny * s * 0.75 + dy / m * 0.35) * ll + ll * 0.55);
        }
      }
      g.stroke();
    }
    g.beginPath(); g.arc(tx, ty, ht * 0.03, 0, TAU); g.fill();
  };

  const build = () => {
    HY = H * 0.62;
    base = makeLayer(k, W, H, 1.5);
    let g = base.g;
    g.fillStyle = vgrad(g, 0, HY, [0, P.sky[0], 0.45, P.sky[1], 0.8, P.sky[2], 1, P.sky[3]]);
    g.fillRect(0, 0, W, HY + 2);
    if (dark) stars(g, W, HY * 0.6, Math.round(W * H / 2600), 9, P.star, 0.85);
    R = Math.min(W * 0.36, H * 0.2); SX = W / 2; SY = HY - R * 0.35;
    g.globalAlpha = dark ? 0.55 : 0.5; blit(g, sunGlow, SX, SY, R * 2.6); g.globalAlpha = 1;
    sunL = makeLayer(k, R * 2, R * 2, 1.5);

    ground = makeLayer(k, W, H, 1.5);
    g = ground.g;
    // Wireframe mountains.
    const ys1 = ridge(g, W, H, { y: HY, amp: H * 0.12, seed: 7, scale: 110, fill: mix(P.mtn, P.sky[2], 0.35), sharp: true, oct: 4, shape: (u) => 0.35 + Math.abs(u - 0.5) * 1.6 });
    const ys2 = ridge(g, W, H, { y: HY, amp: H * 0.07, seed: 13, scale: 80, fill: P.mtn, sharp: true, oct: 4, shape: (u) => 0.2 + Math.abs(u - 0.5) * 1.8 });
    for (const [ys, a] of [[ys1, 0.45], [ys2, 0.8]] as [Float32Array, number][]) {
      g.strokeStyle = rgba(P.mtnEdge, a); g.lineWidth = 1.2;
      g.beginPath();
      for (let i = 0; i < ys.length; i++) { const x = i * 3; if (i === 0) g.moveTo(x, ys[i]); else g.lineTo(x, ys[i]); }
      g.stroke();
      g.strokeStyle = rgba(P.mtnEdge, a * 0.25); g.lineWidth = 1;
      g.beginPath();
      for (let i = 4; i < ys.length; i += 9) { g.moveTo(i * 3, ys[i]); g.lineTo(W / 2 + (i * 3 - W / 2) * 1.1, HY); }
      g.stroke();
    }
    // Floor + converging lines.
    g.fillStyle = vgrad(g, HY, H, [0, P.floor[0], 1, P.floor[1]]);
    g.fillRect(0, HY, W, H - HY);
    const n = 22;
    for (const [lw, a] of [[5, 0.12], [1.3, 0.85]]) {
      g.strokeStyle = rgba(P.grid, a); g.lineWidth = lw;
      g.beginPath();
      for (let i = -n; i <= n; i++) { const bx = W / 2 + i * (W / n) * 1.6; g.moveTo(W / 2 + (bx - W / 2) * 0.04, HY); g.lineTo(bx, H + 4); }
      g.stroke();
    }
    g.strokeStyle = rgba(P.grid2, 0.9); g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, HY); g.lineTo(W, HY); g.stroke();

    // Horizon haze (drawn over the moving lines so the far ones melt away).
    haze = makeLayer(k, W, H * 0.12, 1);
    haze.g.fillStyle = vgrad(haze.g, 0, H * 0.12, [0, rgba(P.haze, dark ? 0.55 : 0.7), 1, rgba(P.haze, 0)]);
    haze.g.fillRect(0, 0, W, H * 0.12);

    fore = makeLayer(k, W, H, 1.5);
    g = fore.g;
    const r = rng(3);
    palm(g, W * 0.06, H + 6, Math.min(H * 0.42, W * 0.9), 0.16, r);
    palm(g, W * 0.97, H + 6, Math.min(H * 0.32, W * 0.7), -0.2, r);
    palm(g, W * 0.86, H + 6, Math.min(H * 0.22, W * 0.5), 0.1, r);
    g.fillStyle = rgba(P.scan, P.scanA);
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    vignette(g, W, H, P.edge, dark ? 0.6 : 0.3, 0.45);
  };
  build();

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      const r = rings.get(); r.x = x; r.y = y; r.max = big ? 1.6 : 0.9; r.size = big ? Math.min(W, H) * 0.5 : 70; r.kind = y > HY ? 1 : 0;
      burst(sparks, x, y, big ? 60 : 12, big ? 300 : 110, big ? 1.8 : 0.9, big ? 2.6 : 2, big ? 80 : 20);
      if (big) { pulse = 1; flare = 1; }
    },
    frame(dt, t) {
      pulse = Math.max(0, pulse - dt * 0.9); flare = Math.max(0, flare - dt * 0.6);
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);
      // Sun with stripes sliding down.
      const sg = sunL.g, D = R * 2;
      sg.globalCompositeOperation = "source-over";
      sg.clearRect(0, 0, D, D);
      sg.drawImage(sunDisk, 0, 0, D, D);
      sg.globalCompositeOperation = "destination-out";
      const sh = D * 0.06, off = (t * 10) % (sh * 1.7);
      for (let i = 0; i < 8; i++) {
        const y = D * 0.3 + i * sh * 1.7 + off, th = sh * (0.15 + 0.1 * i);
        sg.fillRect(0, y, D, th);
      }
      sg.globalCompositeOperation = "source-over";
      if (flare > 0) { ctx.globalCompositeOperation = dark ? "lighter" : "source-over"; ctx.globalAlpha = flare * 0.6; blit(ctx, sunGlow, SX, SY, R * 3.4); ctx.globalCompositeOperation = "source-over"; }
      ctx.globalAlpha = 1;
      ctx.drawImage(sunL.c, SX - R, SY - R, D, D);
      ctx.drawImage(ground.c, 0, 0, W, H);

      // Horizontal grid lines rolling toward the viewer.
      const depth = H - HY, ph = (t * 0.9) % 1;
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = P.grid;
        ctx.lineWidth = pass ? 1.3 + pulse * 1.5 : 6 + pulse * 6;
        ctx.globalAlpha = pass ? 0.85 : 0.12 + pulse * 0.2;
        ctx.beginPath();
        for (let i = 0; i < 18; i++) {
          const z = i + 1 - ph;
          const y = HY + depth * 0.14 / (z * 0.13);
          if (y > H + 4 || y < HY) continue;
          ctx.moveTo(0, y); ctx.lineTo(W, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(haze.c, 0, HY, W, H * 0.12);

      // Rings and sparks.
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (const r of rings.items) {
        if (!r.on) continue;
        r.life += dt;
        const q = r.life / r.max;
        if (q >= 1) { r.on = false; continue; }
        const e = 1 - (1 - q) * (1 - q) * (1 - q), rad = 6 + r.size * e;
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass ? P.grid2 : P.grid;
          ctx.lineWidth = pass ? 1.6 : 6; ctx.globalAlpha = (1 - q) * (pass ? 0.9 : 0.25);
          ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, r.kind ? rad * 0.32 : rad, 0, 0, TAU); ctx.stroke();
        }
      }
      for (const p of sparks.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        const f = Math.pow(0.15, dt);
        p.vx *= f; p.vy = p.vy * f + 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = env(q, 0.03, 0.6);
        blit(ctx, (p.rot > 3 ? spark : spark2), p.x, p.y, p.size * 3);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
