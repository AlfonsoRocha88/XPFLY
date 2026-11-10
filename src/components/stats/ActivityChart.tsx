import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ListChecks } from "lucide-react";
import { dayInitial, type DayStat, type RangeDays } from "@/lib/stats";
import { ChartCard, ChartTooltip, DataTable, EmptyChart, linear, niceTicks, useWidth } from "./chart-utils";

interface Bin {
  label: string;
  long: string;
  tasks: number;
  habits: number;
  total: number;
  xp: number;
  isToday: boolean;
}

/** 7 and 30 days draw one bar per day; 90 days groups by week so bars stay readable. */
function toBins(days: DayStat[], range: RangeDays): Bin[] {
  const todayKey = days[days.length - 1]?.key;
  if (range !== 90) {
    return days.map((d) => ({
      label: range === 7 ? dayInitial(d.date) : format(d.date, "d"),
      long: format(d.date, "EEEE d 'de' MMMM", { locale: es }),
      tasks: d.tasks, habits: d.habits, total: d.total, xp: d.xp,
      isToday: d.key === todayKey,
    }));
  }
  const bins: Bin[] = [];
  for (let i = days.length; i > 0; i -= 7) {
    const chunk = days.slice(Math.max(0, i - 7), i);
    bins.unshift({
      label: format(chunk[0].date, "d MMM", { locale: es }),
      long: `Semana del ${format(chunk[0].date, "d 'de' MMMM", { locale: es })}`,
      tasks: chunk.reduce((s, d) => s + d.tasks, 0),
      habits: chunk.reduce((s, d) => s + d.habits, 0),
      total: chunk.reduce((s, d) => s + d.total, 0),
      xp: chunk.reduce((s, d) => s + d.xp, 0),
      isToday: chunk.some((d) => d.key === todayKey),
    });
  }
  return bins;
}

const H = 180;
const PAD = { top: 12, right: 8, bottom: 24, left: 26 };

const ActivityChart = ({ days, range }: { days: DayStat[]; range: RangeDays }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const bins = useMemo(() => toBins(days, range), [days, range]);
  const total = bins.reduce((s, b) => s + b.total, 0);
  const avg = total / (bins.length || 1);

  const ticks = niceTicks(Math.max(...bins.map((b) => b.total), 1));
  const top = ticks[ticks.length - 1];
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const y = linear(0, top, H - PAD.bottom, PAD.top);
  const slot = innerW / (bins.length || 1);
  const barW = Math.max(3, Math.min(28, slot * 0.62));
  const xOf = (i: number) => PAD.left + slot * i + slot / 2;
  const labelEvery = bins.length > 14 ? Math.ceil(bins.length / 7) : 1;
  const unit = range === 90 ? "por semana" : "por día";

  const table = (
    <DataTable
      head={[range === 90 ? "Semana" : "Día", "Tareas", "Hábitos", "XP"]}
      rows={bins.map((b) => [b.long, b.tasks, b.habits, b.xp])}
    />
  );

  return (
    <ChartCard
      title="Actividad"
      subtitle={`${total} completadas · promedio ${avg.toFixed(1)} ${unit}`}
      table={total ? table : undefined}
    >
      {total === 0 ? (
        <EmptyChart icon={<ListChecks className="h-6 w-6" />} text="Cuando completes tareas y hábitos, aquí verás tu ritmo día a día." />
      ) : (
        <>
          <div ref={ref} className="relative" onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}>
            {width > 0 && (
              <svg width={width} height={H} role="img" aria-label={`Tareas completadas ${unit}`}>
                {/* Grid */}
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeOpacity={t === 0 ? 1 : 0.5} strokeDasharray={t === 0 ? undefined : "2 4"} />
                    <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{t}</text>
                  </g>
                ))}
                {/* Bars: habits at the base, tasks on top, 2px surface gap between. */}
                {bins.map((b, i) => {
                  const x = xOf(i) - barW / 2;
                  const hHabits = y(0) - y(b.habits);
                  const hTasks = y(0) - y(b.tasks);
                  const gap = b.habits && b.tasks ? 2 : 0;
                  const dim = hover !== null && hover !== i;
                  return (
                    <g
                      key={i}
                      className="animate-bar-grow"
                      style={{ animationDelay: `${Math.min(i * 18, 320)}ms`, opacity: dim ? 0.45 : 1, transition: "opacity 150ms" }}
                    >
                      {b.habits > 0 && (
                        <rect x={x} y={y(b.habits)} width={barW} height={hHabits} rx={Math.min(4, barW / 2)} fill="hsl(var(--primary))" />
                      )}
                      {b.tasks > 0 && (
                        <rect x={x} y={y(b.habits) - hTasks - gap} width={barW} height={Math.max(0, hTasks)} rx={Math.min(4, barW / 2)} fill="hsl(var(--primary) / 0.42)" />
                      )}
                    </g>
                  );
                })}
                {/* Average line */}
                {avg > 0 && (
                  <g>
                    <line x1={PAD.left} x2={width - PAD.right} y1={y(avg)} y2={y(avg)} className="stroke-foreground" strokeOpacity={0.5} strokeDasharray="4 4" />
                    <text x={width - PAD.right} y={y(avg) - 5} textAnchor="end" className="fill-muted-foreground text-[10px]">prom. {avg.toFixed(1)}</text>
                  </g>
                )}
                {/* X labels */}
                {bins.map((b, i) =>
                  i % labelEvery === 0 || b.isToday ? (
                    <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" className={b.isToday ? "fill-foreground text-[10px] font-semibold" : "fill-muted-foreground text-[10px]"}>
                      {b.label}
                    </text>
                  ) : null,
                )}
                {/* Hit targets: the whole column, wider than the bar. */}
                {bins.map((_, i) => (
                  <rect
                    key={i}
                    x={PAD.left + slot * i}
                    y={PAD.top}
                    width={slot}
                    height={H - PAD.top - PAD.bottom}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setHover(i)}
                  />
                ))}
              </svg>
            )}
            {hover !== null && bins[hover] && (
              <ChartTooltip x={xOf(hover)} y={y(bins[hover].total)} width={width}>
                <p className="mb-1 font-medium first-letter:uppercase">{bins[hover].long}</p>
                <Row swatch="hsl(var(--primary))" label="Hábitos" value={bins[hover].habits} />
                <Row swatch="hsl(var(--primary) / 0.42)" label="Tareas" value={bins[hover].tasks} />
                <p className="mt-1 border-t border-border pt-1 text-muted-foreground">+{bins[hover].xp} XP</p>
              </ChartTooltip>
            )}
          </div>
          {/* Legend (two series) */}
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />Hábitos</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/40" />Tareas</span>
          </div>
        </>
      )}
    </ChartCard>
  );
};

const Row = ({ swatch, label, value }: { swatch: string; label: string; value: number }) => (
  <p className="flex items-center justify-between gap-2">
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-sm" style={{ background: swatch }} />
      {label}
    </span>
    <span className="font-medium tabular-nums">{value}</span>
  </p>
);

export default ActivityChart;
