/** Ciudad flotante (legendary): floating islands — grassy tops, tiny houses and trees, rocky roots —
 *  pouring waterfalls into a sea of clouds, with three parallax cloud layers. The palette follows the
 *  real local hour (dawn / day / dusk / night); dark mode deepens it.
 *  Tap = a puff of golden motes; celebration = a rainbow arcs over the clouds. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, burst, calm, env, glow, makeLayer, mix, previewOf, rand, rgba, rng, scaleOf, stars, vgrad, vignette,
} from "./shared";

type Period = "dawn" | "day" | "dusk" | "night";
interface Pal { sky: string[]; sun: string; cloud: string; shade: string; grass: string; grassHi: string; rock: string; rockDk: string; water: string; win: string; star: number }

const BASE: Record<Period, Pal> = {
  dawn: { sky: ["#8fa6dc", "#f3c1c9", "#ffdcb0"], sun: "#fff0c8", cloud: "#fff3ee", shade: "#d9b7c9", grass: "#86c27e", grassHi: "#b5e0a0", rock: "#b9958c", rockDk: "#8a6b74", water: "#e9f6ff", win: "#ffd27a", star: 0.15 },
  day: { sky: ["#5fb2f2", "#a5d6f7", "#e6f4fb"], sun: "#fffbe6", cloud: "#ffffff", shade: "#c9dcef", grass: "#6dbb6a", grassHi: "#a6dd8a", rock: "#b49a82", rockDk: "#83705f", water: "#eefaff", win: "#ffe3a0", star: 0 },
  dusk: { sky: ["#4a4a8c", "#d77a8c", "#ffbf7a"], sun: "#ffd28a", cloud: "#ffd9c4", shade: "#a87a9c", grass: "#6f9f6a", grassHi: "#a4c784", rock: "#9a7280", rockDk: "#6b4f63", water: "#ffe8d8", win: "#ffc46b", star: 0.35 },
  night: { sky: ["#0a1030", "#1e2a5a", "#3b4a7a"], sun: "#f3f0ff", cloud: "#4a5688", shade: "#2c3563", grass: "#2f5a4a", grassHi: "#4a7d62", rock: "#4a4766", rockDk: "#2c2a44", water: "#a9c4ff", win: "#ffcf72", star: 0.9 },
};

export function periodOf(hour: number): Period {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

function palette(p: Period, dark: boolean): Pal {
  const b = BASE[p];
  if (!dark) return b;
  const n = "#0b1030", f = p === "night" ? 0.25 : 0.45;
  const m = (c: string) => mix(c, n, f);
  return { ...b, sky: b.sky.map(m), cloud: m(b.cloud), shade: m(b.shade), grass: m(b.grass), grassHi: m(b.grassHi), rock: m(b.rock), rockDk: m(b.rockDk), water: mix(b.water, n, f * 0.5), star: Math.min(1, b.star + 0.4) };
}

type Isle = { c: HTMLCanvasElement; x: number; y: number; w: number; h: number; ph: number; falls: number[]; alpha: number };

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const k = scaleOf(ctx, w);
  let W = w, H = h, period = periodOf(new Date().getHours()), P = palette(period, dark);
  let base: Layer, fore: Layer, clouds: Layer[] = [], fallTex: HTMLCanvasElement, fallGrad: HTMLCanvasElement, isles: Isle[] = [];
  let checkT = 60;
  const motes = new Pool(90), birds = { x: -100, y: 0, t: 0, on: false, next: 6 };
  let rainbow = 0;
  let mote = glow("#ffe7a0", 0.25, 48), mist = glow("#ffffff", 0.35, 64);

  const cloudStrip = (cw: number, ch: number, seed: number, n: number, size: number, alpha: number, yBias: number) => {
    const L = makeLayer(k, cw, ch, 1);
    const g = L.g, r = rng(seed);
    for (let i = 0; i < n; i++) {
      const cx = (i + r() * 0.6) * (cw / n), cy = ch * (yBias + (r() - 0.5) * 0.3), s = size * (0.6 + r() * 0.7);
      for (const off of [-cw, 0, cw]) {
        for (let j = 0; j < 7; j++) {
          const px = cx + off + (j - 3) * s * 0.32 + (r() - 0.5) * s * 0.2, py = cy - Math.sin((j / 6) * Math.PI) * s * 0.35 + r() * s * 0.08, pr = s * (0.25 + Math.sin((j / 6) * Math.PI) * 0.22);
          g.fillStyle = vgrad(g, py - pr, py + pr, [0, rgba(P.cloud, alpha), 0.6, rgba(P.cloud, alpha), 1, rgba(P.shade, alpha)]);
          g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
        }
      }
    }
    return L;
  };

  const islandSprite = (iw: number, seed: number, house: boolean, tower: boolean): { c: HTMLCanvasElement; h: number; falls: number[] } => {
    const ih = iw * 0.9, L = makeLayer(k, iw, ih, 1.5), g = L.g, r = rng(seed);
    const top = ih * 0.28, cx = iw / 2;
    // Rock underside: a jagged inverted cone with strata.
    g.beginPath(); g.moveTo(iw * 0.04, top);
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = iw * (0.04 + 0.92 * u);
      const depth = Math.sin(u * Math.PI) ** 1.4 * ih * 0.66 * (0.75 + r() * 0.35);
      g.lineTo(x, top + depth);
    }
    g.lineTo(iw * 0.96, top); g.closePath();
    g.fillStyle = vgrad(g, top, ih, [0, P.rock, 1, P.rockDk]); g.fill();
    g.save(); g.clip();
    g.strokeStyle = rgba(P.rockDk, 0.5); g.lineWidth = Math.max(1, iw * 0.008);
    for (let i = 1; i < 5; i++) { const y = top + i * ih * 0.08; g.beginPath(); g.moveTo(0, y + r() * 4); g.quadraticCurveTo(cx, y + ih * 0.03 * (r() - 0.3), iw, y + r() * 4); g.stroke(); }
    g.fillStyle = rgba("#ffffff", 0.12); g.fillRect(0, top, iw * 0.35, ih);
    g.restore();
    // Hanging roots.
    g.strokeStyle = P.grass; g.lineWidth = Math.max(1, iw * 0.006);
    for (let i = 0; i < 6; i++) { const x = iw * (0.15 + r() * 0.7), l = ih * (0.08 + r() * 0.14); g.beginPath(); g.moveTo(x, top + 2); g.quadraticCurveTo(x + (r() - 0.5) * 10, top + l * 0.6, x + (r() - 0.5) * 6, top + l); g.stroke(); }
    // Grass top with a lit rim.
    g.fillStyle = P.grass;
    g.beginPath(); g.ellipse(cx, top, iw * 0.47, ih * 0.08, 0, 0, TAU); g.fill();
    g.fillStyle = P.grassHi;
    g.beginPath(); g.ellipse(cx - iw * 0.04, top - ih * 0.02, iw * 0.4, ih * 0.05, 0, 0, TAU); g.fill();
    // Trees.
    for (let i = 0; i < 5; i++) {
      const x = iw * (0.12 + r() * 0.76), s = iw * (0.04 + r() * 0.035), y = top - ih * 0.02;
      if (house && Math.abs(x - cx) < iw * 0.12) continue;
      g.fillStyle = P.rockDk; g.fillRect(x - s * 0.08, y - s * 1.1, s * 0.16, s * 1.1);
      g.fillStyle = P.grass; g.beginPath(); g.arc(x, y - s * 1.4, s * 0.7, 0, TAU); g.fill();
      g.fillStyle = P.grassHi; g.beginPath(); g.arc(x - s * 0.2, y - s * 1.6, s * 0.4, 0, TAU); g.fill();
    }
    if (house) {
      const hw = iw * 0.13, hh = hw * 0.75, hx = cx - hw / 2, hy = top - ih * 0.02 - hh;
      g.fillStyle = mix("#f4ece0", P.rock, dark ? 0.5 : 0.15); g.fillRect(hx, hy, hw, hh);
      g.fillStyle = mix("#d86a5a", P.rockDk, dark ? 0.4 : 0.1);
      g.beginPath(); g.moveTo(hx - hw * 0.12, hy); g.lineTo(cx, hy - hh * 0.7); g.lineTo(hx + hw * 1.12, hy); g.closePath(); g.fill();
      g.fillStyle = period === "night" || period === "dusk" || dark ? P.win : rgba("#5a7aa0", 0.8);
      g.fillRect(hx + hw * 0.2, hy + hh * 0.3, hw * 0.22, hh * 0.3); g.fillRect(hx + hw * 0.58, hy + hh * 0.3, hw * 0.22, hh * 0.3);
    }
    if (tower) {
      const tw = iw * 0.07, th = tw * 3.2, tx = iw * 0.74, ty = top - ih * 0.02;
      g.fillStyle = mix("#efe6da", P.rock, dark ? 0.5 : 0.2); g.fillRect(tx - tw / 2, ty - th, tw, th);
      g.fillStyle = mix("#5a7ab0", P.rockDk, 0.3);
      g.beginPath(); g.moveTo(tx - tw * 0.7, ty - th); g.lineTo(tx, ty - th - tw * 1.3); g.lineTo(tx + tw * 0.7, ty - th); g.closePath(); g.fill();
      g.fillStyle = P.win; g.fillRect(tx - tw * 0.18, ty - th * 0.7, tw * 0.36, tw * 0.5);
    }
    return { c: L.c, h: ih, falls: [iw * (0.08 + r() * 0.05), iw * (0.86 + r() * 0.05)] };
  };

  const build = () => {
    P = palette(period, dark);
    mote = glow(period === "night" ? "#bfe0ff" : "#ffe7a0", 0.25, 48);
    mist = glow(P.cloud, 0.35, 64);
    base = makeLayer(k, W, H, 1.5);
    const g = base.g, U = Math.min(W, H);
    g.fillStyle = vgrad(g, 0, H, [0, P.sky[0], 0.55, P.sky[1], 1, P.sky[2]]);
    g.fillRect(0, 0, W, H);
    if (P.star > 0) stars(g, W, H * 0.55, Math.round(W * H / 3000), 5, "#ffffff", P.star);
    const sx = period === "dawn" ? W * 0.2 : period === "dusk" ? W * 0.8 : period === "day" ? W * 0.78 : W * 0.25;
    const sy = period === "day" ? H * 0.1 : period === "night" ? H * 0.1 : H * 0.42;
    const sr = U * (period === "night" ? 0.05 : 0.07);
    g.globalAlpha = 0.6; blit(g, glow(P.sun, 0.2, 128), sx, sy, sr * 6); g.globalAlpha = 1;
    g.fillStyle = P.sun; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
    if (period === "night") { g.fillStyle = P.sky[0]; g.beginPath(); g.arc(sx + sr * 0.45, sy - sr * 0.2, sr * 0.85, 0, TAU); g.fill(); }
    calm(g, W, H, P.sky[1], dark ? 0.2 : 0.3, 0.45);
    // Three cloud strips: far (horizon), mid, near (the sea of clouds at the bottom).
    clouds = [
      cloudStrip(W * 1.5, H * 0.3, 3, 7, U * 0.16, 0.55, 0.6),
      cloudStrip(W * 1.5, H * 0.3, 7, 5, U * 0.26, 0.8, 0.55),
      cloudStrip(W * 1.5, H * 0.32, 11, 5, U * 0.42, 1, 0.6),
    ];
    // Waterfall texture: soft vertical streaks.
    const ft = makeLayer(1, 24, 256, 1), fg = ft.g, fr = rng(4);
    for (let i = 0; i < 40; i++) { fg.fillStyle = rgba(P.water, 0.25 + fr() * 0.6); fg.fillRect(fr() * 22, fr() * 256, 1 + fr() * 2, 20 + fr() * 60); }
    fallTex = ft.c;
    const fgr = makeLayer(1, 8, 128, 1);
    fgr.g.fillStyle = vgrad(fgr.g, 0, 128, [0, rgba(P.water, 0.8), 1, rgba(P.water, 0)]);
    fgr.g.fillRect(0, 0, 8, 128);
    fallGrad = fgr.c;
    const r = rng(19);
    const defs: [number, number, number, boolean, boolean, number][] = [
      [0.24, 0.2, 0.5, true, false, 1], [0.8, 0.46, 0.4, false, true, 1], [0.14, 0.62, 0.24, false, false, 1], [0.62, 0.1, 0.16, false, false, 0.65],
    ];
    isles = defs.map(([x, y, s, house, tower, alpha], i) => {
      const iw = Math.min(W * s, H * s * 0.75) * (alpha < 1 ? 1 : 1.0);
      const sp = islandSprite(iw, 30 + i * 13, house, tower);
      return { c: sp.c, x: W * x - iw / 2, y: H * y, w: iw, h: sp.h, ph: r() * TAU, falls: i === 3 ? [] : i === 2 ? [sp.falls[1]] : sp.falls, alpha };
    });
    fore = makeLayer(k, W, H, 1);
    vignette(fore.g, W, H, dark ? "#03050f" : P.shade, dark ? 0.5 : 0.2, 0.5);
  };
  build();

  const drawClouds = (i: number, t: number, y: number, speed: number, alpha: number) => {
    const L = clouds[i], cw = W * 1.5, ch = i === 2 ? H * 0.32 : H * 0.3;
    const off = (t * speed) % cw;
    ctx.globalAlpha = alpha;
    ctx.drawImage(L.c, -off, y, cw, ch);
    ctx.drawImage(L.c, cw - off, y, cw, ch);
  };

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      burst(motes, x, y, big ? 50 : 12, big ? 220 : 90, big ? 2.4 : 1.4, big ? 3 : 2.2, 20);
      if (big) rainbow = 3.2;
    },
    frame(dt, t) {
      if (dt > 0) {
        checkT -= dt;
        if (checkT <= 0) { checkT = 60; const p = periodOf(new Date().getHours()); if (p !== period) { period = p; build(); } }
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);
      drawClouds(0, t, H * 0.44, 4, 0.7);

      // Rainbow (celebration).
      if (rainbow > 0) {
        rainbow -= dt;
        const a = Math.min(1, (3.2 - rainbow) * 1.5, rainbow) * (dark ? 0.35 : 0.5);
        const cols = RAINBOW, R = Math.max(W, H) * 0.42;
        ctx.lineWidth = Math.min(W, H) * 0.018;
        for (let i = 0; i < cols.length; i++) {
          ctx.strokeStyle = cols[i]; ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(W / 2, H * 0.82, R - i * ctx.lineWidth, Math.PI, 0); ctx.stroke();
        }
      }

      // Islands (bobbing) with waterfalls.
      for (let i = isles.length - 1; i >= 0; i--) {
        const s = isles[i], by = s.y + Math.sin(t * 0.35 + s.ph) * 5;
        const top = by + s.h * 0.28 - s.h * 0.28;
        for (const fx of s.falls) {
          const x = s.x + fx, y0 = top + s.h * 0.27, len = H - y0, fw = Math.max(4, s.w * 0.035);
          ctx.globalAlpha = 0.55 * s.alpha;
          ctx.drawImage(fallGrad, x - fw / 2, y0, fw, len * 0.8);
          const off = (t * 90) % 256;
          ctx.globalAlpha = 0.8 * s.alpha;
          ctx.drawImage(fallTex, 0, off, 24, Math.min(256 - off, 128), x - fw / 2, y0, fw, len * 0.4);
          ctx.globalAlpha = 0.35 * s.alpha * (0.7 + 0.3 * Math.sin(t * 3 + fx));
          blit(ctx, mist, x, y0 + len * 0.55, fw * 3);
        }
        ctx.globalAlpha = s.alpha;
        ctx.drawImage(s.c, s.x, by - s.h * 0.0, s.w, s.h);
        if (i === 3) drawClouds(1, t, H * 0.52, 9, 0.85);
      }

      // Birds crossing now and then.
      if (dt > 0) {
        birds.next -= dt;
        if (!birds.on && birds.next <= 0) { birds.on = true; birds.x = -40; birds.y = H * rand(0.15, 0.35); birds.t = 0; }
        if (birds.on) {
          birds.t += dt; birds.x += 40 * dt;
          if (birds.x > W + 60) { birds.on = false; birds.next = rand(12, 20); }
        }
      }
      if (birds.on) {
        ctx.strokeStyle = period === "night" ? "#c9d6ff" : "#3a3a55"; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.6;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const bx = birds.x - (i % 2 ? i * 14 : i * 11), by = birds.y + (i % 2 ? i * 6 : -i * 4) + Math.sin(birds.t * 2 + i) * 3, f = Math.sin(birds.t * 10 + i) * 3;
          ctx.moveTo(bx - 6, by - f); ctx.quadraticCurveTo(bx - 3, by - 2, bx, by); ctx.quadraticCurveTo(bx + 3, by - 2, bx + 6, by - f);
        }
        ctx.stroke();
      }

      drawClouds(2, t, H * 0.74, 14, 1);
      // Motes.
      ctx.globalCompositeOperation = dark || period === "night" ? "lighter" : "source-over";
      for (const p of motes.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        const f = Math.pow(0.1, dt);
        p.vx *= f; p.vy = p.vy * f - 10 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = env(q, 0.05, 0.6);
        blit(ctx, mote, p.x, p.y, p.size * 3.5);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

const RAINBOW = ["#ff6b6b", "#ffb36b", "#ffe66b", "#7be07b", "#6bc4ff", "#9b7bff"];

export const drawPreview = previewOf(create);
