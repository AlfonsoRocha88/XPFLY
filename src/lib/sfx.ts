// XPFly sound set: synthesized live with Web Audio (no files to download).
// Palette: glass bells and soft shimmer in E major pentatonic (with a lydian A# for the
// big moments), sent through a long, airy reverb so everything sounds spacious and calm.
// Frequent actions (taps, tabs) are tiny and dry; rare ones (level up, orbs) get the full tail.

export type SfxName =
  | "click" | "hover" | "nav" | "toggle" | "open" | "close"
  | "create" | "complete" | "delete" | "error"
  | "xp" | "destellos" | "levelUp" | "achievement" | "purchase"
  | "orbCharge" | "orbBurst" | "reveal" | "revealRare" | "revealLegendary";

// Note table (Hz): E major pentatonic across two octaves, plus A#5 for the lydian shimmer.
const N = {
  E4: 329.63, B4: 493.88, E5: 659.25, FS5: 739.99, GS5: 830.61, AS5: 932.33, B5: 987.77,
  CS6: 1108.73, DS6: 1244.51, E6: 1318.51, FS6: 1479.98, GS6: 1661.22, B6: 1975.53,
};
const SPARKLE = [N.E6, N.FS6, N.GS6, N.B6, N.CS6];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let reverbIn: GainNode | null = null;
let unlocked = false;
let enabled = true;
try {
  if (typeof window !== "undefined" && localStorage.getItem("sfx_enabled") === "false") enabled = false;
} catch { /* ignore */ }

/** A soft, wide hall made from decaying stereo noise (no impulse file needed). */
function makeImpulse(ac: AudioContext, seconds = 2.6, decay = 3.2) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
    // Master: gentle compression so stacked layers never clip on phone speakers.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);
    // Shared reverb send, filtered so the tail stays airy rather than boomy.
    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 350;
    reverbIn = ctx.createGain();
    reverbIn.gain.value = 1;
    reverbIn.connect(hp).connect(reverb).connect(master);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

// iOS/Safari unlock: the context must be resumed and a silent buffer played inside a user gesture.
const unlock = () => {
  const ac = getCtx();
  if (!ac) return;
  ac.resume().catch(() => {});
  if (unlocked) return;
  try {
    const src = ac.createBufferSource();
    src.buffer = ac.createBuffer(1, 1, 22050);
    src.connect(ac.destination);
    src.start(0);
    unlocked = true;
  } catch { /* ignore */ }
};
if (typeof window !== "undefined") {
  const opts = { passive: true } as AddEventListenerOptions;
  for (const ev of ["touchstart", "touchend", "pointerdown", "mousedown", "keydown", "click"]) window.addEventListener(ev, unlock, opts);
}

type Voice = { at?: number; vol?: number; wet?: number; pan?: number };

/** Route a source through gain → (pan) → master, with a reverb send. */
function out(ac: AudioContext, node: AudioNode, { vol = 0.1, wet = 0.35, pan = 0 }: Voice) {
  const g = ac.createGain();
  g.gain.value = vol;
  const p = ac.createStereoPanner ? ac.createStereoPanner() : null;
  if (p) { p.pan.value = pan; node.connect(g).connect(p).connect(master!); } else node.connect(g).connect(master!);
  if (wet > 0 && reverbIn) {
    const s = ac.createGain();
    s.gain.value = wet;
    g.connect(s).connect(reverbIn);
  }
  return g;
}

/** Glass bell: a pure tone plus two inharmonic partials that die faster — the "crystal" color. */
function bell(freq: number, dur: number, v: Voice = {}) {
  const ac = getCtx();
  if (!ac || !master) return;
  const t = ac.currentTime + (v.at ?? 0);
  const env = ac.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(1, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out(ac, env, v);
  [[1, 1, dur], [2.756, 0.32, dur * 0.45], [5.404, 0.12, dur * 0.2]].forEach(([mul, amp, d]) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = freq * mul;
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(env);
    o.start(t);
    o.stop(t + dur + 0.05);
  });
}

