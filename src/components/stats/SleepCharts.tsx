import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Moon } from "lucide-react";
import { dayInitial, fmtHours, type RangeDays, type Stats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { ChartCard, ChartTooltip, DataTable, EmptyChart, linear, useWidth } from "./chart-utils";

const H = 170;
const PAD = { top: 10, right: 8, bottom: 24, left: 26 };
const GOAL_LO = 7 * 60;
const GOAL_HI = 9 * 60;

interface Night { label: string; long: string; minutes: number | null }

function nights(sleep: Stats["sleep"], range: RangeDays): Night[] {
  if (range !== 90) {
    return sleep.map((s) => ({
      label: range === 7 ? dayInitial(s.date) : format(s.date, "d"),
      long: format(s.date, "EEEE d 'de' MMMM", { locale: es }),
      minutes: s.minutes,
    }));
  }
  const out: Night[] = [];
  for (let i = sleep.length; i > 0; i -= 7) {
    const chunk = sleep.slice(Math.max(0, i - 7), i);
    const logged = chunk.filter((c) => c.minutes != null).map((c) => c.minutes!);
    out.unshift({
      label: format(chunk[0].date, "d MMM", { locale: es }),
      long: `Semana del ${format(chunk[0].date, "d 'de' MMMM", { locale: es })} (promedio)`,
      minutes: logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : null,
    });
  }
  return out;
}

export const SleepChart = ({ stats, range, onLog }: { stats: Stats; range: RangeDays; onLog: () => void }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const data = useMemo(() => nights(stats.sleep, range), [stats.sleep, range]);
  const logged = stats.sleep.filter((s) => s.minutes != null).length;

  const maxH = Math.max(10, ...data.map((d) => (d.minutes ?? 0) / 60));
  const ticks = [0, 4, 8, ...(maxH > 10 ? [12] : [])];
  const top = ticks[ticks.length - 1] * 60 || 600;
  const y = linear(0, Math.max(top, 600), H - PAD.bottom, PAD.top);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const slot = innerW / (data.length || 1);
  const barW = Math.max(3, Math.min(24, slot * 0.6));
  const xOf = (i: number) => PAD.left + slot * i + slot / 2;
  const labelEvery = data.length > 14 ? Math.ceil(data.length / 7) : 1;

  const logButton = (
    <button type="button" onClick={onLog} className="rounded-full px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
      Registrar
    </button>
  );

  return (
    <ChartCard
      title="Sueño"
      subtitle={stats.sleepAvg != null ? `Promedio ${fmtHours(stats.sleepAvg)} · meta 7–9 h` : "Meta 7–9 h por noche"}
      action={logButton}
      table={logged ? <DataTable head={["Noche", "Horas"]} rows={data.filter((d) => d.minutes != null).map((d) => [d.long, fmtHours(d.minutes!)])} /> : undefined}
    >
      {logged === 0 ? (
        <EmptyChart icon={<Moon className="h-6 w-6" />} text="Registra cuánto dormiste cada mañana y verás cómo afecta a tu día." />
      ) : (
        <div ref={ref} className="relative" onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}>
          {width > 0 && (
            <svg width={width} height={H} role="img" aria-label="Horas de sueño por noche">
              {/* Goal band */}
              <rect x={PAD.left} width={innerW} y={y(GOAL_HI)} height={y(GOAL_LO) - y(GOAL_HI)} fill="hsl(var(--success) / 0.10)" />
              <text x={width - PAD.right - 2} y={y(GOAL_HI) + 11} textAnchor="end" className="fill-muted-foreground text-[10px]">meta</text>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(t * 60)} y2={y(t * 60)} className="stroke-border" strokeOpacity={t === 0 ? 1 : 0.5} strokeDasharray={t === 0 ? undefined : "2 4"} />
                  <text x={PAD.left - 6} y={y(t * 60)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{t}h</text>
                </g>
              ))}
              {data.map((d, i) =>
                d.minutes != null ? (
                  <rect
                    key={i}
                    className="animate-bar-grow"
                    x={xOf(i) - barW / 2}
                    y={y(d.minutes)}
                    width={barW}
                    height={y(0) - y(d.minutes)}
                    rx={Math.min(4, barW / 2)}
                    fill={d.minutes < GOAL_LO ? "hsl(var(--primary) / 0.45)" : "hsl(var(--primary))"}
                    style={{ animationDelay: `${Math.min(i * 18, 320)}ms`, opacity: hover !== null && hover !== i ? 0.45 : 1, transition: "opacity 150ms" }}
                  />
                ) : (
                  <circle key={i} cx={xOf(i)} cy={y(0) - 4} r={1.5} className="fill-muted-foreground/40" />
                ),
              )}
              {data.map((d, i) =>
                i % labelEvery === 0 ? (
                  <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">{d.label}</text>
                ) : null,
              )}
              {data.map((_, i) => (
                <rect key={i} x={PAD.left + slot * i} y={PAD.top} width={slot} height={H - PAD.top - PAD.bottom} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
              ))}
            </svg>
          )}
          {hover !== null && data[hover] && (
            <ChartTooltip x={xOf(hover)} y={y(data[hover].minutes ?? 0)} width={width}>
              <p className="font-medium first-letter:uppercase">{data[hover].long}</p>
              <p className="text-muted-foreground">{data[hover].minutes != null ? fmtHours(data[hover].minutes!) : "Sin registro"}</p>
            </ChartTooltip>
          )}
        </div>
      )}
    </ChartCard>
  );
};

