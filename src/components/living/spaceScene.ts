/**
 * Nebulosa: XPFly's default sky. Cold, elegant and a little nostalgic: deep indigo space with
 * slow nebula clouds, three depths of stars, floating crystal "destellos", a distant ringed
 * planet and the occasional comet. Everything static is painted once into offscreen layers;
 * each frame only blits those layers (with parallax) and animates a few dozen sprites.
 *
 * Light mode gets a twilight version (periwinkle sky, rose horizon) so dark text on the
 * app's white glass stays readable, while the upper sky still shows stars.
 */

type Layer = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const TAU = Math.PI * 2;

// Pastel crystal colors (ice, mint, lavender, gold, rose): the "magic" palette.
const BIT_COLORS = ["#cfe4ff", "#bff5e6", "#d9ccff", "#ffe7a8", "#ffd0e4"];

function makeLayer(w: number, h: number): [Layer, Ctx] {
  const c: Layer = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
  return [c, c.getContext("2d") as Ctx];
}

/** Soft round glow sprite reused for every star (drawImage is far cheaper than shadowBlur). */
function glowSprite(size: number, color: string): Layer {
  const [c, x] = makeLayer(size, size);
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, color);
  g.addColorStop(0.45, color.replace(/[\d.]+\)$/, "0.25)"));
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return c;
}

/** Four-point faceted crystal, like the Destellos currency. */
function crystalSprite(size: number, color: string): Layer {
  const [c, x] = makeLayer(size, size);
  const m = size / 2, r = size * 0.42, k = size * 0.1;
  const halo = x.createRadialGradient(m, m, 0, m, m, m);
  halo.addColorStop(0, color + "99");
  halo.addColorStop(1, color + "00");
  x.fillStyle = halo;
  x.fillRect(0, 0, size, size);
  x.beginPath();
  x.moveTo(m, m - r); x.lineTo(m + k, m - k); x.lineTo(m + r, m); x.lineTo(m + k, m + k);
  x.lineTo(m, m + r); x.lineTo(m - k, m + k); x.lineTo(m - r, m); x.lineTo(m - k, m - k);
  x.closePath();
  const fill = x.createLinearGradient(m - r, m - r, m + r, m + r);
  fill.addColorStop(0, "#ffffff");
  fill.addColorStop(0.5, color);
  fill.addColorStop(1, color);
  x.fillStyle = fill;
  x.fill();
  x.strokeStyle = "rgba(255,255,255,.75)";
  x.lineWidth = Math.max(0.6, size * 0.02);
  x.stroke();
  return c;
}

type Bit = { x: number; y: number; z: number; vx: number; vy: number; rot: number; vr: number; phase: number; sprite: Layer; size: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; sprite: Layer; size: number; rot: number; vr: number };
type Comet = { x: number; y: number; vx: number; vy: number; life: number; max: number; len: number; width: number; big: boolean };
type Twinkle = { x: number; y: number; z: number; size: number; phase: number; speed: number; sprite: Layer };

