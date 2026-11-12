import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONSTELLATIONS, TIER_NAMES, type ConstellationId } from "@shared/achievements";
import type { AchievementState } from "@/hooks/useAchievements";
import { EMBLEM_ART } from "../emblems";
import { TierMedallion } from "../emblems/TierMedallion";
import { SHAPES, shapeBounds } from "./layout";
import type { Camera, GalaxyEngine, GalaxyState } from "./GalaxyEngine";

/** Liquid-glass surface used by every panel floating over the galaxy. */
export const glass =
  "border border-white/15 bg-white/[0.07] backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_40px_rgba(0,0,0,0.35)]";

interface Props {
  states: AchievementState[];
  starsLit: number;
  totalStars: number;
  claimableCount: number;
  claiming: boolean;
  onClaimAll: () => void;
  onClaim: (id: string) => void;
  onOpenAchievement: (id: string) => void;
}

/**
 * The galaxy fills the whole screen, under the floating section header and tab bar.
 * This measures how much of it they cover so panels and camera framing stay clear of them.
 */
function useChromeInsets() {
  const [insets, setInsets] = useState({ top: 96, bottom: 84 });
  useLayoutEffect(() => {
    const header = document.querySelector("main header");
    const measure = () => {
      const top = Math.round(header?.getBoundingClientRect().bottom ?? 0);
      const nav = [...document.querySelectorAll("nav")].find((n) => getComputedStyle(n).position === "fixed" && n.getBoundingClientRect().top > window.innerHeight / 2);
      const bottom = Math.round(nav ? window.innerHeight - nav.getBoundingClientRect().top : 0);
      setInsets((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (header) ro.observe(header);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  return insets;
}

const GalaxyView = ({ states, starsLit, totalStars, claimableCount, claiming, onClaimAll, onClaim, onOpenAchievement }: Props) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const skyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engineRef = useRef<GalaxyEngine | null>(null);
  const hitRefs = useRef(new Map<ConstellationId, HTMLButtonElement>());
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState<ConstellationId | null>(null);
  const [arrived, setArrived] = useState(false);
  const insets = useChromeInsets();

  const byConstellation = useMemo(() => {
    const m = new Map<ConstellationId, AchievementState[]>();
    for (const s of states) m.set(s.def.constellation, [...(m.get(s.def.constellation) ?? []), s]);
    return m;
  }, [states]);
  const galaxyState = useMemo<GalaxyState>(() => {
    const g: GalaxyState = {};
    for (const [id, list] of byConstellation) g[id] = list.map((s) => ({ tier: s.claimed, ready: s.claimable > 0 }));
    return g;
  }, [byConstellation]);

  // Position every DOM overlay from the camera, without React re-renders.
  const place = useCallback((cam: Camera, overview: Camera) => {
    const engine = engineRef.current;
    if (!engine) return;
    for (const [id, el] of hitRefs.current) {
      const b = shapeBounds(SHAPES[id], 40);
      const a = engine.worldToScreen(b.x, b.y);
      const z = engine.worldToScreen(b.x + b.w, b.y + b.h);
      el.style.transform = `translate(${a.x}px, ${a.y}px)`;
      el.style.width = `${z.x - a.x}px`;
      el.style.height = `${z.y - a.y + 34}px`;
    }
    for (const [key, el] of nodeRefs.current) {
      const [cid, idx] = key.split(":");
      const s = SHAPES[cid as ConstellationId];
      const [sx, sy] = s.stars[+idx];
      const p = engine.worldToScreen(s.center[0] + sx, s.center[1] + sy);
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -29px)`;
    }
    // Painted sky layers drift at different speeds for depth.
    const rel = cam.zoom / overview.zoom;
    const dx = (overview.x - cam.x) * cam.zoom;
    const dy = (overview.y - cam.y) * cam.zoom;
    skyRefs.current.forEach((el, i) => {
      if (!el) return;
      const f = [0.04, 0.1, 0.18, 0.26][i] ?? 0.1;
      el.style.transform = `translate3d(${dx * f}px, ${dy * f}px, 0) scale(${1 + (rel - 1) * f})`;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let engine: GalaxyEngine | null = null;
    (async () => {
      const { GalaxyEngine } = await import("./GalaxyEngine");
      if (cancelled || !canvasRef.current) return;
      engine = new GalaxyEngine();
      engineRef.current = engine;
      engine.onCamera = place;
      engine.insets = insetsRef.current;
      await engine.init(canvasRef.current);
      if (cancelled) return engine.destroy();
      engine.setState(galaxyState);
      // Dev-only handle to preview effects (e.g. window.__galaxy.celebrate("ascenso")).
      if (import.meta.env.DEV) (window as unknown as { __galaxy?: GalaxyEngine }).__galaxy = engine;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      engine?.destroy();
      engineRef.current = null;
    };
    // The engine is created once; state changes go through setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  useEffect(() => engineRef.current?.setInsets(insets.top, insets.bottom), [insets, ready]);

  // Light up changes, and celebrate a constellation the moment it becomes complete in gold.
  const completeRef = useRef<Set<ConstellationId> | null>(null);
  useEffect(() => {
    const engine = engineRef.current;
    engine?.setState(galaxyState);
    const now = new Set((Object.entries(galaxyState) as [ConstellationId, { tier: number }[]][]).filter(([, l]) => l.every((s) => s.tier === 3)).map(([id]) => id));
    if (completeRef.current && engine) for (const id of now) if (!completeRef.current.has(id)) engine.celebrate(id);
    completeRef.current = now;
  }, [galaxyState, ready]);

  const open = (id: ConstellationId) => {
    setArrived(false);
    setFocused(id);
    engineRef.current?.focus(id, () => setArrived(true));
  };
  const back = useCallback(() => {
    setArrived(false);
    setFocused(null);
    engineRef.current?.focus(null);
  }, []);
  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && back();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, back]);

  // Re-place overlays when new nodes mount after arriving.
  useEffect(() => {
    const e = engineRef.current;
    if (e) place(e.cam, e.overviewCamera());
  }, [arrived, focused, place]);

  const info = focused ? CONSTELLATIONS.find((c) => c.id === focused)! : null;
  const items = focused ? byConstellation.get(focused) ?? [] : [];

  return (
    // Full screen behind the app chrome (the page above it is click-through in this tab).
    <m.div
      data-no-swipe
      className="fixed inset-0 z-[5] select-none overflow-hidden md:left-64"
      style={{ background: "#070a1c" }}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Painted night sky (the original Logros look), in parallax layers */}
      <div ref={(el) => (skyRefs.current[0] = el)} className="will-change-transform absolute -inset-[15%]" style={{ background: "radial-gradient(120% 90% at 30% 10%, #24305E 0%, #141A38 45%, #0B0F24 100%)" }} />
      <div ref={(el) => (skyRefs.current[1] = el)} className="will-change-transform absolute -inset-[20%] opacity-70" aria-hidden>
        {/* Milky Way: a soft diagonal band of light */}
        <div className="absolute left-1/2 top-1/2 h-[34%] w-[160%] -translate-x-1/2 -translate-y-1/2 -rotate-[32deg] rounded-[50%] blur-3xl" style={{ background: "linear-gradient(90deg, transparent, rgba(160,150,255,0.18) 25%, rgba(255,214,170,0.22) 50%, rgba(140,200,255,0.18) 75%, transparent)" }} />
        <div className="absolute left-1/2 top-1/2 h-[9%] w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-[32deg] rounded-[50%] blur-2xl" style={{ background: "linear-gradient(90deg, transparent, rgba(255,240,220,0.18) 40%, rgba(255,240,220,0.24) 50%, rgba(255,240,220,0.18) 60%, transparent)" }} />
      </div>
      <div ref={(el) => (skyRefs.current[2] = el)} className="will-change-transform absolute -inset-[20%]" aria-hidden>
        <div className="absolute left-[8%] top-[6%] h-[38%] w-[60%] rounded-full opacity-35 blur-3xl" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute right-[2%] top-[36%] h-[34%] w-[55%] rounded-full bg-[#8b5cf6] opacity-25 blur-3xl" />
      </div>
      <div ref={(el) => (skyRefs.current[3] = el)} className="will-change-transform absolute -inset-[20%]" aria-hidden>
        <div className="absolute bottom-[6%] left-[10%] h-[30%] w-[58%] rounded-full bg-[#14b8a6] opacity-20 blur-3xl" />
        <div className="absolute bottom-[22%] right-[12%] h-[18%] w-[32%] rounded-full bg-[#f472b6] opacity-20 blur-3xl" />
      </div>

      <div ref={canvasRef} className="absolute inset-0" aria-hidden />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-white/60" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando galaxia" />
        </div>
      )}

      {/* Overview: one large tap target per constellation, with its name */}
      <div className={cn("absolute inset-0 transition-opacity duration-500", focused ? "pointer-events-none opacity-0" : "opacity-100")} aria-hidden={!!focused}>
        {CONSTELLATIONS.map((c) => {
          const list = byConstellation.get(c.id) ?? [];
          const lit = list.reduce((s, a) => s + a.claimed, 0);
          const pending = list.reduce((s, a) => s + a.claimable, 0);
          return (
            <button
              key={c.id}
              ref={(el) => { if (el) hitRefs.current.set(c.id, el); else hitRefs.current.delete(c.id); }}
              type="button"
              tabIndex={focused ? -1 : 0}
              onClick={() => open(c.id)}
              className="absolute left-0 top-0 flex flex-col items-center justify-end rounded-3xl pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label={`${c.name}: ${lit} de ${list.length * 3} estrellas${pending ? `, ${pending} por reclamar` : ""}`}
            >
              <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0", glass)}>
                <span className="font-serif text-[13px] font-medium text-white">{c.name}</span>
                <span className="text-[10.5px] tabular-nums text-white/60">{lit}/{list.length * 3}</span>
                {pending > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#FDE7A6] shadow-[0_0_8px_#FDE7A6]" aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Overview header: progress and claim-all */}
      <AnimatePresence>
        {!focused && ready && (
          <m.div
            key="summary"
            className={cn("absolute left-3 right-3 mx-auto flex max-w-xl items-center gap-3 rounded-3xl px-4 py-3", glass)}
            style={{ top: insets.top + 6 }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg font-medium leading-tight text-white">
                <span className="tabular-nums">{starsLit}</span> <span className="text-white/50">/ {totalStars}</span> estrellas
              </p>
              <p className="text-xs text-white/60">Toca una constelación para acercarte</p>
            </div>
            {claimableCount > 0 && (
              <m.button
                type="button"
                onClick={onClaimAll}
                disabled={claiming}
                whileTap={{ scale: 0.95 }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E1B12C] to-[#F5CF5A] px-3.5 py-2 text-xs font-semibold text-[#3A2A00] shadow-[0_0_20px_rgba(245,207,90,0.45)] disabled:opacity-70"
              >
                {claiming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Reclamar {claimableCount}
              </m.button>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* Detail: back control, medals on each star, glass panel with the list */}
      <AnimatePresence>
        {focused && info && (
          // Tapping empty sky goes back to the overview, so the only explicit control is a small icon.
          <m.div
            key="detail"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => { if (e.target === e.currentTarget) back(); }}
          >
            <div className="pointer-events-none absolute left-3 right-3 flex items-center gap-2" style={{ top: insets.top + 6 }}>
              <button type="button" onClick={back} className={cn("pointer-events-auto grid h-11 w-11 place-items-center rounded-full text-white", glass)} aria-label="Volver a la galaxia">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className={cn("ml-auto rounded-full px-3.5 py-2 text-right", glass)}>
                <p className="font-serif text-[15px] font-medium leading-none text-white">{info.name}</p>
              </div>
            </div>

            {arrived &&
              items.map((s, i) => {
                const Art = EMBLEM_ART[s.def.id];
                return (
                  // The wrapper carries the camera position; Motion owns the button's own transform.
                  <div
                    key={s.def.id}
                    ref={(el) => { const k = `${focused}:${i}`; if (el) nodeRefs.current.set(k, el); else nodeRefs.current.delete(k); }}
                    className="absolute left-0 top-0"
                  >
                  <m.button
                    type="button"
                    /* A star that is ready claims on tap; any other opens its details. */
                    onClick={() => (s.claimable > 0 && !claiming ? onClaim(s.def.id) : onOpenAchievement(s.def.id))}
                    className="flex flex-col items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: i * 0.06 }}
                    aria-label={`${s.def.name}: ${s.claimable > 0 ? "toca para reclamar" : s.claimed ? TIER_NAMES[s.claimed - 1] : "bloqueado"}`}
                  >
                    <span className="relative">
                      {s.claimable > 0 && <span className="claim-halo absolute inset-0 rounded-full border-2 border-[#FDE7A6]" aria-hidden />}
                      <m.span layoutId={`emblem-${s.def.id}`} className="block">
                        <TierMedallion tier={s.claimed} size={58} shine={s.claimed === 3} onDark>
                          {Art && <Art className="h-full w-full" />}
                        </TierMedallion>
                      </m.span>
                    </span>
                    <span className="max-w-[84px] truncate rounded-full bg-black/30 px-2 py-0.5 text-[10.5px] font-medium text-white/85 backdrop-blur-sm">{s.def.name}</span>
                  </m.button>
                  </div>
                );
              })}

            <m.div
              className={cn("absolute left-3 right-3 mx-auto max-w-xl overflow-y-auto overscroll-contain rounded-3xl p-2", glass)}
              style={{ bottom: insets.bottom + 10, maxHeight: (typeof window === "undefined" ? 600 : window.innerHeight - insets.top - insets.bottom) * 0.4 }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.25 }}
            >
              <p className="px-3 pb-1 pt-2 text-xs text-white/60">{info.tagline}</p>
              <ul>
                {items.map((s) => (
                  <li key={s.def.id}>
                    <button type="button" onClick={() => onOpenAchievement(s.def.id)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] active:bg-white/10">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-white">
                          {s.def.name}
                          {s.claimable > 0 && <span className="rounded-full bg-[#FDE7A6]/20 px-2 py-0.5 text-[10px] font-semibold text-[#FDE7A6]">Listo</span>}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#F0B07A] to-[#FFE07A] transition-[width] duration-700" style={{ width: `${s.progress * 100}%` }} />
                          </div>
                          <span className="shrink-0 text-[11px] tabular-nums text-white/55">
                            {s.next == null ? "Oro" : s.def.tierLabels ? s.def.tierLabels[s.reached as 0 | 1 | 2] : `${s.value}/${s.next}`}
                          </span>
                        </div>
                      </div>
                      <span className="flex shrink-0 gap-1" aria-label={`${s.claimed} de 3 niveles`}>
                        {[1, 2, 3].map((t) => (
                          <span key={t} className={cn("h-2 w-2 rounded-full", s.claimed >= t ? ["", "bg-[#F0B07A]", "bg-[#E6EEF7]", "bg-[#FFE07A]"][t] : "bg-white/15")} />
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};

export default GalaxyView;