const BUCKETS = [
  { label: "Menos de 6 h", lo: 0, hi: 6 * 60 },
  { label: "6–7 h", lo: 6 * 60, hi: 7 * 60 },
  { label: "7–8 h", lo: 7 * 60, hi: 8 * 60 },
  { label: "8–9 h", lo: 8 * 60, hi: 9 * 60 },
  { label: "9 h o más", lo: 9 * 60, hi: Infinity },
];
const fmtAvg = (n: number) => (Math.round(n * 10) / 10).toString().replace(".", ",");

/**
 * Sleep vs productivity, readable at a glance: one bar per range of hours slept, its length the
 * average tasks completed on those days. The best range is highlighted and summed up in one line.
 * (Replaces a scatter plot, which asked people to read a cloud of dots.)
 */
export const SleepVsTasks = ({ pairs }: { pairs: Stats["sleepPairs"] }) => {
  const rows = useMemo(
    () =>
      BUCKETS.map((b) => {
        const days = pairs.filter((p) => p.minutes >= b.lo && p.minutes < b.hi);
        return { ...b, days: days.length, avg: days.length ? days.reduce((a, d) => a + d.total, 0) / days.length : 0 };
      }).filter((r) => r.days > 0),
    [pairs],
  );
  if (pairs.length < 5 || rows.length < 2) return null;

  const max = Math.max(...rows.map((r) => r.avg), 1);
  // The highlighted bar is always the longest one; a note says when it rests on very few days.
  const best = rows.reduce((a, b) => (b.avg > a.avg ? b : a));
  const worst = rows.reduce((a, b) => (b.avg < a.avg ? b : a));
  const gain = worst.avg > 0 ? Math.round(((best.avg - worst.avg) / worst.avg) * 100) : null;
  const thin = best.days < 3 ? " (aún con pocos días registrados)" : "";

  return (
    <ChartCard
      title="Sueño y productividad"
      subtitle={
        best !== worst && gain && gain > 0
          ? `Durmiendo ${best.label.toLowerCase()} completas ${gain}% más tareas que con ${worst.label.toLowerCase()}${thin}`
          : `Durmiendo ${best.label.toLowerCase()} completas ${fmtAvg(best.avg)} tareas en promedio${thin}`
      }
      info={<p>Agrupa tus días según cuánto dormiste la noche anterior y muestra cuántas tareas completaste en promedio. Cuantos más días registres, más confiable es.</p>}
      table={<DataTable head={["Sueño", "Días", "Tareas promedio"]} rows={rows.map((r) => [r.label, r.days, fmtAvg(r.avg)])} />}
    >
      <ul className="space-y-2.5" aria-label="Tareas promedio según horas de sueño">
        {rows.map((r, i) => {
          const isBest = r === best;
          return (
            <li key={r.label} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-xs">
              <span className={cn("font-medium", isBest ? "text-foreground" : "text-muted-foreground")}>{r.label}</span>
              <span className="relative h-6 overflow-hidden rounded-lg bg-foreground/[0.06]">
                <span
                  className={cn("absolute inset-y-0 left-0 origin-left rounded-lg animate-bar-grow-x", isBest ? "bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.55)]" : "bg-primary/35")}
                  style={{ width: `${Math.max(6, (r.avg / max) * 100)}%`, animationDelay: `${i * 60}ms` }}
                />
                {isBest && r.avg / max > 0.55 && <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-semibold text-primary-foreground">Tu mejor rango</span>}
              </span>
              <span className="w-16 text-right tabular-nums">
                <span className="font-semibold text-foreground">{fmtAvg(r.avg)}</span>
                <span className="text-muted-foreground"> · {r.days} {r.days === 1 ? "día" : "días"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
};
