import { useEffect, useRef } from "react";

/**
 * Premium "living" backgrounds: a full-screen canvas behind the app that drifts on its own and
 * answers the user — every tap leaves a small trace (petals, light, bubbles) and finishing a task
 * (the `xpfly:celebrate` event) makes a bigger bloom where the finger last touched.
 * Canvas 2D, a few dozen particles, capped pixel ratio, paused while the app is hidden.
 */
export type LivingScene = "living-jardin" | "living-nebulosa" | "living-oceano";

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; rot: number; vr: number; hue: number; kind: number; amb?: boolean };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

const SCENES: Record<LivingScene, {
  sky: (dark: boolean) => [string, string, string];
  ambient: number;
  spawnAmbient: (w: number, h: number) => P;
  spawnTap: (x: number, y: number, big: boolean) => P[];
  draw: (c: CanvasRenderingContext2D, p: P, k: number, t: number) => void;
  update: (p: P, dt: number, t: number) => void;
  backdrop?: (c: CanvasRenderingContext2D, w: number, h: number, t: number, dark: boolean) => void;
}> = {
  // Garden: petals and leaves drifting down on a breeze; taps scatter petals, completions bloom.
  "living-jardin": {
    sky: (d) => d ? ["#0d1f17", "#12301f", "#0a1912"] : ["#f3fbf2", "#e3f4e1", "#f7fbef"],
    ambient: 26,
    spawnAmbient: (w, h) => ({ x: rand(0, w), y: rand(-h * 0.2, h), vx: rand(6, 18), vy: rand(10, 26), life: 0, max: rand(9, 16), size: rand(5, 9), rot: rand(0, 6.28), vr: rand(-1, 1), hue: Math.random() < 0.6 ? rand(330, 360) : rand(95, 140), kind: Math.random() < 0.6 ? 0 : 1 }),
    spawnTap: (x, y, big) => Array.from({ length: big ? 22 : 6 }, () => {
      const a = rand(0, 6.28), s = rand(30, big ? 170 : 80);
      return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0, max: rand(1.2, 2.4), size: rand(4, big ? 9 : 6), rot: rand(0, 6.28), vr: rand(-4, 4), hue: rand(320, 360), kind: 0 };
    }),
    update: (p, dt, t) => { p.vx += Math.sin(t * 0.6 + p.y * 0.01) * 6 * dt; p.vy += 8 * dt; p.vx *= 0.99; p.vy *= 0.99; },
    draw: (c, p, k) => {
      c.globalAlpha = Math.min(1, Math.min(1, k * 4) * (1 - k) * 1.6);
      c.translate(p.x, p.y); c.rotate(p.rot);
      c.fillStyle = p.kind === 0 ? `hsl(${p.hue} 75% 82%)` : `hsl(${p.hue} 45% 55%)`;
      c.beginPath(); c.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2); c.fill();
      if (p.kind === 1) { c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-p.size, 0); c.lineTo(p.size, 0); c.stroke(); }
    },
    backdrop: (c, w, h, t, d) => {
      // Hanging vines along the top edge, swaying slowly.
      c.strokeStyle = d ? "rgba(90,170,110,.35)" : "rgba(70,140,80,.28)";
      c.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const x0 = (w / 7) * (i + 0.5), len = h * (0.12 + ((i * 37) % 10) / 60);
        const sway = Math.sin(t * 0.5 + i) * 10;
        c.beginPath(); c.moveTo(x0, -4); c.quadraticCurveTo(x0 + sway, len * 0.5, x0 + sway * 1.6, len); c.stroke();
        c.fillStyle = d ? "rgba(110,190,120,.4)" : "rgba(90,160,95,.32)";
        for (let j = 1; j < 5; j++) {
          const y = (len / 5) * j, x = x0 + sway * 1.6 * (y / len) * (y / len) * 0.9;
          c.beginPath(); c.ellipse(x + (j % 2 ? 5 : -5), y, 5, 2.6, j % 2 ? 0.6 : -0.6, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = `hsla(${340 + i * 4}, 70%, ${d ? 70 : 78}%, .8)`;
        c.beginPath(); c.arc(x0 + sway * 1.6, len, 3.4, 0, Math.PI * 2); c.fill();
      }
    },
  },

  // Nebula: drifting clouds of gas and stars; taps leave light trails, completions a star burst.
  "living-nebulosa": {
    sky: (d) => d ? ["#0b0a24", "#1b1240", "#0a0d26"] : ["#efeefe", "#e7e2fb", "#eef3ff"],
    ambient: 60,
    spawnAmbient: (w, h) => ({ x: rand(0, w), y: rand(0, h), vx: rand(-3, 3), vy: rand(-3, 3), life: rand(0, 6), max: rand(6, 12), size: rand(0.6, 1.8), rot: 0, vr: 0, hue: rand(200, 290), kind: 0 }),
    spawnTap: (x, y, big) => Array.from({ length: big ? 26 : 8 }, () => {
      const a = rand(0, 6.28), s = rand(20, big ? 200 : 70);
      return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.8, 1.8), size: rand(1, big ? 3.2 : 2.2), rot: 0, vr: 0, hue: rand(190, 300), kind: 1 };
    }),
    update: (p) => { p.vx *= 0.985; p.vy *= 0.985; },
    draw: (c, p, k, t) => {
      const tw = p.kind === 0 ? 0.55 + 0.45 * Math.sin(t * 2 + p.x) : 1 - k;
      c.globalAlpha = Math.max(0, tw) * (p.kind === 0 ? Math.min(1, k * 3) * (1 - k) * 1.4 : 1);
      c.fillStyle = `hsl(${p.hue} 90% 85%)`;
      c.shadowColor = `hsl(${p.hue} 95% 70%)`; c.shadowBlur = p.size * 6;
      c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill();
    },
    backdrop: (c, w, h, t, d) => {
      const blobs: [number, number, number, string][] = [[0.25, 0.3, 0.55, "268 85% 65%"], [0.75, 0.55, 0.5, "200 90% 60%"], [0.45, 0.85, 0.45, "320 80% 65%"]];
      blobs.forEach(([bx, by, r, col], i) => {
        const x = w * (bx + Math.sin(t * 0.05 + i) * 0.06), y = h * (by + Math.cos(t * 0.04 + i) * 0.05);
        const g = c.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * r);
        g.addColorStop(0, `hsla(${col} / ${d ? 0.28 : 0.18})`); g.addColorStop(1, "transparent");
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      });
    },
  },

  // Ocean: light rays from the surface and rising bubbles; taps release bubbles, completions a column.
  "living-oceano": {
    sky: (d) => d ? ["#04192a", "#062a40", "#020f1c"] : ["#e9f8ff", "#d7f0fb", "#eefbff"],
    ambient: 22,
    spawnAmbient: (w, h) => ({ x: rand(0, w), y: h + rand(0, h * 0.5), vx: 0, vy: rand(-22, -45), life: 0, max: rand(10, 18), size: rand(2, 6), rot: rand(0, 6.28), vr: rand(1, 2), hue: 195, kind: 0 }),
    spawnTap: (x, y, big) => Array.from({ length: big ? 18 : 6 }, () => ({ x: x + rand(-14, 14), y, vx: rand(-15, 15), vy: rand(-60, big ? -160 : -100), life: 0, max: rand(1.4, 2.6), size: rand(2, big ? 7 : 5), rot: rand(0, 6.28), vr: rand(2, 4), hue: 195, kind: 1 })),
    update: (p, dt) => { p.rot += p.vr * dt; p.x += Math.sin(p.rot) * 0.4; },
    draw: (c, p, k) => {
      c.globalAlpha = Math.min(1, k * 5) * (1 - k * 0.6) * 0.8;
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.1;
      c.fillStyle = "rgba(160,225,255,.18)";
      c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,.9)";
      c.beginPath(); c.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.22, 0, Math.PI * 2); c.fill();
    },
    backdrop: (c, w, h, t, d) => {
      c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const x = w * (0.15 + i * 0.18) + Math.sin(t * 0.3 + i * 1.7) * 40;
        const g = c.createLinearGradient(x, 0, x + 60, h * 0.8);
        g.addColorStop(0, `rgba(190,240,255,${d ? 0.09 : 0.24})`); g.addColorStop(1, "rgba(190,240,255,0)");
        c.fillStyle = g;
        c.beginPath(); c.moveTo(x - 18, 0); c.lineTo(x + 26, 0); c.lineTo(x + 140, h * 0.85); c.lineTo(x + 40, h * 0.85); c.closePath(); c.fill();
      }
      c.globalCompositeOperation = "source-over";
    },
  },
};

