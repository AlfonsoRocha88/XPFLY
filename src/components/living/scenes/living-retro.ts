/** Retro 8-bit (epic): a pixel-art sunset, drawn on a ~160px-wide canvas and scaled up with
 *  smoothing off. Dithered sky bands, a striped sun, parallax pixel mountains, a scrolling pixel
 *  city on the shore, shimmering water, twinkling pixel stars (or drifting clouds by day).
 *  Tap = pixel sparkles; celebration = a pixel firework and a rising "+XP". */
import type { SceneInstance } from "../engine";
import { type Ctx, noise1, previewOf, rng } from "./shared";

const PAL = {
  dark: {
    sky: ["#140b2b", "#1f1142", "#33175c", "#55207a", "#84297f", "#b93c78", "#e2566a", "#f4845f"],
    sun: ["#ffe27a", "#ffc65e", "#ffa25a", "#ff7d5e", "#ff5e7c"], far: "#4a2370", farTop: "#6a3590", near: "#2a1448", nearTop: "#3d1f62",
    city: "#130a26", win: ["#ffd36b", "#ff9ad5", "#8be9ff"], water: "#1a0f3a", wave: "#ff8a5c", wave2: "#7a3d8f", star: "#ffffff", cloud: "#4a2a6e",
    spark: ["#ffffff", "#ffe27a", "#ff7ad9", "#7af3ff"], text: "#ffe27a", textShadow: "#2a0f3a",
  },
  light: {
    sky: ["#7fc8ff", "#93d1ff", "#abdcff", "#c8e5ff", "#ffd8ea", "#ffc4cf", "#ffb3a6", "#ffc98a"],
    sun: ["#fff6b0", "#ffe27a", "#ffc86b", "#ffa66b", "#ff8a7a"], far: "#b79bdf", farTop: "#d2bdf0", near: "#8f74c2", nearTop: "#a991d8",
    city: "#6c56a0", win: ["#fff1b8", "#ffd1ea", "#d2f6ff"], water: "#8fc6f5", wave: "#fff3c4", wave2: "#b9dcfa", star: "#ffffff", cloud: "#ffffff",
    spark: ["#ffffff", "#ffd84a", "#ff6fb5", "#4ad9ff"], text: "#ff5fa0", textShadow: "#ffffff",
  },
};

// 3×5 pixel glyphs.
const GLYPHS: Record<string, string[]> = {
  "+": ["...", ".#.", "###", ".#.", "..."],
  X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  P: ["##.", "#.#", "##.", "#..", "#.."],
};

