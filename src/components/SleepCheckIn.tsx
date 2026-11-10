import { useState } from "react";
import { Moon, X } from "lucide-react";
import { useTodaySleep } from "@/hooks/useDailyLog";
import SleepLogger from "./SleepLogger";

const DISMISS_KEY = "sleepCheckInDismissed";

const readDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY); } catch { return null; }
};

/** Morning card on Tareas: asks once a day how long you slept. Hidden once logged or dismissed for today. */
const SleepCheckIn = () => {
  const { today, logged, loading } = useTodaySleep();
  const [dismissed, setDismissed] = useState(() => readDismissed() === today);
  const [saved, setSaved] = useState(false);

  if (loading || dismissed || (logged && !saved)) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, today); } catch { /* ignore */ }
    setDismissed(true);
  };

  if (saved) {
    return (
      <div className="surface flex items-center gap-3 p-4 text-sm animate-detail-in" role="status" onAnimationEnd={() => setTimeout(() => setDismissed(true), 1600)}>
        <Moon className="h-4 w-4 text-primary" aria-hidden />
        <span className="text-foreground">Sueño guardado. Lo verás en Progreso.</span>
      </div>
    );
  }

  return (
    <section className="surface p-4 animate-detail-in" aria-label="Registro de sueño">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Moon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">¿Cuánto dormiste anoche?</p>
            <p className="text-xs text-muted-foreground">Te ayuda a ver cómo el descanso afecta tu día.</p>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Ahora no">
          <X className="h-4 w-4" />
        </button>
      </div>
      <SleepLogger day={today} onDone={() => setSaved(true)} />
    </section>
  );
};

export default SleepCheckIn;
