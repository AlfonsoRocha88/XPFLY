import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtHours } from "@/lib/stats";
import { useSaveSleep } from "@/hooks/useDailyLog";

const PRESETS = [5, 6, 7, 8, 9, 10];

/** Hour presets plus ±30 min fine-tune, or exact bed/wake times. */
const SleepLogger = ({ day, initialMinutes, onDone }: { day: string; initialMinutes?: number; onDone?: () => void }) => {
  const [minutes, setMinutes] = useState<number | null>(initialMinutes ?? null);
  const [exact, setExact] = useState(false);
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  const save = useSaveSleep();

  const exactMinutes = (() => {
    const [bh, bm] = bed.split(":").map(Number);
    const [wh, wm] = wake.split(":").map(Number);
    let diff = wh * 60 + wm - (bh * 60 + bm);
    if (diff <= 0) diff += 1440; // crossed midnight
    return diff;
  })();
  const value = exact ? exactMinutes : minutes;

  const submit = async () => {
    if (value == null) return;
    let sleptAt: string | null = null;
    let wokeAt: string | null = null;
    if (exact) {
      const [y, m, d] = day.split("-").map(Number);
      const woke = new Date(y, m - 1, d, ...wake.split(":").map(Number) as [number, number]);
      wokeAt = woke.toISOString();
      sleptAt = new Date(woke.getTime() - exactMinutes * 60_000).toISOString();
    }
    try {
      await save.mutateAsync({ day, sleepMinutes: value, sleptAt, wokeAt });
      onDone?.();
    } catch {
      toast.error("No se pudo guardar el sueño");
    }
  };

  return (
    <div className="space-y-3">
      {!exact ? (
        <>
          <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Horas dormidas">
            {PRESETS.map((h) => {
              const on = minutes != null && Math.round(minutes / 60) === h && minutes % 60 === 0;
              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMinutes(h * 60)}
                  className={cn(
                    "h-10 rounded-xl border text-sm font-medium tabular-nums transition-[background-color,border-color,color,transform] duration-150 active:scale-95",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {h}h
                </button>
              );
            })}
          </div>
          {minutes != null && (
            <div className="flex items-center justify-center gap-3 animate-detail-in">
              <button type="button" onClick={() => setMinutes((m) => Math.max(0, (m ?? 0) - 30))} className="rounded-full border border-border p-1.5 text-muted-foreground hover:text-foreground" aria-label="Restar 30 minutos">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[6rem] text-center font-serif text-xl font-medium tabular-nums text-foreground">{fmtHours(minutes)}</span>
              <button type="button" onClick={() => setMinutes((m) => Math.min(1440, (m ?? 0) + 30))} className="rounded-full border border-border p-1.5 text-muted-foreground hover:text-foreground" aria-label="Sumar 30 minutos">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground animate-detail-in">
          <label className="flex items-center gap-2">Me dormí
            <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-foreground" />
          </label>
          <label className="flex items-center gap-2">desperté
            <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-foreground" />
          </label>
          <span className="font-medium text-foreground">= {fmtHours(exactMinutes)}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setExact((v) => !v)} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {exact ? "Elegir horas" : "Hora exacta"}
        </button>
        <Button type="button" size="sm" disabled={value == null || save.isPending} onClick={submit} className="rounded-full px-4">
          <Check className="mr-1 h-3.5 w-3.5" /> Guardar
        </Button>
      </div>
    </div>
  );
};

export default SleepLogger;
