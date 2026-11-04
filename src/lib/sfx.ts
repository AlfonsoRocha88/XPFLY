// Lightweight Web Audio synthesizer for UI SFX. No assets required.
type SfxName =
  | "create"
  | "complete"
  | "delete"
  | "hover"
  | "xp"
  | "levelUp"
  | "nav"
  | "click"
  | "open"
  | "close"
  | "toggle"
  | "error";

let ctx: AudioContext | null = null;
let unlocked = false;
let enabled = true;
try {
  const stored = typeof window !== "undefined" ? localStorage.getItem("sfx_enabled") : null;
  if (stored === "false") enabled = false;
} catch { /* ignore */ }

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

// iOS/Safari unlock: must create+resume context AND play a silent buffer inside a user gesture.
const unlock = () => {
  const ac = getCtx();
  if (!ac) return;
  ac.resume().catch(() => {});
  if (unlocked) return;
  try {
    const buffer = ac.createBuffer(1, 1, 22050);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.connect(ac.destination);
    src.start(0);
    unlocked = true;
  } catch { /* ignore */ }
};
if (typeof window !== "undefined") {
  const opts = { passive: true } as AddEventListenerOptions;
  window.addEventListener("touchstart", unlock, opts);
  window.addEventListener("touchend", unlock, opts);
  window.addEventListener("pointerdown", unlock, opts);
  window.addEventListener("mousedown", unlock, opts);
  window.addEventListener("keydown", unlock);
  window.addEventListener("click", unlock);
}

const tone = (
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; vol?: number; slideTo?: number; delay?: number } = {}
) => {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const { type = "sine", vol = 0.08, slideTo, delay = 0 } = opts;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
};

export const setSfxEnabled = (v: boolean) => {
  enabled = v;
  try { localStorage.setItem("sfx_enabled", String(v)); } catch { /* ignore */ }
};
export const isSfxEnabled = () => enabled;

export const playSfx = (name: SfxName) => {
  if (!enabled) return;
  switch (name) {
    case "create":
      tone(523.25, 0.12, { type: "triangle", vol: 0.07 });
      tone(783.99, 0.18, { type: "triangle", vol: 0.06, delay: 0.06 });
      break;
    case "complete":
      tone(659.25, 0.1, { type: "square", vol: 0.06 });
      tone(987.77, 0.18, { type: "square", vol: 0.06, delay: 0.08 });
      tone(1318.51, 0.22, { type: "triangle", vol: 0.05, delay: 0.16 });
      break;
    case "delete":
      tone(440, 0.18, { type: "sawtooth", vol: 0.05, slideTo: 110 });
      break;
    case "hover":
      tone(1100, 0.04, { type: "sine", vol: 0.025 });
      break;
    case "xp":
      tone(880, 0.08, { type: "triangle", vol: 0.05 });
      tone(1174.66, 0.1, { type: "triangle", vol: 0.05, delay: 0.05 });
      break;
    case "levelUp":
      tone(523.25, 0.12, { type: "square", vol: 0.07 });
      tone(659.25, 0.12, { type: "square", vol: 0.07, delay: 0.1 });
      tone(783.99, 0.14, { type: "square", vol: 0.07, delay: 0.2 });
      tone(1046.5, 0.3, { type: "triangle", vol: 0.08, delay: 0.32 });
      break;
    case "nav":
      tone(660, 0.06, { type: "sine", vol: 0.04, slideTo: 880 });
      break;
    case "click":
      tone(900, 0.05, { type: "triangle", vol: 0.04 });
      break;
    case "open":
      tone(520, 0.08, { type: "sine", vol: 0.05, slideTo: 880 });
      break;
    case "close":
      tone(740, 0.09, { type: "sine", vol: 0.045, slideTo: 360 });
      break;
    case "toggle":
      tone(700, 0.05, { type: "square", vol: 0.04 });
      tone(980, 0.06, { type: "square", vol: 0.035, delay: 0.04 });
      break;
    case "error":
      tone(220, 0.18, { type: "sawtooth", vol: 0.06, slideTo: 110 });
      break;
  }
};