export function createSpaceScene(canvas: HTMLCanvasElement, opts: { reduce: boolean; isDark: () => boolean }) {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let w = 0, h = 0, t = 0, dark = opts.isDark();
  let sky: Layer, nebula: Layer, starsFar: Layer, starsNear: Layer, planet: Layer;
  let twinkles: Twinkle[] = [];
  const bits: Bit[] = [];
  const sparks: Spark[] = [];
  const comets: Comet[] = [];
  let nextComet = rand(2, 4);
  // Parallax target from pointer / device tilt, eased toward each frame.
  const par = { x: 0, y: 0, tx: 0, ty: 0 };

  const starGlow = { white: glowSprite(32, "rgba(220,232,255,0.9)"), blue: glowSprite(32, "rgba(150,190,255,0.9)"), gold: glowSprite(32, "rgba(255,226,160,0.9)") };
  const crystals = BIT_COLORS.map((c) => crystalSprite(48, c));

  function paintSky() {
    const [c, x] = makeLayer(w, h);
    const g = x.createLinearGradient(0, 0, w * 0.25, h);
    if (dark) {
      g.addColorStop(0, "#050817"); g.addColorStop(0.45, "#0b1235"); g.addColorStop(0.8, "#121a4a"); g.addColorStop(1, "#16204f");
    } else {
      g.addColorStop(0, "#232f6e"); g.addColorStop(0.45, "#4b5aa8"); g.addColorStop(0.78, "#9aa3e2"); g.addColorStop(1, "#f2c9da");
    }
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    // Cool horizon haze at the bottom: the "looking up from a small planet" feeling.
    const haze = x.createRadialGradient(w * 0.5, h * 1.15, 0, w * 0.5, h * 1.15, h * 0.75);
    haze.addColorStop(0, dark ? "rgba(90,200,220,0.22)" : "rgba(255,220,235,0.55)");
    haze.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = haze;
    x.fillRect(0, 0, w, h);
    // Faint grain: dithers the smooth gradients so they never show bands on phone screens.
    const grains = Math.round((w * h) / 18);
    for (let i = 0; i < grains; i++) {
      x.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
      x.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    sky = c;
  }

  /** Nebula clouds at 1/3 resolution (they're blurry anyway), drawn once and drifted each frame. */
  function paintNebula() {
    const s = 3;
    const nw = Math.ceil((w * 1.2) / s), nh = Math.ceil((h * 1.2) / s);
    const [c, x] = makeLayer(nw, nh);
    const clouds: [number, number, number, string][] = dark
      ? [[0.22, 0.25, 0.55, "105,95,235"], [0.78, 0.42, 0.5, "60,160,245"], [0.4, 0.72, 0.45, "150,110,220"], [0.85, 0.85, 0.35, "60,200,205"], [0.1, 0.6, 0.3, "80,115,235"]]
      : [[0.22, 0.2, 0.55, "160,140,255"], [0.8, 0.4, 0.5, "120,190,255"], [0.45, 0.75, 0.45, "255,170,210"], [0.1, 0.55, 0.3, "140,160,255"]];
    for (const [cx, cy, r, rgb] of clouds) {
      for (let i = 0; i < 5; i++) {
        const px = (cx + rand(-0.06, 0.06)) * nw, py = (cy + rand(-0.05, 0.05)) * nh, rr = r * Math.max(nw, nh) * rand(0.45, 0.8);
        const g = x.createRadialGradient(px, py, 0, px, py, rr);
        g.addColorStop(0, `rgba(${rgb},${dark ? 0.12 : 0.12})`);
        g.addColorStop(0.5, `rgba(${rgb},${dark ? 0.06 : 0.05})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        x.fillStyle = g;
        x.fillRect(0, 0, nw, nh);
      }
    }
    // Galactic band: a diagonal river of faint dust.
    x.save();
    x.translate(nw * 0.5, nh * 0.45);
    x.rotate(-0.5);
    const band = x.createLinearGradient(0, -nh * 0.12, 0, nh * 0.12);
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.5, dark ? "rgba(200,215,255,0.09)" : "rgba(255,255,255,0.12)");
    band.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = band;
    x.fillRect(-nw, -nh * 0.12, nw * 2, nh * 0.24);
    for (let i = 0; i < 260; i++) {
      x.fillStyle = `rgba(230,236,255,${rand(0.08, 0.35)})`;
      x.fillRect(rand(-nw, nw), rand(-nh * 0.1, nh * 0.1) * rand(0.2, 1), 0.6, 0.6);
    }
    x.restore();
    nebula = c;
  }

  /** Static star field, two depths. Fainter in the lower (lighter) part of the twilight sky. */
  function paintStars() {
    const pad = 40;
    const mk = (count: number, min: number, max: number, alpha: number) => {
      const [c, x] = makeLayer(Math.ceil((w + pad * 2) * dpr), Math.ceil((h + pad * 2) * dpr));
      x.scale(dpr, dpr);
      for (let i = 0; i < count; i++) {
        const sx = rand(0, w + pad * 2), sy = rand(0, h + pad * 2);
        const fade = dark ? 1 : Math.max(0, 1 - sy / (h * 0.85));
        const r = rand(min, max);
        x.globalAlpha = alpha * rand(0.4, 1) * fade;
        x.fillStyle = pick(["#ffffff", "#dfe9ff", "#e8e1ff", "#fff1d6"]);
        x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fill();
      }
      return c;
    };
    const density = (w * h) / (390 * 844);
    starsFar = mk(Math.round(260 * density), 0.25, 0.7, 0.75);
    starsNear = mk(Math.round(70 * density), 0.6, 1.2, 0.95);
    twinkles = Array.from({ length: Math.round(34 * density) }, () => {
      const y = rand(0, h * (dark ? 1 : 0.7));
      return { x: rand(0, w), y, z: rand(0.4, 1), size: rand(8, 18), phase: rand(0, TAU), speed: rand(0.6, 1.8), sprite: pick([starGlow.white, starGlow.white, starGlow.blue, starGlow.gold]) };
    });
  }

  /** Distant ringed planet with a moon, lit from the upper left. */
  function paintPlanet() {
    const size = Math.round(Math.min(w, h) * 0.42);
    const [c, x] = makeLayer(size * 2, size * 2);
    const cx = size, cy = size, r = size * 0.32;
    const back = () => {
      x.save(); x.translate(cx, cy); x.rotate(-0.35); x.scale(1, 0.28);
      x.strokeStyle = dark ? "rgba(190,205,255,0.35)" : "rgba(255,255,255,0.55)";
      x.lineWidth = r * 0.16;
      x.beginPath(); x.arc(0, 0, r * 1.75, Math.PI, TAU); x.stroke();
      x.restore();
    };
    const front = () => {
      x.save(); x.translate(cx, cy); x.rotate(-0.35); x.scale(1, 0.28);
      x.strokeStyle = dark ? "rgba(210,220,255,0.45)" : "rgba(255,255,255,0.7)";
      x.lineWidth = r * 0.16;
      x.beginPath(); x.arc(0, 0, r * 1.75, 0, Math.PI); x.stroke();
      x.restore();
    };
    back();
    const body = x.createRadialGradient(cx - r * 0.45, cy - r * 0.5, r * 0.1, cx, cy, r);
    body.addColorStop(0, dark ? "#9db4ff" : "#c8d2ff");
    body.addColorStop(0.55, dark ? "#4d5fb8" : "#7d8fe0");
    body.addColorStop(1, dark ? "#1a2257" : "#4a57a8");
    x.fillStyle = body;
    x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
    // Rim light on the shadow side: the cold "magic" edge.
    x.strokeStyle = "rgba(160,230,255,0.45)"; x.lineWidth = r * 0.05;
    x.beginPath(); x.arc(cx, cy, r * 0.98, 0.2, 1.9); x.stroke();
    front();
    // Small moon
    const mx = cx + r * 1.9, my = cy - r * 0.95, mr = r * 0.16;
    const mg = x.createRadialGradient(mx - mr * 0.4, my - mr * 0.4, 0, mx, my, mr);
    mg.addColorStop(0, "#f4f2ff"); mg.addColorStop(1, dark ? "#7b7fae" : "#a9acd6");
    x.fillStyle = mg;
    x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fill();
    planet = c;
  }

  function seedBits() {
    bits.length = 0;
    const n = Math.round(12 * Math.max(1, (w * h) / (390 * 844)));
    for (let i = 0; i < n; i++) {
      const z = rand(0.35, 1);
      bits.push({ x: rand(0, w), y: rand(0, h), z, vx: rand(-4, 4) * z, vy: rand(-7, -2) * z, rot: rand(0, TAU), vr: rand(-0.4, 0.4), phase: rand(0, TAU), sprite: pick(crystals), size: rand(10, 20) * z });
    }
  }

  function resize() {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    dark = opts.isDark();
    paintSky(); paintNebula(); paintStars(); paintPlanet(); seedBits();
  }

  function spawnComet(big = false, from?: { x: number; y: number }) {
    const angle = rand(0.35, 0.6); // falling down-left → down-right diagonal
    const speed = big ? rand(140, 200) : rand(520, 760);
    const dir = Math.random() < 0.5 ? 1 : -1;
    comets.push({
      x: from?.x ?? (dir > 0 ? rand(-0.1, 0.6) * w : rand(0.4, 1.1) * w),
      y: from?.y ?? rand(-0.05, 0.35) * h,
      vx: Math.cos(angle) * speed * dir,
      vy: Math.sin(angle) * speed,
      life: 0, max: big ? rand(5, 7) : rand(0.8, 1.3),
      len: big ? rand(140, 220) : rand(90, 160),
      width: big ? 3.2 : 1.6,
      big,
    });
  }

  function burst(x: number, y: number, big: boolean) {
    const n = big ? 22 : 7;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(40, big ? 230 : 110);
      sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0, max: rand(0.8, big ? 1.8 : 1.2), sprite: pick(crystals), size: rand(8, big ? 20 : 14), rot: rand(0, TAU), vr: rand(-4, 4) });
    }
    if (big) spawnComet(false, { x: x - 40, y: y - 120 });
  }

  function drawComet(c: Comet) {
    const k = c.life / c.max;
    const alpha = Math.min(1, k * 6) * (1 - Math.pow(k, 3));
    const speed = Math.hypot(c.vx, c.vy);
    const tx = c.x - (c.vx / speed) * c.len, ty = c.y - (c.vy / speed) * c.len;
    const g = ctx.createLinearGradient(c.x, c.y, tx, ty);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.25, `rgba(190,215,255,${alpha * 0.6})`);
    g.addColorStop(1, "rgba(150,180,255,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = c.width;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(tx, ty); ctx.stroke();
    const head = c.big ? 26 : 16;
    ctx.globalAlpha = alpha;
    ctx.drawImage(starGlow.white as CanvasImageSource, c.x - head / 2, c.y - head / 2, head, head);
    ctx.globalAlpha = 1;
  }

  function frame(dt: number) {
    t += dt;
    if (opts.isDark() !== dark) resize();
    par.x += (par.tx - par.x) * Math.min(1, dt * 2.5);
    par.y += (par.ty - par.y) * Math.min(1, dt * 2.5);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.drawImage(sky as CanvasImageSource, 0, 0, w, h);
    // Nebula: slow breathing drift + gentle parallax.
    const nx = -w * 0.1 + Math.sin(t * 0.03) * 14 + par.x * 6, ny = -h * 0.1 + Math.cos(t * 0.025) * 10 + par.y * 6;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(nebula as CanvasImageSource, nx, ny, w * 1.2, h * 1.2);
    ctx.globalAlpha = 1;
    // Stars: two depths drifting at different speeds = depth without any 3D.
    const drift = (t * 2) % 40;
    ctx.drawImage(starsFar as CanvasImageSource, -40 + par.x * 4 - drift * 0.3, -40 + par.y * 4, w + 80, h + 80);
    ctx.drawImage(starsNear as CanvasImageSource, -40 + par.x * 9 - drift * 0.6, -40 + par.y * 9, w + 80, h + 80);

    // Twinkling bright stars
    for (const s of twinkles) {
      const a = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * s.speed + s.phase), 3);
      ctx.globalAlpha = a;
      const sz = s.size * (0.8 + a * 0.4);
      ctx.drawImage(s.sprite as CanvasImageSource, s.x + par.x * 10 * s.z - sz / 2, s.y + par.y * 10 * s.z - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    // Planet: lower left, bobbing very slowly.
    const ps = Math.min(w, h) * 0.74;
    ctx.globalAlpha = dark ? 0.9 : 0.75;
    ctx.drawImage(planet as CanvasImageSource, -ps * 0.34 + par.x * 14, h - ps * 0.82 + Math.sin(t * 0.15) * 6 + par.y * 14, ps, ps);
    ctx.globalAlpha = 1;

    // Comets
    nextComet -= dt;
    if (nextComet <= 0) { spawnComet(Math.random() < 0.18); nextComet = rand(3.5, 8); }
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.life += dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.life >= c.max) { comets.splice(i, 1); continue; }
      drawComet(c);
    }

    // Floating crystals
    for (const b of bits) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
      if (b.y < -30) { b.y = h + 30; b.x = rand(0, w); }
      if (b.x < -30) b.x = w + 30; else if (b.x > w + 30) b.x = -30;
      const a = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + b.phase));
      ctx.save();
      ctx.globalAlpha = a * (dark ? 0.9 : 0.8);
      ctx.translate(b.x + par.x * 16 * b.z, b.y + par.y * 16 * b.z);
      ctx.rotate(b.rot);
      ctx.drawImage(b.sprite as CanvasImageSource, -b.size / 2, -b.size / 2, b.size, b.size);
      ctx.restore();
    }

    // Tap sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      if (s.life >= s.max) { sparks.splice(i, 1); continue; }
      s.vx *= 0.97; s.vy = s.vy * 0.97 + 30 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
      const k = s.life / s.max;
      ctx.save();
      ctx.globalAlpha = (1 - k) * Math.min(1, k * 8);
      ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      const sz = s.size * (1 - k * 0.4);
      ctx.drawImage(s.sprite as CanvasImageSource, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }

  resize();

  return {
    resize,
    frame,
    tap: (x: number, y: number) => { if (sparks.length < 200) burst(x, y, false); },
    celebrate: (x: number, y: number) => burst(x, y, true),
    /** -1…1 values from the pointer position or device tilt. */
    tilt: (x: number, y: number) => { par.tx = Math.max(-1, Math.min(1, x)); par.ty = Math.max(-1, Math.min(1, y)); },
  };
}
