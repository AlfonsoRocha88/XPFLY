/** Gatitos (epic): a cozy window at night — moon and city lights outside, fairy lights along the
 *  frame, curtains, and two cats on the sill: tails swishing, ears twitching, slow blinks.
 *  Tap: the nearest cat turns to look. Celebration: both cats stretch and hearts float up. */
import type { SceneInstance } from "../engine";
import {
  type Ctx, type Layer, Pool, TAU, blit, clamp, env, glow, makeLayer, mix, previewOf, rand, rgba, rng, scaleOf, sparkle, sprite, stars, vgrad, vignette,
} from "./shared";

const PAL = {
  dark: {
    sky: ["#0b1030", "#1b2452", "#3a3f6e"], moon: "#fff4d6", city: ["#283058", "#1c2344"], win: "#ffd27a", cloud: "#3a416e",
    wall: ["#3a2a35", "#2a1e28"], lamp: "#ffb46b", frame: "#6b4a3a", frameHi: "#8a644f", sill: ["#8a614a", "#5e4033"], curtain: ["#6a4d78", "#4a3558"],
    bulb: "#ffd98a", wire: "#2a1f24", heart: "#ff7aa8", edge: "#07050a", plant: "#4f8a5a", pot: "#b9674a", sheen: "#ffffff", star: "#ffffff",
  },
  light: {
    sky: ["#7d86c9", "#c3a9d6", "#f6c4b8"], moon: "#fffaf0", city: ["#8d84b6", "#776fa3"], win: "#ffe3a3", cloud: "#e7d3ec",
    wall: ["#f4e6da", "#ead8c8"], lamp: "#ffd9a0", frame: "#c69a7a", frameHi: "#e2bc9c", sill: ["#d7ab88", "#b68765"], curtain: ["#e9b9c9", "#d69fb4"],
    bulb: "#ffd36b", wire: "#8a6a5a", heart: "#ff6f9f", edge: "#c9a48c", plant: "#6aa66f", pot: "#d98a66", sheen: "#ffffff", star: "#ffffff",
  },
};

const SIDES = [-1, 1], TOES = [-0.025, 0.02], BROWS = [-0.16, 0, 0.16];

interface Cat {
  x: number; s: number; body: string; light: string; dark: string; stripe: string | null; eye: string;
  tail: number; blinkT: number; blink: number; earT: number; ear: number; lookX: number; lookY: number; tx: number; ty: number; lookHold: number; dir: number;
}

