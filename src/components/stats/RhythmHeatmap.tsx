import { useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SLOTS, WEEKDAYS } from "@/lib/stats";
import { ChartCard, DataTable, EmptyChart } from "./chart-utils";

/** 5-step single-hue ramp from the theme's primary color (sequential: light → dark). */
const STEPS = [0.08, 0.25, 0.45, 0.68, 0.92];

const RhythmHeatmap = ({ heat }: { heat: number[][] }) => {
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const max = Math.max(...heat.flat(), 0);
  const step = (v: number) => (v === 0 ? 0 : 1 + Math.min(STEPS.length - 2, Math.floor(((v - 1) / Math.max(max - 1, 1)) * (STEPS.length - 1))));

  const table = (
    <DataTable head={["Día", ...SLOTS.map((s) => s.label)]} rows={WEEKDAYS.map((w, r) => [w.long, ...heat[r]])} />
  );

  return (
    <ChartCard title="¿Cuándo rindes más?" subtitle="Completadas por día y franja" table={max ? table : undefined}>
      {max === 0 ? (
        <EmptyChart icon={<Clock className="h-6 w-6" />} text="Aquí aparecerán los días y horarios en los que más avanzas." />
      ) : (
        <div>
          <div className="grid grid-cols-[2rem_repeat(4,1fr)] gap-1.5">
            <span />
            {SLOTS.map((s) => (
              <span key={s.id} className="truncate text-center text-[11px] text-muted-foreground">{s.label}</span>
            ))}
            {WEEKDAYS.map((w, r) => (
              <div key={w.d} className="contents">
                <span className="self-center text-xs text-muted-foreground">{w.short}</span>
                {SLOTS.map((s, c) => {
                  const v = heat[r][c];
                  const active = focus && focus[0] === r && focus[1] === c;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onMouseEnter={() => setFocus([r, c])}
                      onMouseLeave={() => setFocus(null)}
                      onFocus={() => setFocus([r, c])}
                      onBlur={() => setFocus(null)}
                      aria-label={`${w.long}, ${s.label.toLowerCase()}: ${v} completadas`}
                      className={cn(
                        "animate-cell-in h-8 rounded-lg transition-transform duration-150",
                        v === 0 && "bg-muted",
                        active && "scale-110 ring-2 ring-foreground/20",
                      )}
                      style={{
                        background: v ? `hsl(var(--primary) / ${STEPS[step(v)]})` : undefined,
                        animationDelay: `${Math.min((r * 4 + c) * 12, 320)}ms`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="min-h-4" aria-live="polite">
              {focus ? `${WEEKDAYS[focus[0]].long} · ${SLOTS[focus[1]].label.toLowerCase()}: ${heat[focus[0]][focus[1]]}` : "Toca una celda para ver el detalle"}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1">
              Menos
              {STEPS.slice(1).map((o) => <span key={o} className="h-2.5 w-2.5 rounded-sm" style={{ background: `hsl(var(--primary) / ${o})` }} />)}
              Más
            </span>
          </div>
        </div>
      )}
    </ChartCard>
  );
};

export default RhythmHeatmap;
