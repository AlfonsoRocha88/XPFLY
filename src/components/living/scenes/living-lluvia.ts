/** Lluvia suave (common): soft rain at dusk over a distant city glowing through the haze, its lights
 *  smeared across the wet ground. Rain falls in two depths; drops ripple on the ground.
 *  Taps make ripples; a celebration sends rings out and warms the city lights. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, calm, glow, makeLayer, mix, previewOf, rand, rgba, rng, scaleOf, vgrad, vignette,
} from "./shared";

const PAL = {
  light: { sky: ["#9aa6cf", "#c9bfd9", "#f1cdb9"], city: ["#b7a9c6", "#8f86ab", "#6b6688"], win: "#ffd59a", haze: "#ffc9a3", ground: ["#8b85a8", "#a79dba"], rain: "#4d5680", rainA: 0.32, ring: "#ffffff", edge: "#6d6f99" },
  dark: { sky: ["#0f1230", "#262650", "#563d5e"], city: ["#2b2a4c", "#1f1f3b", "#15152a"], win: "#ffcf7a", haze: "#ff9f6e", ground: ["#141428", "#221f3a"], rain: "#c8d2ff", rainA: 0.24, ring: "#d9e0ff", edge: "#05050f" },
};

const TILE = 256, SLANT = 0.16;

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, HY = h * 0.76, base: Layer, fore: Layer;
  const haze = glow(P.haze, 0.3, 128), winGlow = glow(P.win, 0.25, 32);
  // Rain sheets: seamless tiles of slanted streaks (far = fine and dense, near = longer).
  const sheets = [0, 1].map((layer) => {
    const L = makeLayer(Math.min(k, 1.5), TILE, TILE, 1.5), g = L.g, r = rng(50 + layer);
    g.strokeStyle = rgba(P.rain, P.rainA * (layer ? 1 : 0.75));
    g.lineWidth = layer ? 1.2 : 0.75;
    g.beginPath();
    const n = layer ? 26 : 60;
    for (let i = 0; i < n; i++) {
      const x = r() * TILE, y = r() * TILE, l = layer ? 16 + r() * 12 : 7 + r() * 7;
      for (let ox = -TILE; ox <= TILE; ox += TILE) for (let oy = -TILE; oy <= TILE; oy += TILE) {
        g.moveTo(x + ox, y + oy); g.lineTo(x + ox - l * SLANT, y + oy - l);
      }
    }
    g.stroke();
    return L.c;
  });
  const ripples = new Pool(60);
  let warm = 0, dropT = 0;

  const skyline = (g: Ctx, seed: number, y: number, minH: number, maxH: number, minW: number, maxW: number, fill: string, lights: number) => {
    const r = rng(seed);
    let x = -10;
    while (x < W + 10) {
      const bw = minW + r() * (maxW - minW), bh = minH + r() * (maxH - minH);
      g.fillStyle = fill;
      g.fillRect(x, y - bh, bw + 1, bh + 2);
      if (r() < 0.25) g.fillRect(x + bw * 0.4, y - bh - bh * 0.12, Math.max(1.5, bw * 0.08), bh * 0.12); // antenna
      if (lights > 0) {
        const cols = Math.max(1, Math.floor(bw / 6)), rows = Math.floor(bh / 8);
        for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
          if (r() > lights) continue;
          const wx = x + 2 + cx * (bw - 3) / cols, wy = y - bh + 4 + cy * 8;
          g.globalAlpha = 0.35 + r() * 0.5;
          g.fillStyle = P.win; g.fillRect(wx, wy, 2, 3);
          if (r() < 0.15) { g.globalAlpha = 0.25; blit(g, winGlow, wx + 1, wy + 1.5, 7); }
          g.globalAlpha = 1;
        }
      }
      x += bw + r() * 4;
    }
  };

  const build = () => {
    HY = H * 0.76;
    base = makeLayer(k, W, H, 1.5);
    const g = base.g;
    g.fillStyle = vgrad(g, 0, HY, [0, P.sky[0], 0.6, P.sky[1], 1, P.sky[2]]);
    g.fillRect(0, 0, W, HY + 1);
    // City glow on the horizon.
    g.globalAlpha = dark ? 0.55 : 0.6;
    g.drawImage(haze, -W * 0.2, HY - H * 0.25, W * 1.4, H * 0.45);
    g.globalAlpha = 1;
    skyline(g, 2, HY, H * 0.04, H * 0.11, 14, 34, mix(P.city[0], P.sky[2], 0.35), dark ? 0.1 : 0.04);
    skyline(g, 5, HY, H * 0.03, H * 0.085, 18, 40, P.city[1], dark ? 0.22 : 0.1);
    skyline(g, 9, HY + 2, H * 0.015, H * 0.05, 24, 52, P.city[2], dark ? 0.3 : 0.14);
    // Mist band over the city.
    g.fillStyle = vgrad(g, HY - H * 0.1, HY + 4, [0, rgba(P.sky[2], 0), 1, rgba(P.sky[2], 0.45)]);
    g.fillRect(0, HY - H * 0.1, W, H * 0.1 + 4);
    // Wet ground with smeared reflections.
    g.fillStyle = vgrad(g, HY, H, [0, P.ground[1], 1, P.ground[0]]);
    g.fillRect(0, HY, W, H - HY);
    const r = rng(31);
    for (let i = 0; i < 40; i++) {
      const x = r() * W, len = (H - HY) * (0.3 + r() * 0.6);
      g.fillStyle = vgrad(g, HY, HY + len, [0, rgba(r() < 0.7 ? P.win : P.haze, dark ? 0.35 : 0.3), 1, rgba(P.win, 0)]);
      g.fillRect(x, HY + 2, 1.2 + r() * 2.5, len);
    }
    calm(g, W, H, P.sky[1], dark ? 0.25 : 0.35, 0.4);
    fore = makeLayer(k, W, H, 1);
    vignette(fore.g, W, H, P.edge, dark ? 0.6 : 0.3, 0.45);
    ripples.clear();
  };
  build();

  const ring = (x: number, y: number, size: number, life: number, kind: number) => {
    const p = ripples.get(); p.x = x; p.y = y; p.size = size; p.max = life; p.kind = kind;
  };

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      const n = big ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const p = ripples.get(); p.x = x; p.y = y; p.size = (big ? 110 : 46) * (1 - i * 0.16); p.max = (big ? 1.9 : 1.3) + i * 0.1; p.life = -i * 0.14; p.kind = 1;
      }
      if (big) warm = 1;
    },
    frame(dt, t) {
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);
      warm = Math.max(0, warm - dt * 0.5);
      if (warm > 0) {
        ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
        ctx.globalAlpha = warm * 0.45;
        ctx.drawImage(haze, -W * 0.3, HY - H * 0.35, W * 1.6, H * 0.6);
        ctx.globalCompositeOperation = "source-over";
      }
      // Rain: two pre-drawn tiles per depth, scrolled diagonally (a handful of blits per frame
      // instead of hundreds of stroked lines). A slow sway of the whole sheet reads as wind.
      for (let layer = 0; layer < 2; layer++) {
        const tile = sheets[layer], sp = layer ? 700 : 420;
        const oy = (t * sp) % TILE, ox = (t * sp * SLANT + Math.sin(t * 0.3) * 18 * (layer + 1)) % TILE;
        ctx.globalAlpha = layer ? 1 : 0.7;
        for (let y = oy - TILE; y < H; y += TILE) for (let x = ox - TILE; x < W; x += TILE) ctx.drawImage(tile, x, y, TILE, TILE);
      }
      ctx.globalAlpha = 1;
      dropT -= dt;
      if (dt > 0 && dropT <= 0) { dropT = rand(0.07, 0.2); ring(rand(0, W), HY + Math.random() * (H - HY), rand(6, 16), rand(0.6, 1.1), 0); }

      // Ripples (flattened rings, perspective of the ground).
      ctx.strokeStyle = P.ring;
      for (const p of ripples.items) {
        if (!p.on) continue;
        p.life += dt;
        if (p.life < 0) continue;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        const e = 1 - (1 - q) * (1 - q);
        ctx.lineWidth = p.kind ? 1.6 * (1 - q) + 0.4 : 0.8;
        ctx.globalAlpha = (1 - q) * (p.kind ? 0.75 : dark ? 0.35 : 0.5);
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 2 + p.size * e, (2 + p.size * e) * 0.38, 0, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