type Spark = { on: boolean; x: number; y: number; vx: number; vy: number; life: number; max: number; c: number; big: boolean };

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  let W = w, H = h, S = 3, LW = 160, LH = 300, HY = 200;
  const low = document.createElement("canvas");
  const lg = low.getContext("2d") as Ctx;
  let sky: HTMLCanvasElement, far: HTMLCanvasElement, near: HTMLCanvasElement, city: HTMLCanvasElement;
  let PF = 320, PC = 320;
  const NS = 46;
  const sx = new Int16Array(NS), sy = new Int16Array(NS), sp = new Float32Array(NS);
  const sparks: Spark[] = Array.from({ length: 160 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, c: 0, big: false }));
  let sCur = 0;
  const spawn = () => { const s = sparks[sCur]; sCur = (sCur + 1) % sparks.length; s.on = true; s.life = 0; return s; };
  const texts = Array.from({ length: 3 }, () => ({ on: false, x: 0, y: 0, life: 0 }));
  const rockets = Array.from({ length: 3 }, () => ({ on: false, x: 0, y: 0, ty: 0, life: 0 }));

  const canvas = (cw: number, ch: number) => { const c = document.createElement("canvas"); c.width = cw; c.height = ch; return c; };

  const build = () => {
    S = Math.max(2, Math.round(W / 160));
    LW = Math.ceil(W / S); LH = Math.ceil(H / S); HY = Math.round(LH * 0.68);
    low.width = LW; low.height = LH;
    // Sky: dithered bands + striped sun, baked.
    sky = canvas(LW, LH);
    const g = sky.getContext("2d") as Ctx;
    const nb = P.sky.length, bh = HY / nb;
    for (let y = 0; y < HY; y++) {
      const b = Math.min(nb - 1, Math.floor(y / bh)), f = (y - b * bh) / bh;
      g.fillStyle = P.sky[b]; g.fillRect(0, y, LW, 1);
      if (b < nb - 1 && f > 0.55) {
        // Checker dither into the next band.
        g.fillStyle = P.sky[b + 1];
        const step = f > 0.8 ? 2 : 4;
        for (let x = (y % 2) * (step / 2); x < LW; x += step) g.fillRect(x, y, 1, 1);
      }
    }
    const r = Math.round(Math.min(LW * 0.26, HY * 0.3)), cx = Math.round(LW / 2), cy = HY - Math.round(r * 0.3);
    for (let y = -r; y <= HY - cy; y++) {
      const half = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
      const q = (y + r) / r;
      if (q > 0.45) { const band = Math.floor((q - 0.45) * 14); if (band % 2 === 1 && (y + r) % 3 !== 0) continue; }
      g.fillStyle = P.sun[Math.min(P.sun.length - 1, Math.floor(q * P.sun.length))];
      g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
    // Water.
    g.fillStyle = P.water; g.fillRect(0, HY, LW, LH - HY);
    // Mountain strips (two copies wide so they can wrap).
    const strip = (period: number, seed: number, base: number, amp: number, col: string, top: string, sharp: boolean) => {
      const c = canvas(period * 2, LH), sg = c.getContext("2d") as Ctx, nz = noise1(seed);
      for (let x = 0; x < period; x++) {
        // Periodic noise: blend the end into the start.
        const u = x / period;
        let v = nz(x / (sharp ? 24 : 30), 3) * (1 - u) + nz((x - period) / (sharp ? 24 : 30), 3) * u;
        v = Math.min(1, Math.max(0, (v - 0.25) / 0.5));
        if (sharp) v = 1 - Math.abs(Math.sin(v * 2.2)) * 0.15 - (1 - v) * 0.85; // crisp-ish peaks, wide bases
        const hh = Math.round(v * amp) + 1;
        for (const off of [0, period]) {
          sg.fillStyle = col; sg.fillRect(x + off, base - hh, 1, hh + 1);
          sg.fillStyle = top; sg.fillRect(x + off, base - hh, 1, 1);
          if (sharp && v > 0.8) { sg.fillStyle = "#ffffff"; sg.globalAlpha = 0.6; sg.fillRect(x + off, base - hh, 1, 2); sg.globalAlpha = 1; }
        }
      }
      return c;
    };
    PF = LW * 2; PC = LW * 2;
    far = strip(PF, 5, HY, Math.round(HY * 0.26), P.far, P.farTop, true);
    near = strip(PF, 9, HY + 1, Math.round(HY * 0.12), P.near, P.nearTop, false);
    // City strip.
    city = canvas(PC * 2, LH);
    const cg = city.getContext("2d") as Ctx, rr = rng(3);
    let x = 0;
    const bld: [number, number, number][] = [];
    while (x < PC) {
      const bw = 5 + Math.floor(rr() * 9), bh2 = 6 + Math.floor(rr() * (HY * 0.16));
      bld.push([x, bw, bh2]); x += bw + (rr() < 0.3 ? 1 : 0);
    }
    for (const off of [0, PC]) for (const [bx, bw, bh2] of bld) {
      if (bx + bw > PC) continue;
      cg.fillStyle = P.city; cg.fillRect(bx + off, HY - bh2, bw, bh2 + 1);
      if (bh2 > 14 && bw > 6) cg.fillRect(bx + off + Math.floor(bw / 2), HY - bh2 - 3, 1, 3);
      const r2 = rng(bx * 7 + 1);
      for (let wy = HY - bh2 + 2; wy < HY - 1; wy += 2) for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) {
        if (r2() < 0.33) { cg.fillStyle = P.win[Math.floor(r2() * 3)]; cg.fillRect(wx + off, wy, 1, 1); }
      }
    }
    const rs = rng(77);
    for (let i = 0; i < NS; i++) { sx[i] = Math.floor(rs() * LW); sy[i] = Math.floor(rs() * HY * 0.6); sp[i] = rs() * 6.28; }
    for (const s of sparks) s.on = false;
  };
  build();

  const glyph = (txt: string, x0: number, y0: number, px: number, col: string) => {
    lg.fillStyle = col;
    let cx = x0;
    for (const ch of txt) {
      const gl = GLYPHS[ch];
      if (gl) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (gl[r][c] === "#") lg.fillRect(cx + c * px, y0 + r * px, px, px);
      cx += 4 * px;
    }
  };

  const firework = (x: number, y: number) => {
    const n = 44, c0 = Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const s = spawn(), a = (i / n) * Math.PI * 2, sp2 = 18 + (i % 3) * 8;
      s.x = x; s.y = y; s.vx = Math.cos(a) * sp2; s.vy = Math.sin(a) * sp2; s.max = 1.4 + Math.random() * 0.6; s.c = (c0 + (i % 2)) % 4; s.big = i % 4 === 0;
    }
  };

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      const lx = Math.round(x / S), ly = Math.round(y / S);
      if (big) {
        const rk = rockets.find((r) => !r.on) ?? rockets[0];
        rk.on = true; rk.x = lx; rk.y = LH; rk.ty = Math.max(8, ly - 6); rk.life = 0;
        return;
      }
      for (let i = 0; i < 9; i++) {
        const s = spawn(), a = Math.random() * Math.PI * 2, sp2 = 6 + Math.random() * 16;
        s.x = lx; s.y = ly; s.vx = Math.cos(a) * sp2; s.vy = Math.sin(a) * sp2 - 6; s.max = 0.5 + Math.random() * 0.5; s.c = i % 4; s.big = i < 3;
      }
    },
    frame(dt, t) {
      lg.imageSmoothingEnabled = false;
      lg.drawImage(sky, 0, 0);
      // Stars twinkle by night; little clouds drift by day.
      if (dark) {
        lg.fillStyle = P.star;
        for (let i = 0; i < NS; i++) {
          const v = Math.sin(t * 1.5 + sp[i]);
          if (v < -0.3) continue;
          lg.globalAlpha = v > 0.85 ? 1 : 0.55;
          lg.fillRect(sx[i], sy[i], 1, 1);
          if (v > 0.93) { lg.fillRect(sx[i] - 1, sy[i], 3, 1); lg.fillRect(sx[i], sy[i] - 1, 1, 3); }
        }
        lg.globalAlpha = 1;
      } else {
        lg.fillStyle = P.cloud;
        for (let i = 0; i < 4; i++) {
          const cx = Math.round(((t * (1.5 + i * 0.6) + i * 57) % (LW + 40)) - 20), cy = 8 + i * Math.round(HY * 0.12);
          lg.fillRect(cx, cy, 14, 3); lg.fillRect(cx + 3, cy - 2, 7, 2); lg.fillRect(cx + 5, cy - 3, 3, 1);
        }
      }
      // Parallax: far mountains, near hills, city.
      const of = Math.floor(t * 1.5) % PF, on = Math.floor(t * 3.5) % PF, oc = Math.floor(t * 6) % PC;
      lg.drawImage(far, -of, 0);
      lg.drawImage(near, -on, 0);
      lg.drawImage(city, -oc, 0);
      // Water shimmer: sun reflection stripes and wave dashes.
      const cx = Math.round(LW / 2);
      for (let y = HY + 2; y < LH; y += 3) {
        const d = (y - HY) / (LH - HY);
        const half = Math.round(LW * (0.2 - d * 0.16) + Math.sin(t * 2 + y) * 1.5);
        if (half > 0) {
          lg.fillStyle = (y + Math.floor(t * 3)) % 6 < 3 ? P.wave : P.sun[2];
          const seg = 2 + ((y * 7) % 5);
          for (let x = cx - half + ((y * 5) % 4); x < cx + half; x += seg + 4) lg.fillRect(x + ((Math.floor(t * 3) + y) % 3), y, seg, 1);
        }
        if (y % 6 === 1) {
          lg.fillStyle = P.wave2;
          for (let x = (y * 13 + Math.floor(t * (2 + d * 6))) % 23; x < LW; x += 23) lg.fillRect(x, y, 4, 1);
        }
      }

      // Rockets → fireworks.
      for (const rk of rockets) {
        if (!rk.on) continue;
        rk.life += dt;
        rk.y -= dt * 240;
        lg.fillStyle = P.spark[1]; lg.fillRect(rk.x, Math.round(rk.y), 1, 2);
        lg.fillStyle = P.spark[2]; lg.fillRect(rk.x, Math.round(rk.y) + 3, 1, 1);
        if (rk.y <= rk.ty) {
          rk.on = false; firework(rk.x, rk.ty);
          const tx = texts.find((q) => !q.on) ?? texts[0];
          tx.on = true; tx.x = rk.x - 11; tx.y = rk.ty - 4; tx.life = 0;
        }
      }
      for (const s of sparks) {
        if (!s.on) continue;
        s.life += dt;
        if (s.life >= s.max) { s.on = false; continue; }
        const f = Math.pow(0.2, dt);
        s.vx *= f; s.vy = s.vy * f + 14 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const q = s.life / s.max;
        if (q > 0.7 && Math.floor(s.life * 20) % 2 === 0) continue; // blink out
        lg.fillStyle = P.spark[s.c];
        const px = Math.round(s.x), py = Math.round(s.y);
        lg.fillRect(px, py, 1, 1);
        if (s.big && q < 0.5) { lg.fillRect(px - 1, py, 3, 1); lg.fillRect(px, py - 1, 1, 3); }
      }
      for (const tx of texts) {
        if (!tx.on) continue;
        tx.life += dt;
        if (tx.life > 2) { tx.on = false; continue; }
        if (tx.life < 0.15) continue; // just after the burst
        const q = (tx.life - 0.15) / 1.85;
        if (q > 0.75 && Math.floor(tx.life * 12) % 2 === 0) continue;
        const y = Math.round(tx.y - q * 14);
        glyph("+XP", tx.x + 1, y + 1, 2, P.textShadow);
        glyph("+XP", tx.x, y, 2, P.text);
      }

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(low, 0, 0, LW * S, LH * S);
      ctx.imageSmoothingEnabled = true;
    },
  };
}

export const drawPreview = previewOf(create);