/** Soft tone with an optional glide, for UI movement (tabs, open/close). */
function glide(from: number, to: number, dur: number, v: Voice & { type?: OscillatorType } = {}) {
  const ac = getCtx();
  if (!ac || !master) return;
  const t = ac.currentTime + (v.at ?? 0);
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = v.type ?? "sine";
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  out(ac, g, v);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Filtered noise sweep: air, whooshes, the orb's charge and burst. */
function air(dur: number, fromHz: number, toHz: number, v: Voice & { q?: number; attack?: number } = {}) {
  const ac = getCtx();
  if (!ac || !master) return;
  const t = ac.currentTime + (v.at ?? 0);
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = v.q ?? 1.2;
  f.frequency.setValueAtTime(fromHz, t);
  f.frequency.exponentialRampToValueAtTime(toHz, t + dur);
  const g = ac.createGain();
  const attack = v.attack ?? dur * 0.4;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g);
  out(ac, g, v);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** A quick cascade of tiny bells: the sound of light. */
function sparkle(count: number, { at = 0, vol = 0.035, spread = 0.045 }: { at?: number; vol?: number; spread?: number } = {}) {
  for (let i = 0; i < count; i++) {
    const f = SPARKLE[Math.floor(Math.random() * SPARKLE.length)] * (Math.random() < 0.3 ? 2 : 1);
    bell(f, 0.5, { at: at + i * spread + Math.random() * 0.015, vol, wet: 0.55, pan: Math.random() * 1.2 - 0.6 });
  }
}

export const setSfxEnabled = (v: boolean) => {
  enabled = v;
  try { localStorage.setItem("sfx_enabled", String(v)); } catch { /* ignore */ }
};
export const isSfxEnabled = () => enabled;

export const playSfx = (name: SfxName) => {
  if (!enabled) return;
  switch (name) {
    // ── Frequent: tiny and nearly dry ──────────────────────────────
    case "click":
      bell(N.B6, 0.08, { vol: 0.03, wet: 0.08 });
      break;
    case "hover":
      break; // touch-first app: no hover sound
    case "toggle":
      bell(N.GS6, 0.07, { vol: 0.032, wet: 0.1 });
      bell(N.B6, 0.09, { vol: 0.028, wet: 0.12, at: 0.035 });
      break;
    case "nav":
      glide(N.B5, N.E6, 0.09, { vol: 0.035, wet: 0.15 });
      break;
    case "open":
      air(0.22, 500, 2600, { vol: 0.05, wet: 0.3, q: 0.8 });
      bell(N.B5, 0.5, { vol: 0.03, wet: 0.4, at: 0.06 });
      break;
    case "close":
      air(0.18, 2400, 600, { vol: 0.04, wet: 0.25, q: 0.8, attack: 0.03 });
      break;

    // ── Tasks ─────────────────────────────────────────────────────
    case "create":
      bell(N.B5, 0.6, { vol: 0.05, wet: 0.35 });
      bell(N.E6, 0.8, { vol: 0.045, wet: 0.45, at: 0.07 });
      break;
    case "complete":
      // Bright rising triad, then a little shimmer: the "done" reward.
      bell(N.E5, 0.7, { vol: 0.06, wet: 0.35, pan: -0.15 });
      bell(N.GS5, 0.7, { vol: 0.055, wet: 0.4, at: 0.06 });
      bell(N.B5, 1.0, { vol: 0.06, wet: 0.45, at: 0.12, pan: 0.15 });
      sparkle(3, { at: 0.2, vol: 0.022 });
      break;
    case "delete":
      glide(N.GS5, N.E4, 0.28, { vol: 0.045, wet: 0.25 });
      air(0.25, 1800, 400, { vol: 0.025, wet: 0.2, attack: 0.02 });
      break;
    case "error":
      bell(N.E5, 0.35, { vol: 0.045, wet: 0.2 });
      bell(N.DS6 / 2, 0.45, { vol: 0.045, wet: 0.2, at: 0.09 });
      break;

    // ── Rewards ───────────────────────────────────────────────────
    case "xp":
      sparkle(3, { vol: 0.03, spread: 0.035 });
      break;
    case "destellos":
      // Crystals landing in the purse: a falling cascade of glass ticks.
      [N.B6, N.GS6, N.E6, N.CS6, N.B5].forEach((f, i) => bell(f, 0.45, { at: i * 0.045, vol: 0.035, wet: 0.45, pan: (i % 2 ? 0.25 : -0.25) }));
      break;
    case "purchase":
      bell(N.E6, 0.6, { vol: 0.05, wet: 0.4 });
      bell(N.B6, 0.9, { vol: 0.045, wet: 0.5, at: 0.08 });
      sparkle(5, { at: 0.15, vol: 0.025 });
      break;
    case "achievement":
      [N.E5, N.B5, N.E6, N.GS6].forEach((f, i) => bell(f, 1.4, { at: i * 0.09, vol: 0.05, wet: 0.5, pan: i / 3 - 0.5 }));
      sparkle(6, { at: 0.35, vol: 0.022 });
      break;
    case "levelUp":
      // Swell of air, then a major-seventh chord with a lydian shimmer on top, long tail.
      air(0.9, 300, 4200, { vol: 0.05, wet: 0.5, q: 0.7, attack: 0.75 });
      glide(N.E4, N.E5, 0.85, { vol: 0.02, wet: 0.5, type: "triangle" });
      [N.E5, N.GS5, N.B5, N.DS6, N.E6].forEach((f, i) => bell(f, 2.2, { at: 0.82 + i * 0.05, vol: 0.055, wet: 0.6, pan: i / 4 - 0.5 }));
      bell(N.AS5 * 2, 1.6, { at: 1.1, vol: 0.03, wet: 0.7 });
      sparkle(8, { at: 1.0, vol: 0.022, spread: 0.06 });
      break;

    // ── Orbs ──────────────────────────────────────────────────────
    case "orbCharge":
      air(1.0, 180, 2200, { vol: 0.045, wet: 0.45, q: 1.6, attack: 0.9 });
      glide(N.E4 / 2, N.E4, 1.0, { vol: 0.03, wet: 0.3, type: "triangle" });
      break;
    case "orbBurst":
      air(0.35, 6000, 1200, { vol: 0.07, wet: 0.5, q: 0.6, attack: 0.008 });
      glide(120, 45, 0.3, { vol: 0.08, wet: 0.1 });
      sparkle(7, { vol: 0.03, spread: 0.022 });
      break;
    case "reveal":
      bell(N.B5, 0.9, { vol: 0.05, wet: 0.45 });
      bell(N.E6, 1.1, { vol: 0.045, wet: 0.5, at: 0.08 });
      break;
    case "revealRare":
      [N.E5, N.GS5, N.B5, N.E6].forEach((f, i) => bell(f, 1.2, { at: i * 0.07, vol: 0.05, wet: 0.5 }));
      sparkle(4, { at: 0.3, vol: 0.022 });
      break;
    case "revealLegendary":
      [N.E5, N.GS5, N.B5, N.DS6, N.FS6].forEach((f, i) => bell(f, 2.0, { at: i * 0.08, vol: 0.055, wet: 0.6, pan: i / 4 - 0.5 }));
      bell(N.AS5 * 2, 1.8, { at: 0.45, vol: 0.03, wet: 0.7 });
      sparkle(10, { at: 0.4, vol: 0.022, spread: 0.05 });
      break;
  }
};
