import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import PyroSprite from "./PyroSprite";
import PyroChat from "./PyroChat";
import { pickContextualTip } from "@/lib/pyro-tips";
import { useProfile } from "@/hooks/useProfile";
import { useTasks } from "@/hooks/useTasks";
import { usePyroBus, PyroMood, useLocalState, PYRO_KEYS, usePyroFeedBus } from "@/hooks/usePyro";
import { pyroSay } from "@/hooks/usePyro";
import { EATING_LINES, pickNoRepeat } from "@/lib/pyro-dialogue";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { usePyroHunger } from "@/hooks/usePyroHunger";

export default function PyroAssistant() {
  const location = useLocation();
  const { profile } = useProfile();
  const { tasks, dailyTasks } = useTasks();
  const isMobile = useIsMobile();
  const { state: hungerState } = usePyroHunger();

  const [bubble, setBubble] = useState<string | null>(null);
  const [mood, setMood] = useState<PyroMood>("idle");
  const [chatOpen, setChatOpen] = useState(false);
  const [minimized, setMinimized] = useLocalState<boolean>(PYRO_KEYS.MIN_KEY, false);
  const hideTimer = useRef<number | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());
  const lastEatingIdx = useRef<number>(-1);
  const spriteWrapRef = useRef<HTMLDivElement | null>(null);
  /** Ambient mood: when no transient bubble is active, reflect hunger state. */
  const ambientMood: PyroMood =
    mood === "idle"
      ? hungerState === "critical" || hungerState === "dying"
        ? "dying"
        : hungerState === "alert"
          ? "alert"
          : "idle"
      : mood;
  const [ghost, setGhost] = useState<null | {
    id: number;
    title: string;
    from: { x: number; y: number; w: number; h: number };
    to: { x: number; y: number };
  }>(null);

  const showBubble = useCallback((msg: string, m: PyroMood = "happy", duration = 5500) => {
    setBubble(msg);
    setMood(m);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setBubble(null);
      setMood("idle");
    }, duration);
  }, []);

  // Listen to event bus
  usePyroBus(useCallback((msg: string, m: PyroMood) => showBubble(msg, m), [showBubble]));

  /* ---------- Phase 2: feeding sequence ---------- */
  const handleFeed = useCallback((payload: { taskTitle?: string; sourceRect?: { x: number; y: number; width: number; height: number } }) => {
    // 1) switch Pyro to eating immediately
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setBubble(null);
    setMood("eating");

    // 2) optionally fly a ghost card toward Pyro
    const wrap = spriteWrapRef.current;
    if (wrap && payload.sourceRect) {
      const r = wrap.getBoundingClientRect();
      const target = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      setGhost({
        id: Date.now(),
        title: payload.taskTitle ?? "Misión",
        from: { x: payload.sourceRect.x, y: payload.sourceRect.y, w: payload.sourceRect.width, h: payload.sourceRect.height },
        to: target,
      });
      window.setTimeout(() => setGhost(null), 500);
    }

    // 3) after eating animation (1.2s), switch to happy + show a no-repeat line
    hideTimer.current = window.setTimeout(() => {
      const { idx, line } = pickNoRepeat(EATING_LINES, lastEatingIdx.current);
      lastEatingIdx.current = idx;
      setMood("happy");
      setBubble(line);
      pyroSay(line, "happy");
      hideTimer.current = window.setTimeout(() => {
        setBubble(null);
        setMood("idle");
      }, 4500);
    }, 1200);
  }, []);
  usePyroFeedBus(handleFeed);

  // Contextual tip on route change / state change (debounced)
  const ctx = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      pathname: location.pathname,
      taskCount: tasks.length,
      urgentCount: tasks.filter((t: any) => t.priority === "urgent" && t.status !== "done").length,
      dueTodayCount: tasks.filter((t: any) => t.due_date?.startsWith(today) && t.status !== "done").length,
      dailyPending: dailyTasks.filter((t: any) => t.status !== "done").length,
      statPoints: profile?.stat_points_available ?? 0,
      level: profile?.level ?? 1,
      streak: profile?.daily_streak ?? 0,
    };
  }, [location.pathname, tasks, dailyTasks, profile]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const tip = pickContextualTip(ctx);
      if (tip && !dismissedRef.current.has(tip.id)) {
        dismissedRef.current.add(tip.id);
        showBubble(tip.message, "idle");
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [ctx, showBubble]);

  // Periodic reminders every 30 min
  useEffect(() => {
    const interval = window.setInterval(() => {
      dismissedRef.current.clear();
      const tip = pickContextualTip(ctx);
      if (tip) showBubble(tip.message, "idle");
    }, 30 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [ctx, showBubble]);

  // Mission reminders (Google-Calendar-style) — fires Pyro bubble + toast at scheduled minutes
  useEffect(() => {
    const firedKey = "pyro_fired_reminders";
    const getFired = (): Record<string, true> => {
      try { return JSON.parse(localStorage.getItem(firedKey) || "{}"); } catch { return {}; }
    };
    const setFired = (f: Record<string, true>) => {
      try { localStorage.setItem(firedKey, JSON.stringify(f)); } catch { /* ignore */ }
    };

    const check = () => {
      const all = [...tasks, ...dailyTasks] as any[];
      const now = Date.now();
      const fired = getFired();
      let dirty = false;
      for (const t of all) {
        if (!t.start_time || !Array.isArray(t.reminders) || t.reminders.length === 0) continue;
        if (t.status === "done") continue;
        const startMs = new Date(t.start_time).getTime();
        for (const mins of t.reminders as number[]) {
          const fireAt = startMs - mins * 60_000;
          // Fire if we passed it within last 90s and not fired before
          if (fireAt <= now && now - fireAt < 90_000) {
            const key = `${t.id}:${mins}`;
            if (fired[key]) continue;
            fired[key] = true;
            dirty = true;
            const label = mins === 0
              ? "¡es ahora!"
              : mins < 60
                ? `en ${mins} min`
                : mins % 60 === 0
                  ? `en ${mins / 60} h`
                  : `en ${mins} min`;
            const msg = `🔔 "${t.title}" ${label}`;
            pyroSay(msg, "alert");
            toast(msg);
          }
        }
      }
      if (dirty) setFired(fired);
    };

    check();
    const interval = window.setInterval(check, 30_000);
    return () => window.clearInterval(interval);
  }, [tasks, dailyTasks]);

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        data-pyro-assistant
        className={`pyro-assistant-fixed fixed z-40 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/60 bg-card/90 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)] ${isMobile ? "bottom-20 left-3" : "bottom-4 left-4"}`}
        title="Llamar a Pyro"
        aria-label="Llamar a Pyro, asistente"
        aria-expanded={false}
        aria-haspopup="dialog"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <>
      {(hungerState === "dying" || hungerState === "critical") && (
        <div className="pyro-app-vignette" aria-hidden="true" />
      )}
      {chatOpen && <PyroChat onClose={() => setChatOpen(false)} />}
      {ghost && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[60]"
          style={{
            left: ghost.from.x,
            top: ghost.from.y,
            width: ghost.from.w,
            height: ghost.from.h,
            transform: "translate(0,0) scale(1)",
            opacity: 1,
            transition: "transform 400ms cubic-bezier(0.4,0,0.2,1), opacity 400ms ease-out",
            animation: "pyro-ghost-fly 400ms forwards",
            ['--ghost-dx' as any]: `${ghost.to.x - (ghost.from.x + ghost.from.w / 2)}px`,
            ['--ghost-dy' as any]: `${ghost.to.y - (ghost.from.y + ghost.from.h / 2)}px`,
          }}
        >
          <div className="h-full w-full rounded-lg border-2 border-primary/70 bg-card/90 px-2 py-1 text-xs font-semibold text-foreground shadow-[0_0_18px_hsl(var(--primary)/0.45)]">
            {ghost.title}
          </div>
        </div>
      )}
      <div
        ref={spriteWrapRef}
        data-pyro-assistant
        className={`pyro-assistant-fixed fixed z-40 select-none ${isMobile ? "bottom-20 left-2" : "bottom-4 left-4"}`}
        role="region"
        aria-label="Pyro, asistente"
      >
        <div className="relative flex flex-col items-start gap-2">
          {bubble && !chatOpen && (
            <div
              className={`pyro-bubble ${isMobile ? "pyro-bubble-below" : ""}`}
              role="status"
              aria-live="polite"
            >
              {bubble}
              <button
                onClick={() => setMinimized(true)}
                className="block mt-1 font-pixel text-[7px] text-muted-foreground hover:text-foreground"
                title="Ocultar a Pyro"
                aria-label="Ocultar a Pyro"
              >
                [ocultar a Pyro]
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (chatOpen) {
                setChatOpen(false);
              } else {
                setChatOpen(true);
                setBubble(null);
              }
            }}
            aria-label={chatOpen ? "Cerrar chat de Pyro" : "Abrir chat de Pyro"}
            aria-expanded={chatOpen}
            aria-haspopup="dialog"
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <PyroSprite size={64} mood={chatOpen ? "thinking" : ambientMood} />
          </button>
        </div>
      </div>
    </>
  );
}