/** `forceDark`: always the night look, whatever the app's light/dark mode (used on sign-in). */
export default function LivingBackground({ scene, forceDark = false }: { scene: LivingScene; forceDark?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const S = SCENES[scene];
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, raf = 0, last = performance.now(), t = 0;
    let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const isDark = () => forceDark || document.documentElement.classList.contains("dark");
    const particles: P[] = [];

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    };
    resize();
    const ambient = () => ({ ...S.spawnAmbient(w, h), amb: true });
    for (let i = 0; i < S.ambient; i++) { const p = ambient(); p.life = rand(0, p.max * 0.8); particles.push(p); }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const dark = isDark();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [a, b, c2] = S.sky(dark);
      const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
      g.addColorStop(0, a); g.addColorStop(0.55, b); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      S.backdrop?.(ctx, w, h, t, dark);

      let ambientAlive = 0;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) { particles.splice(i, 1); continue; }
        if (p.amb) ambientAlive++;
        S.update(p, dt, t);
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.save(); S.draw(ctx, p, p.life / p.max, t); ctx.restore();
      }
      while (ambientAlive++ < S.ambient) particles.push(ambient());
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onPointer = (e: PointerEvent) => {
      lastPointer = { x: e.clientX, y: e.clientY };
      if (reduce || particles.length > 260) return;
      particles.push(...S.spawnTap(e.clientX, e.clientY, false));
    };
    const onCelebrate = () => { if (!reduce) particles.push(...S.spawnTap(lastPointer.x, lastPointer.y, true)); };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("xpfly:celebrate", onCelebrate);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("xpfly:celebrate", onCelebrate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [scene, forceDark]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}

/** Fire from anywhere when something worth celebrating happens (e.g. a task is completed). */
export const celebrateBackground = () => window.dispatchEvent(new Event("xpfly:celebrate"));
