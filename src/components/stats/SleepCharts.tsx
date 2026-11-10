import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Moon } from "lucide-react";
import { dayInitial, fmtHours, type RangeDays, type Stats } from "@/lib/stats";
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

const SH = 190;
const SPAD = { top: 12, right: 12, bottom: 30, left: 30 };

/** Hours slept (x) vs completions that day (y). One measure per axis, no dual scales. */
export const SleepVsTasks = ({ pairs }: { pairs: Stats["sleepPairs"] }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (pairs.length < 5) return null;

  const xMin = Math.min(4, ...pairs.map((p) => p.minutes / 60));
  const xMax = Math.max(10, ...pairs.map((p) => p.minutes / 60));
  const yMax = Math.max(4, ...pairs.map((p) => p.total));
  const x = linear(xMin, xMax, SPAD.left, width - SPAD.right);
  const y = linear(0, yMax, SH - SPAD.bottom, SPAD.top);
  const xTicks = Array.from({ length: Math.floor(xMax) - Math.ceil(xMin) + 1 }, (_, i) => Math.ceil(xMin) + i).filter((t) => t % 2 === 0);
  const yTicks = [0, Math.round(yMax / 2), yMax];

  return (
    <ChartCard
      title="Sueño y productividad"
      subtitle="Cada punto es un día: horas dormidas y tareas completadas"
      table={<DataTable head={["Día", "Horas", "Completadas"]} rows={pairs.map((p) => [p.key, fmtHours(p.minutes), p.total])} />}
    >
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg width={width} height={SH} role="img" aria-label="Relación entre horas de sueño y tareas completadas">
            <rect x={x(7)} width={Math.max(0, x(9) - x(7))} y={SPAD.top} height={SH - SPAD.top - SPAD.bottom} fill="hsl(var(--success) / 0.08)" />
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={SPAD.left} x2={width - SPAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeOpacity={t === 0 ? 1 : 0.5} strokeDasharray={t === 0 ? undefined : "2 4"} />
                <text x={SPAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{t}</text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text key={t} x={x(t)} y={SH - 12} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular-nums">{t}h</text>
            ))}
            {pairs.map((p, i) => (
              <circle
                key={p.key}
                className="animate-cell-in"
                cx={x(p.minutes / 60)}
                cy={y(p.total)}
                r={hover === i ? 7 : 5}
                fill="hsl(var(--primary) / 0.75)"
                stroke="hsl(var(--card))"
                strokeWidth={2}
                style={{ animationDelay: `${Math.min(i * 20, 320)}ms`, transition: "r 120ms" }}
                onMouseEnter={() => setHover(i)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
                onClick={() => setHover(i)}
              />
            ))}
          </svg>
        )}
        {hover !== null && pairs[hover] && (
          <ChartTooltip x={x(pairs[hover].minutes / 60)} y={y(pairs[hover].total)} width={width}>
            <p className="font-medium first-letter:uppercase">{format(new Date(pairs[hover].key + "T12:00"), "EEEE d MMM", { locale: es })}</p>
            <p className="text-muted-foreground">{fmtHours(pairs[hover].minutes)} · {pairs[hover].total} completadas</p>
          </ChartTooltip>
        )}
      </div>
    </ChartCard>
  );
};