export function create(ctx: Ctx, w: number, h: number, dark: boolean): SceneInstance {
  const P = dark ? PAL.dark : PAL.light;
  const k = scaleOf(ctx, w);
  let W = w, H = h, outside: Layer, room: Layer, fore: Layer;
  let wx0 = 0, wy0 = 0, wx1 = 0, wy1 = 0, sillY = 0, U = 1;
  const heart = sprite(`gheart${P.heart}`, 48, (g, s) => {
    g.fillStyle = vgrad(g, 0, s, [0, mix(P.heart, "#ffffff", 0.35), 1, P.heart]);
    g.beginPath();
    g.moveTo(s * 0.5, s * 0.88);
    g.bezierCurveTo(s * 0.05, s * 0.58, s * 0.08, s * 0.14, s * 0.32, s * 0.14);
    g.bezierCurveTo(s * 0.43, s * 0.14, s * 0.5, s * 0.24, s * 0.5, s * 0.3);
    g.bezierCurveTo(s * 0.5, s * 0.24, s * 0.57, s * 0.14, s * 0.68, s * 0.14);
    g.bezierCurveTo(s * 0.92, s * 0.14, s * 0.95, s * 0.58, s * 0.5, s * 0.88);
    g.fill();
  });
  const bulbGlow = glow(P.bulb, 0.25, 48), winGlow = glow(P.win, 0.3, 32), lampGlow = glow(P.lamp, 0.25, 128), moonGlow = glow(P.moon, 0.15, 128);
  const cloudS = glow(P.cloud, 0.45, 96);
  const hearts = new Pool(40), sparks = new Pool(20);
  const TW = 26;
  const twx = new Float32Array(TW), twy = new Float32Array(TW), twp = new Float32Array(TW);
  let stretch = 0, stretchT = 0;

  const dim = (c: string) => (dark ? mix(c, "#2a2440", 0.18) : c);
  const cats: Cat[] = [
    { x: 0, s: 0, body: dim("#f3a15a"), light: dim("#ffe0b8"), dark: dim("#c76f35"), stripe: dim("#d9793c"), eye: "#3b8a5a", tail: 0.3, blinkT: 2, blink: 0, earT: 3, ear: 0, lookX: 0.4, lookY: 0, tx: 0.4, ty: 0, lookHold: 0, dir: 1 },
    { x: 0, s: 0, body: dim("#7f8699"), light: dim("#f5f4f8"), dark: dim("#5d6375"), stripe: null, eye: "#d8a23a", tail: 2.1, blinkT: 3.4, blink: 0, earT: 5, ear: 0, lookX: -0.4, lookY: 0, tx: -0.4, ty: 0, lookHold: 0, dir: -1 },
  ];

  const build = () => {
    U = Math.min(W, H);
    wx0 = W * 0.07; wx1 = W * 0.93; wy0 = H * 0.05; sillY = H * 0.8; wy1 = sillY - U * 0.01;
    // Outside: sky, stars, moon, city.
    outside = makeLayer(k, W, H, 1.5);
    let g = outside.g;
    g.fillStyle = vgrad(g, wy0, sillY, [0, P.sky[0], 0.6, P.sky[1], 1, P.sky[2]]);
    g.fillRect(0, 0, W, H);
    stars(g, W, sillY * 0.7, Math.round(W * H / (dark ? 3500 : 9000)), 12, P.star, dark ? 0.9 : 0.6);
    const mx = W * 0.72, my = H * 0.16, mr = U * 0.07;
    g.globalAlpha = 0.6; blit(g, moonGlow, mx, my, mr * 5); g.globalAlpha = 1;
    g.fillStyle = vgrad(g, my - mr, my + mr, [0, P.moon, 1, mix(P.moon, "#f0d9a8", 0.4)]);
    g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
    g.fillStyle = rgba("#d9c6a0", 0.35);
    g.beginPath(); g.arc(mx - mr * 0.32, my + mr * 0.2, mr * 0.2, 0, TAU); g.fill(); g.beginPath(); g.arc(mx + mr * 0.3, my - mr * 0.3, mr * 0.11, 0, TAU); g.fill();
    const r = rng(41);
    let ti = 0;
    for (let L = 0; L < 2; L++) {
      let x = wx0 - 10;
      g.fillStyle = L ? P.city[1] : mix(P.city[0], P.sky[2], 0.25);
      while (x < wx1 + 10) {
        const bw = U * (0.05 + r() * 0.08), bh = H * (0.06 + r() * 0.14) * (L ? 0.8 : 1);
        g.fillStyle = L ? P.city[1] : mix(P.city[0], P.sky[2], 0.25);
        g.fillRect(x, sillY - bh, bw, bh);
        for (let yy = sillY - bh + 6; yy < sillY - 6; yy += 9) for (let xx = x + 4; xx < x + bw - 4; xx += 7) {
          if (r() < (L ? 0.28 : 0.18)) {
            g.globalAlpha = 0.5 + r() * 0.5; g.fillStyle = P.win; g.fillRect(xx, yy, 3, 4); g.globalAlpha = 1;
            if (ti < TW && r() < 0.3) { twx[ti] = xx + 1.5; twy[ti] = yy + 2; twp[ti] = r() * TAU; ti++; }
          }
        }
        x += bw + r() * 6;
      }
    }
    for (; ti < TW; ti++) { twx[ti] = -50; twy[ti] = -50; }

    // Room: wall with the window cut out, frame, curtains, sill, plant.
    room = makeLayer(k, W, H, 1.5);
    g = room.g;
    g.fillStyle = vgrad(g, 0, H, [0, P.wall[0], 1, P.wall[1]]);
    g.fillRect(0, 0, W, H);
    g.globalAlpha = dark ? 0.35 : 0.5; blit(g, lampGlow, -W * 0.1, H * 0.92, U * 0.9); g.globalAlpha = 1;
    g.clearRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
    // Glass sheen.
    g.save(); g.beginPath(); g.rect(wx0, wy0, wx1 - wx0, wy1 - wy0); g.clip();
    g.fillStyle = rgba(P.sheen, dark ? 0.035 : 0.08);
    g.beginPath(); g.moveTo(wx0 + W * 0.1, wy0); g.lineTo(wx0 + W * 0.3, wy0); g.lineTo(wx0, wy0 + H * 0.35); g.lineTo(wx0, wy0 + H * 0.2); g.fill();
    g.beginPath(); g.moveTo(wx1, wy0 + H * 0.4); g.lineTo(wx1, wy0 + H * 0.48); g.lineTo(wx1 - W * 0.25, wy1); g.lineTo(wx1 - W * 0.33, wy1); g.fill();
    g.restore();
    // Frame.
    const fw = U * 0.03;
    g.fillStyle = P.frame;
    g.fillRect(wx0 - fw, wy0 - fw, wx1 - wx0 + fw * 2, fw); g.fillRect(wx0 - fw, wy0, fw, wy1 - wy0); g.fillRect(wx1, wy0, fw, wy1 - wy0);
    const ty = wy0 + (wy1 - wy0) * 0.24;
    g.fillRect(wx0, ty, wx1 - wx0, fw * 0.6);
    g.fillStyle = P.frameHi;
    g.fillRect(wx0 - fw, wy0 - fw, wx1 - wx0 + fw * 2, fw * 0.25); g.fillRect(wx0, ty, wx1 - wx0, fw * 0.15);
    // Curtains, gathered by a tie-back.
    for (const side of SIDES) {
      const ex = side < 0 ? 0 : W, inner = side < 0 ? wx0 + W * 0.1 : wx1 - W * 0.1;
      g.fillStyle = vgrad(g, 0, H, [0, P.curtain[0], 1, P.curtain[1]]);
      g.beginPath();
      g.moveTo(ex, 0); g.lineTo(inner + side * -W * 0.02, 0);
      g.bezierCurveTo(inner, H * 0.2, ex + (inner - ex) * 0.35, H * 0.36, ex + (inner - ex) * 0.25, H * 0.44);
      g.bezierCurveTo(ex + (inner - ex) * 0.45, H * 0.55, ex + (inner - ex) * 0.6, H * 0.7, ex + (inner - ex) * 0.55, sillY);
      g.lineTo(ex, sillY); g.closePath(); g.fill();
      g.strokeStyle = rgba("#000000", 0.12); g.lineWidth = 2;
      for (let f = 1; f < 4; f++) {
        const fx = ex + (inner - ex) * (f / 4) * 0.5;
        g.beginPath(); g.moveTo(fx, 0); g.quadraticCurveTo(fx + (inner - ex) * 0.1, H * 0.25, ex + (inner - ex) * 0.2, H * 0.44); g.stroke();
      }
      g.fillStyle = P.frameHi; g.beginPath(); g.ellipse(ex + (inner - ex) * 0.27, H * 0.445, U * 0.03, U * 0.014, 0, 0, TAU); g.fill();
    }
    // Sill.
    const sd = U * 0.06;
    g.fillStyle = vgrad(g, sillY - U * 0.015, sillY + sd, [0, P.sill[0], 0.3, P.sill[0], 1, P.sill[1]]);
    g.fillRect(wx0 - fw * 2.5, sillY - U * 0.015, wx1 - wx0 + fw * 5, sd);
    g.fillStyle = rgba("#ffffff", 0.18); g.fillRect(wx0 - fw * 2.5, sillY - U * 0.015, wx1 - wx0 + fw * 5, 2);
    g.fillStyle = rgba("#000000", 0.18); g.fillRect(wx0 - fw * 2.5, sillY - U * 0.015 + sd, wx1 - wx0 + fw * 5, U * 0.02);
    // Plant on the right end of the sill.
    const px = wx1 - U * 0.06, pb = sillY - U * 0.012, pw = U * 0.06;
    g.fillStyle = P.plant;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.32;
      g.beginPath(); g.ellipse(px + Math.cos(a) * pw * 0.7, pb - pw * 0.9 + Math.sin(a) * pw * 0.7, pw * 0.16, pw * 0.48, a + Math.PI / 2, 0, TAU); g.fill();
    }
    g.fillStyle = P.pot;
    g.beginPath(); g.moveTo(px - pw * 0.45, pb - pw * 0.7); g.lineTo(px + pw * 0.45, pb - pw * 0.7); g.lineTo(px + pw * 0.34, pb); g.lineTo(px - pw * 0.34, pb); g.closePath(); g.fill();
    g.fillStyle = rgba("#ffffff", 0.2); g.fillRect(px - pw * 0.45, pb - pw * 0.7, pw * 0.9, pw * 0.1);

    fore = makeLayer(k, W, H, 1);
    vignette(fore.g, W, H, P.edge, dark ? 0.5 : 0.2, 0.55);

    const cs = Math.min(W * 0.3, H * 0.19);
    cats[0].x = W * 0.33; cats[0].s = cs;
    cats[1].x = W * 0.64; cats[1].s = cs * 0.93;
  };
  build();

  const drawCat = (c: Cat, t: number) => {
    const s = c.s, by = sillY - U * 0.012;
    const st = stretch; // 0..1 stretch envelope
    const bodyH = s * (0.58 + st * 0.08), bodyW = s * (0.34 - st * 0.03);
    // Tail (behind).
    const sw = Math.sin(t * 1.3 + c.tail) * 0.5 + Math.sin(t * 0.47 + c.tail) * 0.5;
    const bx = c.x + c.dir * bodyW * 0.7;
    ctx.strokeStyle = c.body; ctx.lineCap = "round"; ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(c.x + c.dir * bodyW * 0.3, by - s * 0.04);
    ctx.bezierCurveTo(bx + c.dir * s * 0.25, by, bx + c.dir * s * (0.32 + sw * 0.08), by - s * 0.3, bx + c.dir * s * (0.12 + sw * 0.18), by - s * (0.48 + st * 0.1));
    ctx.stroke();
    if (c.stripe) {
      ctx.strokeStyle = c.stripe; ctx.lineWidth = s * 0.1; ctx.setLineDash(DASH(s)); ctx.lineDashOffset = 0;
      ctx.stroke(); ctx.setLineDash(NODASH);
    }
    // Body.
    const outline = c.dark;
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(c.x - bodyW, by);
    ctx.bezierCurveTo(c.x - bodyW * 1.08, by - bodyH * 0.55, c.x - bodyW * 0.6, by - bodyH * 0.95, c.x, by - bodyH);
    ctx.bezierCurveTo(c.x + bodyW * 0.6, by - bodyH * 0.95, c.x + bodyW * 1.08, by - bodyH * 0.55, c.x + bodyW, by);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(outline, 0.35); ctx.lineWidth = s * 0.012; ctx.stroke();
    // Chest and paws.
    ctx.fillStyle = c.light;
    ctx.beginPath(); ctx.ellipse(c.x, by - bodyH * 0.45, bodyW * 0.45, bodyH * 0.4, 0, 0, TAU); ctx.fill();
    for (const sx of SIDES) { ctx.beginPath(); ctx.ellipse(c.x + sx * bodyW * 0.35, by - s * 0.03, s * 0.075, s * 0.05, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = rgba(outline, 0.3); ctx.lineWidth = s * 0.008;
    for (const sx of SIDES) for (const tx of TOES) { ctx.beginPath(); ctx.moveTo(c.x + sx * bodyW * 0.35 + tx * s, by - s * 0.01); ctx.lineTo(c.x + sx * bodyW * 0.35 + tx * s, by - s * 0.045); ctx.stroke(); }
    if (c.stripe) {
      ctx.strokeStyle = c.stripe; ctx.lineWidth = s * 0.03;
      for (let i = 0; i < 3; i++) {
        const yy = by - bodyH * (0.25 + i * 0.2);
        ctx.beginPath(); ctx.moveTo(c.x - bodyW * 0.98, yy); ctx.quadraticCurveTo(c.x - bodyW * 0.75, yy - s * 0.03, c.x - bodyW * 0.62, yy + s * 0.01); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c.x + bodyW * 0.98, yy); ctx.quadraticCurveTo(c.x + bodyW * 0.75, yy - s * 0.03, c.x + bodyW * 0.62, yy + s * 0.01); ctx.stroke();
      }
    }
    // Head.
    const hx = c.x + c.lookX * s * 0.05, hy = by - bodyH - s * (0.12 + st * 0.04) + c.lookY * s * 0.02;
    const hr = s * 0.25;
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(c.lookX * 0.14 + Math.sin(t * 0.6 + c.tail) * 0.03);
    // Ears.
    for (const sx of SIDES) {
      ctx.save();
      ctx.translate(sx * hr * 0.55, -hr * 0.62);
      ctx.rotate(sx * (0.18 + (sx === c.dir ? c.ear * 0.5 : 0)));
      ctx.fillStyle = c.body;
      ctx.beginPath(); ctx.moveTo(-hr * 0.36, hr * 0.2); ctx.quadraticCurveTo(-hr * 0.12, -hr * 0.5, 0, -hr * 0.55); ctx.quadraticCurveTo(hr * 0.12, -hr * 0.5, hr * 0.36, hr * 0.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(outline, 0.35); ctx.lineWidth = s * 0.012; ctx.stroke();
      ctx.fillStyle = "#f7a3b5";
      ctx.beginPath(); ctx.moveTo(-hr * 0.2, hr * 0.12); ctx.quadraticCurveTo(0, -hr * 0.42, hr * 0.2, hr * 0.12); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = c.body;
    ctx.beginPath(); ctx.ellipse(0, 0, hr * 1.08, hr * 0.9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(outline, 0.35); ctx.lineWidth = s * 0.012; ctx.stroke();
    // Muzzle.
    ctx.fillStyle = c.light;
    ctx.beginPath(); ctx.ellipse(-hr * 0.17, hr * 0.32, hr * 0.26, hr * 0.2, 0, 0, TAU); ctx.ellipse(hr * 0.17, hr * 0.32, hr * 0.26, hr * 0.2, 0, 0, TAU); ctx.fill();
    if (c.stripe) {
      ctx.strokeStyle = c.stripe; ctx.lineWidth = s * 0.022;
      for (const dx of BROWS) { ctx.beginPath(); ctx.moveTo(dx * hr, -hr * 0.85); ctx.lineTo(dx * hr * 0.8, -hr * 0.55); ctx.stroke(); }
    }
    // Cheeks.
    ctx.fillStyle = rgba("#ff8fab", 0.35);
    ctx.beginPath(); ctx.ellipse(-hr * 0.62, hr * 0.25, hr * 0.16, hr * 0.1, 0, 0, TAU); ctx.ellipse(hr * 0.62, hr * 0.25, hr * 0.16, hr * 0.1, 0, 0, TAU); ctx.fill();
    // Eyes: closed happy arcs when blinking or stretching.
    const closed = c.blink > 0 || st > 0.3;
    const ex = hr * 0.42, ey = -hr * 0.05, px = c.lookX * hr * 0.08, py = c.lookY * hr * 0.06;
    if (closed) {
      ctx.strokeStyle = "#2a2230"; ctx.lineWidth = s * 0.018;
      for (const sx of SIDES) { ctx.beginPath(); ctx.arc(sx * ex, ey + hr * 0.04, hr * 0.13, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    } else {
      for (const sx of SIDES) {
        ctx.fillStyle = c.eye;
        ctx.beginPath(); ctx.ellipse(sx * ex, ey, hr * 0.17, hr * 0.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1d1722";
        ctx.beginPath(); ctx.ellipse(sx * ex + px, ey + py, hr * 0.1, hr * 0.16, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(sx * ex + px - hr * 0.05, ey + py - hr * 0.07, hr * 0.055, 0, TAU); ctx.arc(sx * ex + px + hr * 0.04, ey + py + hr * 0.05, hr * 0.025, 0, TAU); ctx.fill();
      }
    }
    // Nose & mouth.
    ctx.fillStyle = "#f08aa2";
    ctx.beginPath(); ctx.moveTo(-hr * 0.08, hr * 0.17); ctx.lineTo(hr * 0.08, hr * 0.17); ctx.lineTo(0, hr * 0.26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5a3d48"; ctx.lineWidth = s * 0.01;
    ctx.beginPath(); ctx.moveTo(0, hr * 0.26); ctx.quadraticCurveTo(-hr * 0.04, hr * 0.38, -hr * 0.13, hr * 0.33); ctx.moveTo(0, hr * 0.26); ctx.quadraticCurveTo(hr * 0.04, hr * 0.38, hr * 0.13, hr * 0.33); ctx.stroke();
    // Whiskers.
    ctx.strokeStyle = dark ? rgba("#ffffff", 0.55) : rgba("#5a4a50", 0.45); ctx.lineWidth = s * 0.006;
    ctx.beginPath();
    for (const sx of SIDES) for (let i = 0; i < 3; i++) {
      const wy = hr * (0.24 + i * 0.07);
      ctx.moveTo(sx * hr * 0.42, wy); ctx.quadraticCurveTo(sx * hr * 0.85, wy - hr * (0.08 - i * 0.06), sx * hr * 1.25, wy - hr * (0.1 - i * 0.12));
    }
    ctx.stroke();
    ctx.restore();
  };

  const lights = (t: number) => {
    const n = 15, y0 = wy0 + U * 0.01, sag = H * 0.05;
    ctx.strokeStyle = P.wire; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const u = i / 30, x = wx0 + (wx1 - wx0) * u, y = y0 + Math.sin(u * Math.PI * 3) ** 2 * sag * 0.5 + Math.sin(u * Math.PI) * sag * 0.3;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = wx0 + (wx1 - wx0) * u, y = y0 + Math.sin(u * Math.PI * 3) ** 2 * sag * 0.5 + Math.sin(u * Math.PI) * sag * 0.3 + 4;
      const b = 0.65 + 0.35 * Math.sin(t * 1.6 + i * 1.9);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      ctx.globalAlpha = b * (dark ? 0.8 : 0.55);
      blit(ctx, bulbGlow, x, y, U * 0.035);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = i % 3 === 0 ? "#ffb3c7" : i % 3 === 1 ? P.bulb : "#bfe6ff";
      ctx.beginPath(); ctx.ellipse(x, y, 2.6, 3.4, 0, 0, TAU); ctx.fill();
    }
  };

  return {
    resize(nw, nh) { W = nw; H = nh; build(); },
    tap(x, y, big) {
      if (big) {
        stretch = 0; stretchT = 1.6;
        for (let i = 0; i < 16; i++) {
          const hrt = hearts.get(), from = i < 6 ? cats[0] : i < 12 ? cats[1] : null;
          hrt.x = from ? from.x + rand(-20, 20) : x + rand(-20, 20); hrt.y = from ? sillY - from.s * 0.9 : y;
          hrt.vy = rand(-40, -70); hrt.max = rand(2, 3.2); hrt.size = rand(7, 13); hrt.a = rand(0, TAU); hrt.life = -rand(0, 0.8);
        }
        return;
      }
      // The nearest cat turns to look.
      let best = cats[0], bd = Infinity;
      for (const c of cats) { const d = Math.abs(c.x - x); if (d < bd) { bd = d; best = c; } }
      for (const c of cats) {
        const hy = sillY - c.s * 0.8;
        const lx = clamp((x - c.x) / (W * 0.35), -1, 1), ly = clamp((y - hy) / (H * 0.4), -1, 1);
        if (c === best) { c.tx = lx; c.ty = ly; c.lookHold = 3.5; } else if (Math.random() < 0.5) { c.tx = lx * 0.6; c.ty = ly * 0.6; c.lookHold = 2; }
      }
      for (let i = 0; i < 4; i++) { const p = sparks.get(); p.x = x + rand(-10, 10); p.y = y + rand(-10, 10); p.max = rand(0.5, 0.8); p.size = rand(4, 7); }
    },
    frame(dt, t) {
      ctx.globalAlpha = 1;
      ctx.drawImage(outside.c, 0, 0, W, H);
      // Twinkling city windows and clouds drifting past the moon.
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (let i = 0; i < TW; i++) {
        const v = Math.sin(t * 0.7 + twp[i]);
        if (v < 0.2) continue;
        ctx.globalAlpha = (v - 0.2) * 0.8;
        blit(ctx, winGlow, twx[i], twy[i], 7);
      }
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < 3; i++) {
        const cx = ((t * (5 + i * 2) + i * W * 0.45) % (W * 1.6)) - W * 0.3, cy = H * (0.12 + i * 0.08);
        ctx.globalAlpha = dark ? 0.55 : 0.6;
        ctx.drawImage(cloudS, cx - U * 0.25, cy - U * 0.05, U * 0.5, U * 0.1);
        ctx.drawImage(cloudS, cx - U * 0.1, cy - U * 0.08, U * 0.3, U * 0.12);
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(room.c, 0, 0, W, H);
      lights(t);

      // Cat behaviour.
      if (stretchT > 0) { stretchT -= dt; const q = 1 - stretchT / 1.6; stretch = Math.sin(clamp(q) * Math.PI); } else stretch = 0;
      for (const c of cats) {
        if (dt > 0) {
          c.blinkT -= dt;
          if (c.blinkT <= 0) { c.blink = 0.16; c.blinkT = rand(2.2, 5.5); }
          if (c.blink > 0) c.blink -= dt;
          c.earT -= dt;
          if (c.earT <= 0) { c.ear = 1; c.earT = rand(3, 7); }
          c.ear = Math.max(0, c.ear - dt * 4);
          if (c.lookHold > 0) c.lookHold -= dt; else { c.tx = c.dir * 0.45 + Math.sin(t * 0.2 + c.tail) * 0.2; c.ty = -0.1; }
          const f = 1 - Math.pow(0.002, dt);
          c.lookX += (c.tx - c.lookX) * f; c.lookY += (c.ty - c.lookY) * f;
        }
        const twitch = Math.sin(c.ear * Math.PI * 3) * c.ear;
        const saved = c.ear; c.ear = twitch; drawCat(c, t); c.ear = saved;
      }

      // Hearts and tap sparkles.
      for (const p of hearts.items) {
        if (!p.on) continue;
        p.life += dt;
        if (p.life < 0) continue;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        p.a += dt * 2; p.y += p.vy * dt; p.x += Math.sin(p.a) * 14 * dt;
        ctx.globalAlpha = env(q, 0.1, 0.4);
        const sz = p.size * (0.6 + 0.4 * Math.min(1, q * 4));
        ctx.drawImage(heart, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      ctx.fillStyle = P.bulb;
      for (const p of sparks.items) {
        if (!p.on) continue;
        p.life += dt;
        const q = p.life / p.max;
        if (q >= 1) { p.on = false; continue; }
        ctx.globalAlpha = Math.sin(q * Math.PI);
        sparkle(ctx, p.x, p.y - q * 10, p.size * Math.sin(q * Math.PI));
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(fore.c, 0, 0, W, H);
    },
  };
}

const dashCache = new Map<number, number[]>();
const DASH = (s: number) => {
  const key = Math.round(s);
  let d = dashCache.get(key);
  if (!d) { d = [s * 0.07, s * 0.09]; dashCache.set(key, d); }
  return d;
};
const NODASH: number[] = [];

export const drawPreview = previewOf(create);
