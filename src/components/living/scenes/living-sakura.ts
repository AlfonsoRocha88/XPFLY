/** Sakura (epic): a layered Japanese landscape — Mount Fuji in the haze, mist, a vermilion torii on
 *  the hill — framed by a great cherry tree whose outer branches sway in the breeze. Petals fall,
 *  tumbling in 3D, carried by gusts. Tap = a swirl of petals; celebration = a blossom burst. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, calm, clamp, env, glow, makeLayer, mix, previewOf, rand, rgba, ridge, ridgeAt, rng, scaleOf, sprite, vgrad, vignette,
} from "./shared";

const PAL = {
  light: {
    sky: ["#f6c9d8", "#fbe3e2", "#fff1e2"], sun: "#fff7ea", fuji: "#a9a6cf", fujiShade: "#9592c0", snow: "#ffffff", mist: "#fff3f2",
    hills: ["#c3b3d3", "#a796bf", "#8a7aa8"], ground: "#7c6c98", bark: "#5a3d4d", barkHi: "#7a5566",
    bloom: ["#ffc4d6", "#ffadc8", "#ff93b6", "#ffe3ec"], torii: "#e2553f", toriiTop: "#3b2a33", lantern: "#ffd28a", edge: "#c7a9c4", petal: ["#ffc2d4", "#ffb0c8", "#ffd9e4"],
  },
  dark: {
    sky: ["#15122e", "#33275a", "#6a4a7c"], sun: "#fff1df", fuji: "#3a3768", fujiShade: "#2f2c58", snow: "#d9d5f2", mist: "#7e6a9c",
    hills: ["#3b3564", "#2c2750", "#1f1b3c"], ground: "#17142c", bark: "#24182a", barkHi: "#3a2838",
    bloom: ["#f0a3c2", "#e386ad", "#c86a98", "#ffd0e2"], torii: "#c2402f", toriiTop: "#1a1018", lantern: "#ffc46b", edge: "#07050f", petal: ["#f5a9c6", "#e991b5", "#ffc9dc"],
  },
};

type Seg = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; w: number };
type Group = { px: number; py: number; c: HTMLCanvasElement; ox: number; oy: number; cw: number; ch: number; ph: number; amp: number };

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, base: Layer, tree: Layer, fore: Layer;
  let groups: Group[] = [];
  let canopyX0 = 0, canopyX1 = 0, canopyY1 = 0;
  const petals = P.petal.map((c, i) => sprite(`spetal${c}${i}`, 40, (g, s) => {
    const gr = g.createLinearGradient(0, s, s, 0);
    gr.addColorStop(0, mix(c, "#ffffff", 0.45)); gr.addColorStop(1, c);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(s * 0.5, s * 0.96);
    g.bezierCurveTo(s * 0.08, s * 0.7, s * 0.1, s * 0.2, s * 0.4, s * 0.08);
    g.lineTo(s * 0.5, s * 0.2);
    g.lineTo(s * 0.6, s * 0.08);
    g.bezierCurveTo(s * 0.9, s * 0.2, s * 0.92, s * 0.7, s * 0.5, s * 0.96);
    g.fill();
  }));
  const warm = glow(dark ? "#ffb3d1" : "#fff0c2", 0.25, 96), lanternGlow = glow(P.lantern, 0.2, 64);
  const fall = new Pool(56), taps = new Pool(110), flashes = new Pool(3);
  let gust = 0, gustT = 4, gustDur = 0, shake = 0;
  let lanterns: number[] = [];

  /* ── tree ── */
  const blossom = (g: Ctx, x: number, y: number, r: number, rr: () => number) => {
    const n = 7 + Math.floor(rr() * 6);
    for (let i = 0; i < n; i++) {
      const a = rr() * TAU, d = rr() * r * 0.9, s = r * (0.28 + rr() * 0.25);
      g.fillStyle = P.bloom[2]; g.globalAlpha = 0.9;
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d + s * 0.25, s, 0, TAU); g.fill();
    }
    for (let i = 0; i < n + 4; i++) {
      const a = rr() * TAU, d = rr() * r, s = r * (0.22 + rr() * 0.22);
      g.fillStyle = P.bloom[i % 3 === 0 ? 1 : 0]; g.globalAlpha = 0.95;
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d - s * 0.2, s, 0, TAU); g.fill();
    }
    g.fillStyle = P.bloom[3];
    for (let i = 0; i < 5; i++) {
      const a = rr() * TAU, d = rr() * r * 0.8;
      g.globalAlpha = 0.85; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d - r * 0.25, r * 0.1, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  };

  const buildTree = () => {
    tree = makeLayer(k, W, H, 1.5);
    const rr = rng(77);
    const L0 = Math.min(H * 0.2, W * 0.42), W0 = Math.min(W, H) * 0.055;
    const statics: Seg[] = [];
    const subtrees: { root: [number, number]; segs: Seg[]; tips: [number, number, number][] }[] = [];
    const grow = (x: number, y: number, a: number, len: number, wd: number, d: number, bucket: Seg[] | null, tips: [number, number, number][] | null) => {
      const bend = (rr() - 0.5) * 0.5;
      const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
      const cx = x + Math.cos(a + bend) * len * 0.5, cy = y + Math.sin(a + bend) * len * 0.5;
      const seg = { x0: x, y0: y, x1, y1, cx, cy, w: wd };
      let myBucket = bucket, myTips = tips;
      if (d === 2) { const st = { root: [x, y] as [number, number], segs: [], tips: [] }; subtrees.push(st); myBucket = st.segs; myTips = st.tips; }
      (myBucket ?? statics).push(seg);
      if (d >= 3 && myTips) myTips.push([(x + x1) / 2, (y + y1) / 2, L0 * (0.09 + rr() * 0.04)]);
      if (d >= 5 || len < 6) { if (myTips) myTips.push([x1, y1, L0 * (0.12 + rr() * 0.06)]); return; }
      const n = d === 0 ? 3 : rr() < 0.55 ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const spread = d === 0 ? 0.75 : 0.7;
        // Bias toward the right and slightly up so the canopy frames the top edge.
        const na = a + (i - (n - 1) / 2) * spread * (0.7 + rr() * 0.5) + (d < 2 ? 0.12 : 0.02);
        grow(x1, y1, clamp(na, -2.5, -0.3), len * (d === 0 ? 0.78 : 0.72) * (0.85 + rr() * 0.3), wd * 0.62, d + 1, myBucket, myTips);
      }
    };
    grow(-W0 * 0.2, H + 4, -1.42, L0, W0, 0, null, null);

    const drawSeg = (g: Ctx, s: Seg) => {
      g.lineWidth = s.w; g.strokeStyle = P.bark;
      g.beginPath(); g.moveTo(s.x0, s.y0); g.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1); g.stroke();
      if (s.w > 3) {
        g.lineWidth = s.w * 0.28; g.strokeStyle = P.barkHi;
        g.beginPath(); g.moveTo(s.x0 - s.w * 0.2, s.y0); g.quadraticCurveTo(s.cx - s.w * 0.2, s.cy, s.x1 - s.w * 0.15, s.y1); g.stroke();
      }
    };
    const tg = tree.g;
    tg.lineCap = "round";
    for (const s of statics) drawSeg(tg, s);

    // Each depth-2 subtree becomes a sprite that sways around its root.
    groups = [];
    canopyX0 = W; canopyX1 = 0; canopyY1 = 0;
    for (const st of subtrees) {
      let x0 = st.root[0], y0 = st.root[1], x1 = x0, y1 = y0;
      for (const s of st.segs) { x0 = Math.min(x0, s.x0, s.x1); x1 = Math.max(x1, s.x0, s.x1); y0 = Math.min(y0, s.y0, s.y1); y1 = Math.max(y1, s.y0, s.y1); }
      const pad = L0 * 0.25;
      x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
      const L = makeLayer(k, x1 - x0, y1 - y0, 1.5);
      L.g.translate(-x0, -y0); L.g.lineCap = "round";
      for (const s of st.segs) drawSeg(L.g, s);
      for (const [bx, by, br] of st.tips) blossom(L.g, bx, by, br, rr);
      groups.push({ px: st.root[0], py: st.root[1], c: L.c, ox: x0, oy: y0, cw: x1 - x0, ch: y1 - y0, ph: rr() * TAU, amp: 0.012 + rr() * 0.015 });
      canopyX0 = Math.min(canopyX0, x0); canopyX1 = Math.max(canopyX1, x1); canopyY1 = Math.max(canopyY1, (y0 + y1) / 2);
    }
  };

  const torii = (g: Ctx, x: number, by: number, s: number) => {
    const pw = s * 0.07, ph = s * 0.8, span = s * 0.62;
    g.fillStyle = P.torii;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(x + sx * span / 2 - pw * 0.5, by - ph); g.lineTo(x + sx * span / 2 + pw * 0.5, by - ph);
      g.lineTo(x + sx * (span / 2 + pw * 0.15) + pw * 0.6, by); g.lineTo(x + sx * (span / 2 + pw * 0.15) - pw * 0.6, by); g.closePath(); g.fill();
    }
    g.fillRect(x - span * 0.62, by - ph * 0.78, span * 1.24, s * 0.05); // nuki
    g.fillRect(x - pw * 0.35, by - ph * 0.98, pw * 0.7, ph * 0.22); // gakuzuka
    // Kasagi: the upswept top beam.
    const tw = span * 0.78, ty = by - ph - s * 0.02;
    g.beginPath();
    g.moveTo(x - tw, ty - s * 0.1); g.quadraticCurveTo(x, ty + s * 0.02, x + tw, ty - s * 0.1);
    g.lineTo(x + tw * 0.96, ty + s * 0.0); g.quadraticCurveTo(x, ty + s * 0.1, x - tw * 0.96, ty);
    g.closePath(); g.fill();
    g.fillStyle = P.toriiTop;
    g.beginPath();
    g.moveTo(x - tw * 1.04, ty - s * 0.14); g.quadraticCurveTo(x, ty - s * 0.03, x + tw * 1.04, ty - s * 0.14);
    g.lineTo(x + tw, ty - s * 0.09); g.quadraticCurveTo(x, ty + s * 0.01, x - tw, ty - s * 0.09);
    g.closePath(); g.fill();
  };

  const build = () => {
    base = makeLayer(k, W, H, 1.5);
    const g = base.g, HY = H * 0.74;
    g.fillStyle = vgrad(g, 0, HY, [0, P.sky[0], 0.6, P.sky[1], 1, P.sky[2]]);
    g.fillRect(0, 0, W, H);
    // Sun / moon low over Fuji.
    const sx = W * 0.66, sy = H * 0.46, sr = Math.min(W, H) * 0.09;
    g.globalAlpha = dark ? 0.45 : 0.7; blit(g, glow(P.sun, 0.25, 128), sx, sy, sr * 5); g.globalAlpha = 1;
    g.fillStyle = P.sun; g.globalAlpha = dark ? 0.95 : 0.85; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill(); g.globalAlpha = 1;
    // Mount Fuji.
    const fx = W * 0.6, fw = Math.max(W * 0.62, H * 0.32), ft = H * 0.52, fb = HY + 4;
    const fujiPath = () => {
      g.beginPath();
      g.moveTo(fx - fw, fb);
      g.bezierCurveTo(fx - fw * 0.45, fb - (fb - ft) * 0.35, fx - fw * 0.18, ft + (fb - ft) * 0.1, fx - fw * 0.1, ft);
      g.lineTo(fx + fw * 0.1, ft);
      g.bezierCurveTo(fx + fw * 0.18, ft + (fb - ft) * 0.1, fx + fw * 0.45, fb - (fb - ft) * 0.35, fx + fw, fb);
      g.closePath();
    };
    g.fillStyle = vgrad(g, ft, fb, [0, P.fuji, 1, mix(P.fuji, P.sky[2], 0.55)]); fujiPath(); g.fill();
    // Snow cap with a jagged hem.
    g.save(); fujiPath(); g.clip();
    g.fillStyle = vgrad(g, ft, ft + (fb - ft) * 0.4, [0, P.snow, 1, mix(P.snow, P.fuji, 0.25)]);
    g.beginPath(); g.moveTo(fx - fw, ft - 4);
    const hem = ft + (fb - ft) * 0.3, r = rng(5);
    for (let i = 0; i <= 16; i++) { const xx = fx - fw * 0.35 + (fw * 0.7) * (i / 16); g.lineTo(xx, hem + (i % 2 ? -1 : 1) * (fb - ft) * (0.04 + r() * 0.08)); }
    g.lineTo(fx + fw, ft - 4); g.closePath(); g.fill();
    g.fillStyle = rgba(P.fujiShade, 0.35); g.fillRect(fx + fw * 0.02, ft, fw, fb - ft);
    g.restore();
    // Mist bands.
    for (let i = 0; i < 3; i++) {
      const my = HY - H * 0.05 + i * H * 0.04;
      g.fillStyle = vgrad(g, my - H * 0.03, my + H * 0.03, [0, rgba(P.mist, 0), 0.5, rgba(P.mist, dark ? 0.35 : 0.65), 1, rgba(P.mist, 0)]);
      g.fillRect(0, my - H * 0.03, W, H * 0.06);
    }
    ridge(g, W, H, { y: HY + H * 0.02, amp: H * 0.05, seed: 3, scale: 220, fill: mix(P.hills[0], P.mist, 0.3), oct: 3 });
    const hill = ridge(g, W, H, { y: HY + H * 0.09, amp: H * 0.06, seed: 9, scale: 180, fill: P.hills[1], oct: 3, shape: (u) => 0.4 + u });
    // Torii on the right hill, with stone lanterns.
    const tx = W * 0.8, tby = ridgeAt(hill, tx) + 3, ts = Math.min(W, H) * 0.26;
    torii(g, tx, tby, ts);
    lanterns = [tx - ts * 0.6, tby - ts * 0.16, tx + ts * 0.6, tby - ts * 0.16];
    g.fillStyle = mix(P.hills[2], "#888899", 0.2);
    for (let i = 0; i < 2; i++) {
      const lx = lanterns[i * 2], ly = tby;
      g.fillRect(lx - ts * 0.03, ly - ts * 0.16, ts * 0.06, ts * 0.16);
      g.fillRect(lx - ts * 0.07, ly - ts * 0.22, ts * 0.14, ts * 0.06);
      g.beginPath(); g.moveTo(lx - ts * 0.09, ly - ts * 0.22); g.lineTo(lx, ly - ts * 0.29); g.lineTo(lx + ts * 0.09, ly - ts * 0.22); g.fill();
      g.fillStyle = P.lantern; g.fillRect(lx - ts * 0.035, ly - ts * 0.21, ts * 0.07, ts * 0.04); g.fillStyle = mix(P.hills[2], "#888899", 0.2);
      lanterns[i * 2 + 1] = ly - ts * 0.19;
    }
    // Foreground ground carpeted with fallen petals.
    ridge(g, W, H, { y: H * 0.95, amp: H * 0.035, seed: 15, scale: 160, fill: P.ground, oct: 3 });
    const rp = rng(21);
    for (let i = 0; i < W / 3; i++) {
      const px = rp() * W, py = H * 0.93 + rp() * H * 0.07;
      g.globalAlpha = 0.5 + rp() * 0.4;
      g.drawImage(petals[i % 3], px, py, 5, 5);
    }
    g.globalAlpha = 1;
    calm(g, W, H, P.sky[1], dark ? 0.2 : 0.35, 0.42);
    buildTree();
    fore = makeLayer(k, W, H, 1);
    vignette(fore.g, W, H, P.edge, dark ? 0.55 : 0.22, 0.5);
    fall.clear();
    for (let i = 0; i < 40; i++) spawnFall(fall.get(), true);
  };

  const spawnFall = (p = fall.get(), init = false) => {
    const fromTree = Math.random() < 0.7;
    p.x = fromTree ? rand(canopyX0, canopyX1) : rand(-W * 0.2, W);
    p.y = init ? rand(0, H) : fromTree ? rand(0, canopyY1) : -10;
    p.vx = rand(10, 26); p.vy = rand(16, 32); p.max = rand(14, 22); p.life = init ? rand(0, p.max * 0.6) : 0;
    p.size = rand(4, 7.5); p.rot = rand(0, TAU); p.vr = rand(-1.4, 1.4); p.a = rand(0, TAU); p.b = rand(1.6, 3.2); p.kind = Math.floor(Math.random() * 3);
  };
  build();

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      const n = big ? 70 : 16;
      for (let i = 0; i < n; i++) {
        const p = taps.get();
        p.x = x; p.y = y; p.a = rand(0, TAU); p.b = big ? rand(0, 30) : rand(4, 16);
        p.size = rand(4, big ? 8 : 6.5); p.rot = rand(0, TAU); p.vr = rand(-5, 5); p.max = rand(2.2, big ? 3.6 : 2.8);
        p.kind = i % 3; p.vx = big ? rand(150, 320) : rand(60, 120); p.vy = 0;
      }
      if (big) { const f = flashes.get(); f.x = x; f.y = y; f.max = 1.5; shake = 1; gust = Math.max(gust, 0.6); }
    },
    frame(dt, t) {
      const sc = k;
      // Wind: a gentle base plus occasional gusts.
      if (dt > 0) {
        gustT -= dt;
        if (gustT <= 0 && gustDur <= 0) { gustDur = rand(4, 6); gustT = rand(7, 13); }
        if (gustDur > 0) { gustDur -= dt; gust = Math.min(1, gust + dt * 0.6); } else gust = Math.max(0, gust - dt * 0.35);
      }
      shake = Math.max(0, shake - dt * 0.7);
      const wind = 14 + gust * 70;
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);
      if (dark) {
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 2; i++) { ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 2 + i * 3); blit(ctx, lanternGlow, lanterns[i * 2], lanterns[i * 2 + 1], Math.min(W, H) * 0.05); }
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      }

      // Tree: static trunk, swaying outer branches.
      ctx.drawImage(tree.c, 0, 0, W, H);
      for (const gr of groups) {
        const ang = Math.sin(t * 0.9 + gr.ph) * gr.amp * (1 + gust * 1.8) + gust * 0.02 + Math.sin(t * 9) * shake * 0.03;
        ctx.setTransform(sc, 0, 0, sc, 0, 0);
        ctx.translate(gr.px, gr.py); ctx.rotate(ang); ctx.translate(-gr.px, -gr.py);
        ctx.drawImage(gr.c, gr.ox, gr.oy, gr.cw, gr.ch);
      }
      ctx.setTransform(sc, 0, 0, sc, 0, 0);

      // Falling petals.
      for (const p of fall.items) {
        if (!p.on) continue;
        p.life += dt;
        if (p.life >= p.max || p.y > H + 20 || p.x > W + 30) { spawnFall(p); continue; }
        p.a += dt * p.b;
        p.x += (p.vx + wind + Math.sin(p.a * 0.5) * 12) * dt; p.y += (p.vy + Math.cos(p.a) * 6) * dt; p.rot += (p.vr + gust * 2) * dt;
        ctx.globalAlpha = env(p.life / p.max, 0.06, 0.12);
        ctx.setTransform(sc, 0, 0, sc, 0, 0);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.a), 0.75 + 0.25 * Math.sin(p.a * 0.7));
        ctx.drawImage(petals[p.kind], -p.size, -p.size, p.size * 2, p.size * 2);
      }
      ctx.setTransform(sc, 0, 0, sc, 0, 0);

      // Tap swirls / celebration burst.
      for (const f of flashes.items) {
        if (!f.on) continue;
        f.life += dt;
        const q = f.life / f.max;
        if (q >= 1) { f.on = false; continue; }
        ctx.globalAlpha = Math.sin(q * Math.PI) * 0.75;
        blit(ctx, warm, f.x, f.y, Math.min(W, H) * (0.15 + q * 0.4));
      }
      for (const p of taps.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        // Spiral outward: angular speed eases off as the radius grows.
        const spin = 5.5 * (1 - q) + 0.6;
        p.a += spin * dt; p.b += p.vx * dt * (1 - q) * 0.6; p.vy += dt * 40;
        const px = p.x + Math.cos(p.a) * p.b + wind * p.life * 0.5, py = p.y + Math.sin(p.a) * p.b * 0.8 + p.vy * p.life * 0.5;
        p.rot += p.vr * dt;
        ctx.globalAlpha = env(q, 0.04, 0.35);
        ctx.setTransform(sc, 0, 0, sc, 0, 0);
        ctx.translate(px, py); ctx.rotate(p.rot); ctx.scale(Math.cos(p.a * 1.7), 1);
        ctx.drawImage(petals[p.kind], -p.size, -p.size, p.size * 2, p.size * 2);
      }
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
