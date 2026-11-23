/** Océano (epic): sunlit water — god-rays from a shimmering surface, distant reef ridges fading into
 *  blue, kelp swaying at the edges, a small school of fish, plankton and rising bubbles.
 *  Taps release bubbles; a celebration sends up a column of bubbles with a burst of light. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, calm, env, glow, makeLayer, mix, previewOf, radial, rand, rgba, ridge, rng, scaleOf, sprite, vgrad, vignette,
} from "./shared";

const PAL = {
  light: { water: ["#e3f8ff", "#a9def2", "#4f9fc8"], reef: ["#8cc6dd", "#6eb0cf", "#4f93b8"], sand: "#d9caa0", kelp: "#3f9a7a", kelp2: "#62b58e", ray: "#ffffff", rayA: 0.32, fish: "#3d7fa6", mote: "#ffffff", edge: "#2f6e93", glowc: "#fff9d8" },
  dark: { water: ["#0b3d5c", "#062538", "#020a14"], reef: ["#0b3048", "#082538", "#061b2a"], sand: "#0c2230", kelp: "#0f4a44", kelp2: "#15605a", ray: "#9fe6ff", rayA: 0.13, fish: "#0f3a55", mote: "#8ff3ff", edge: "#01050b", glowc: "#8ff3ff" },
};

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, base: Layer, fore: Layer;
  const bubble = sprite(`obub${dark}`, 64, (g, s) => {
    const c = s / 2, r = s * 0.44;
    g.fillStyle = radial(g, c, c, r, [0, rgba("#bfefff", 0.05), 0.8, rgba("#bfefff", dark ? 0.18 : 0.28), 1, rgba("#ffffff", 0.75)]);
    g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.ellipse(c - r * 0.38, c - r * 0.4, r * 0.22, r * 0.14, -0.7, 0, TAU); g.fill();
  });
  const ray = sprite(`oray${dark}`, 128, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, rgba(P.ray, 1)); gr.addColorStop(1, rgba(P.ray, 0));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(s * 0.42, 0); g.lineTo(s * 0.58, 0); g.lineTo(s * 0.9, s); g.lineTo(s * 0.1, s); g.closePath(); g.fill();
  });
  const mote = glow(P.mote, 0.2, 32), light = glow(P.glowc, 0.25, 96);
  const bubbles = new Pool(90), motes = new Pool(24), flashes = new Pool(3);
  const NK = 9, SEG = 14;
  const kx = new Float32Array(NK), kh = new Float32Array(NK), kp = new Float32Array(NK), kw = new Float32Array(NK);
  const px = new Float32Array(SEG + 1), py = new Float32Array(SEG + 1);
  const NFISH = 7;
  const fy = new Float32Array(NFISH), fo = new Float32Array(NFISH), fsz = new Float32Array(NFISH);

  const spawnBubble = (p = bubbles.get(), init = false) => {
    p.x = rand(0, W); p.y = init ? rand(0, H) : H + rand(0, 40); p.vy = rand(-22, -42); p.vx = 0;
    p.max = 30; p.life = 0; p.size = rand(2, 5.5); p.a = rand(0, TAU); p.vr = rand(1, 2.2); p.kind = 0;
  };

  const build = () => {
    base = makeLayer(k, W, H, 1.5);
    const g = base.g;
    g.fillStyle = vgrad(g, 0, H, [0, P.water[0], 0.45, P.water[1], 1, P.water[2]]);
    g.fillRect(0, 0, W, H);
    const fogc = P.water[1];
    ridge(g, W, H, { y: H * 0.8, amp: H * 0.14, seed: 3, scale: 240, fill: mix(P.reef[0], fogc, 0.55), oct: 4 });
    ridge(g, W, H, { y: H * 0.87, amp: H * 0.1, seed: 8, scale: 180, fill: mix(P.reef[1], fogc, 0.3), oct: 4 });
    ridge(g, W, H, { y: H * 0.95, amp: H * 0.06, seed: 13, scale: 120, fill: vgrad(g, H * 0.88, H, [0, P.reef[2], 1, P.sand]), oct: 3 });
    // Rocks with soft top light.
    const r = rng(4);
    for (let i = 0; i < 5; i++) {
      const x = (i < 3 ? r() * W * 0.25 : W * 0.75 + r() * W * 0.25), rw = Math.min(W, H) * (0.05 + r() * 0.06);
      g.fillStyle = vgrad(g, H - rw, H, [0, mix(P.reef[2], "#ffffff", dark ? 0.05 : 0.18), 1, P.reef[2]]);
      g.beginPath(); g.ellipse(x, H - rw * 0.15, rw, rw * 0.55, 0, Math.PI, 0); g.fill();
    }
    calm(g, W, H, P.water[1], dark ? 0.3 : 0.35);
    fore = makeLayer(k, W, H, 1);
    vignette(fore.g, W, H, P.edge, dark ? 0.55 : 0.28, 0.45);

    const rk = rng(17);
    for (let i = 0; i < NK; i++) {
      const left = i < NK / 2;
      kx[i] = left ? rk() * W * 0.22 : W - rk() * W * 0.22;
      kh[i] = H * (0.2 + rk() * 0.22); kp[i] = rk() * TAU; kw[i] = 5 + rk() * 5;
    }
    for (let i = 0; i < NFISH; i++) { fy[i] = H * 0.55 + (rk() - 0.5) * H * 0.08; fo[i] = rk() * 60 + i * 22; fsz[i] = 6 + rk() * 4; }
    bubbles.clear(); motes.clear();
    for (let i = 0; i < 22; i++) spawnBubble(bubbles.get(), true);
    for (let i = 0; i < motes.items.length; i++) { const m = motes.get(); m.x = rand(0, W); m.y = rand(0, H); m.a = rand(0, TAU); m.size = rand(1, 2.4); }
  };
  build();

  const drawKelp = (i: number, t: number) => {
    const x0 = kx[i], L = kh[i], wd = kw[i];
    for (let s = 0; s <= SEG; s++) {
      const q = s / SEG;
      px[s] = x0 + Math.sin(t * 0.9 + kp[i] + q * 3) * 18 * q * q + Math.sin(t * 0.4 + kp[i]) * 10 * q;
      py[s] = H + 4 - L * q;
    }
    ctx.beginPath();
    ctx.moveTo(px[0] - wd, py[0]);
    for (let s = 1; s <= SEG; s++) ctx.lineTo(px[s] - wd * (1 - s / SEG) * (0.7 + 0.3 * Math.sin(s * 1.7)), py[s]);
    for (let s = SEG; s >= 0; s--) ctx.lineTo(px[s] + wd * (1 - s / SEG) * (0.7 + 0.3 * Math.cos(s * 1.3)), py[s]);
    ctx.fill();
  };

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      const n = big ? 34 : 7;
      for (let i = 0; i < n; i++) {
        const p = bubbles.get();
        p.x = x + rand(-14, 14) * (big ? 2 : 1); p.y = y + rand(-6, 10) + (big ? rand(0, 60) : 0); p.vx = rand(-18, 18); p.vy = rand(-60, big ? -190 : -110);
        p.max = rand(1.6, 2.8); p.size = rand(2.5, big ? 9 : 6); p.a = rand(0, TAU); p.vr = rand(2, 4); p.kind = 1;
      }
      if (big) { const f = flashes.get(); f.x = x; f.y = y; f.max = 1.4; }
    },
    frame(dt, t) {
      ctx.globalAlpha = 1;
      ctx.drawImage(base.c, 0, 0, W, H);

      // God-rays from the surface.
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (let i = 0; i < 6; i++) {
        const x = W * (0.05 + i * 0.19) + Math.sin(t * 0.25 + i * 1.7) * 30;
        ctx.globalAlpha = P.rayA * (0.55 + 0.45 * Math.sin(t * 0.4 + i * 2.3));
        ctx.save(); ctx.translate(x, -10); ctx.rotate(-0.28 + Math.sin(t * 0.1 + i) * 0.04);
        ctx.drawImage(ray, -W * 0.14, 0, W * 0.28, H * 0.9); ctx.restore();
      }
      // Surface shimmer.
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = P.ray; ctx.lineWidth = 1.2;
      for (let l = 0; l < 3; l++) {
        ctx.globalAlpha = (dark ? 0.12 : 0.4) * (1 - l * 0.28);
        ctx.beginPath();
        for (let x = 0; x <= W + 12; x += 12) {
          const y = 8 + l * 11 + Math.sin(x * 0.03 + t * (1.2 + l * 0.3) + l) * 3 + Math.sin(x * 0.011 - t * 0.7) * 2;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Far school of fish.
      ctx.fillStyle = P.fish;
      const span = W + 200;
      for (let i = 0; i < NFISH; i++) {
        const x = ((t * 22 + fo[i] + i * 31) % span) - 100, y = fy[i] + Math.sin(t * 0.8 + i) * 6, s = fsz[i];
        const wag = Math.sin(t * 8 + i * 1.3) * 0.35;
        ctx.globalAlpha = dark ? 0.55 : 0.35;
        ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.42, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - s * 0.8, y); ctx.lineTo(x - s * 1.6, y - s * (0.5 + wag)); ctx.lineTo(x - s * 1.6, y + s * (0.5 - wag)); ctx.closePath(); ctx.fill();
      }

      // Plankton motes.
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (const m of motes.items) {
        m.a += dt * 0.6;
        m.x += Math.sin(m.a) * 4 * dt; m.y -= 3 * dt;
        if (m.y < -5) { m.y = H + 5; m.x = rand(0, W); }
        ctx.globalAlpha = (dark ? 0.7 : 0.55) * (0.5 + 0.5 * Math.sin(m.a * 2.3));
        blit(ctx, mote, m.x, m.y, m.size * 2.5);
      }
      ctx.globalCompositeOperation = "source-over";

      // Kelp.
      ctx.globalAlpha = 1;
      for (let i = 0; i < NK; i++) { ctx.fillStyle = i % 2 ? P.kelp : P.kelp2; drawKelp(i, t); }

      // Bubbles.
      for (const p of bubbles.items) {
        if (!p.on) continue;
        p.life += dt;
        if (p.kind === 1 && p.life >= p.max) { p.on = false; continue; }
        if (p.kind === 0 && p.y < -20) { spawnBubble(p); continue; }
        p.a += p.vr * dt;
        p.x += (p.vx + Math.sin(p.a) * 12) * dt; p.y += p.vy * dt; p.vx *= 0.98;
        ctx.globalAlpha = p.kind ? env(p.life / p.max, 0.05, 0.3) * 0.95 : Math.min(1, p.life * 2) * 0.8;
        blit(ctx, bubble, p.x, p.y, p.size);
      }
      for (const f of flashes.items) {
        if (!f.on) continue;
        f.life += dt;
        const q = f.life / f.max;
        if (q >= 1) { f.on = false; continue; }
        ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
        ctx.globalAlpha = Math.sin(q * Math.PI) * 0.6;
        blit(ctx, light, f.x, f.y, Math.min(W, H) * (0.2 + q * 0.35));
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

export const drawPreview = previewOf(create);
