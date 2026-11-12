import { lazy, Suspense, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { ChevronRight, Lock, LockOpen, Pause, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";
import { isIos } from "@/lib/pwa";
import { useFocus, useNow } from "@/hooks/useFocus";

const FocusSetupSheet = lazy(() => import("./FocusSetupSheet"));

const DURATIONS = [25, 50, 90];
export const SILENCE_KEY = "focusSilenceNotifications";

/** Runs the user's "XPFly Enfoque" shortcut, which turns on iOS Do Not Disturb for `minutes`. */
export function silenceNotifications(minutes: number) {
  window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent("XPFly Enfoque")}&input=text&text=${minutes}`;
}

/** Length of the running session, for the progress bar (remembered on this device). */
const focusLength = () => { try { return Number(localStorage.getItem("focusLength")) || 25; } catch { return 25; } };

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * "Enfoque" on the Tasks screen: shows whether apps are blocked right now and starts focus mode.
 * The blocking itself happens in an iPhone Shortcuts automation that asks the server; this card
 * only reflects and changes that state.
 */
const FocusCard = ({ pendingDailies }: { pendingDailies: number }) => {
  const { settings, startFocus, endFocus, resume } = useFocus();
  const [setupOpen, setSetupOpen] = useState(false);

  const focusEnd = settings?.focus_until ? new Date(settings.focus_until).getTime() : 0;
  const pauseEnd = settings?.pause_until ? new Date(settings.pause_until).getTime() : 0;
  const now = useNow(focusEnd > Date.now() || pauseEnd > Date.now());
  const focusing = focusEnd > now;
  const paused = !focusing && pauseEnd > now;
  const lockedByDailies = !!settings?.lock_until_dailies && pendingDailies > 0;
  const configured = (() => { try { return localStorage.getItem("focusShortcutReady") === "1"; } catch { return false; } })();

  const start = (minutes: number) => {
    playSfx("open");
    try { localStorage.setItem("focusLength", String(minutes)); } catch { /* ignore */ }
    startFocus(minutes);
    let silence = false;
    try { silence = localStorage.getItem(SILENCE_KEY) === "1"; } catch { /* ignore */ }
    if (silence && isIos()) silenceNotifications(minutes);
  };

  const status = focusing
    ? "Modo enfoque: tus apps están bloqueadas"
    : paused
      ? `Bloqueo en pausa · ${fmt(pauseEnd - now)}`
      : !configured
        ? "Configura el bloqueo de apps en tu iPhone"
        : lockedByDailies
          ? `Apps bloqueadas · ${pendingDailies === 1 ? "falta 1 diaria" : `faltan ${pendingDailies} diarias`}`
          : settings?.lock_until_dailies
            ? "Apps desbloqueadas por hoy"
            : "Bloqueo por tareas desactivado";

  const Icon = focusing || (configured && lockedByDailies) ? Lock : paused ? Pause : configured ? LockOpen : Target;

  return (
    <section className="surface overflow-hidden" aria-labelledby="focus-title">
      {/* The whole header opens the settings: no separate gear button. */}
      <button type="button" onClick={() => setSetupOpen(true)} className="flex w-full items-center gap-3 px-4 pb-2 pt-4 text-left">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", focusing ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")} aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="focus-title" className="block font-serif text-lg font-medium leading-tight">Enfoque</span>
          <span className="block truncate text-xs font-semibold text-muted-foreground">{status}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
      </button>

      <div className="px-4 pb-4">
        <AnimatePresence mode="wait" initial={false}>
          {focusing ? (
            <m.div key="on" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-3">
              <span className="font-serif text-3xl font-medium tabular-nums" aria-live="polite">{fmt(focusEnd - now)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <m.span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, ((focusEnd - now) / (focusLength() * 60_000)) * 100)}%` }}
                />
              </span>
              <button type="button" onClick={() => { playSfx("close"); endFocus(); }} className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                Terminar
              </button>
            </m.div>
          ) : paused ? (
            <m.div key="paused" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <button type="button" onClick={resume} className="h-10 w-full rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                Reanudar bloqueo
              </button>
            </m.div>
          ) : (
            <m.div key="off" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="grid grid-cols-3 gap-2" role="group" aria-label="Iniciar modo enfoque">
              {DURATIONS.map((d) => (
                <button key={d} type="button" onClick={() => start(d)} className="h-11 rounded-xl bg-foreground/[0.05] text-sm font-semibold transition-colors hover:bg-primary/10 hover:text-primary">
                  {d} min
                </button>
              ))}
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <Suspense fallback={null}>
        {setupOpen && <FocusSetupSheet open={setupOpen} onOpenChange={setSetupOpen} />}
      </Suspense>
    </section>
  );
};

export default FocusCard;
