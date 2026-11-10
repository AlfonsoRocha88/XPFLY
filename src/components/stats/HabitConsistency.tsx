import { AlertTriangle, Repeat2 } from "lucide-react";
import type { HabitRow } from "@/lib/stats";
import { ChartCard, DataTable, EmptyChart } from "./chart-utils";

const RISK = 0.6;

const HabitConsistency = ({ habits }: { habits: HabitRow[] }) => (
  <ChartCard
    title="Constancia por hábito"
    subtitle="Días cumplidos de los que tocaba"
    table={habits.length ? <DataTable head={["Hábito", "Cumplidos", "Tocaban", "%"]} rows={habits.map((h) => [h.title, h.done, h.due, `${Math.round(h.rate * 100)}%`])} /> : undefined}
  >
    {habits.length === 0 ? (
      <EmptyChart icon={<Repeat2 className="h-6 w-6" />} text="Crea una tarea diaria para ver qué tan constante eres con cada hábito." />
    ) : (
      <ul className="space-y-3">
        {habits.map((h, i) => {
          const risk = h.rate < RISK && h.due >= 3;
          return (
            <li key={h.id} className="animate-detail-in" style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-foreground">{h.title}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground">{Math.round(h.rate * 100)}%</span> · {h.done}/{h.due}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${h.title}: ${Math.round(h.rate * 100)}%`}>
                <div
                  className="animate-bar-x h-full rounded-full"
                  style={{ width: `${Math.max(h.rate * 100, h.rate > 0 ? 3 : 0)}%`, background: risk ? "hsl(var(--warning))" : "hsl(var(--primary))", animationDelay: `${Math.min(i * 40, 300)}ms` }}
                />
              </div>
              {risk && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 text-warning" aria-hidden />
                  Necesita atención
                </p>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </ChartCard>
);

export default HabitConsistency;
