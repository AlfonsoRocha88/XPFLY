import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Flame, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import { toKey } from "@/lib/localDay";

const WEEK_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function loadFreezeDates(): Set<string> {
  try {
    const raw = localStorage.getItem("streakFreezeUsedDates");
    if (raw) return new Set(JSON.parse(raw));
    const single = localStorage.getItem("streakFreezeUsedDate");
    return single ? new Set([single]) : new Set();
  } catch {
    return new Set();
  }
}

/** Month calendar: active days joined into runs, intensity by completions (single hue). */
const StreakCalendar = ({ countsByDay, todayKey }: { countsByDay: Map<string, number>; todayKey: string }) => {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const freezes = useMemo(loadFreezeDates, []);
  const max = Math.max(1, ...countsByDay.values());

  const monthStart = startOfMonth(cursor);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const count = (d: Date) => countsByDay.get(toKey(d)) ?? 0;
  const active = (d: Date) => count(d) > 0 || freezes.has(toKey(d));
  const inMonth = eachDayOfInterval({ start: monthStart, end: endOfMonth(cursor) });
  const activeThisMonth = inMonth.filter((d) => count(d) > 0).length;
  const freezesThisMonth = inMonth.filter((d) => freezes.has(toKey(d))).length;
  const atCurrent = isSameMonth(cursor, new Date());

  return (
    <section className="surface p-5" aria-label="Calendario de racha">
      <header className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setCursor((c) => addMonths(c, -1))} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Mes anterior">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-serif text-base font-medium capitalize text-foreground">{format(cursor, "MMMM yyyy", { locale: es })}</span>
        <button type="button" disabled={atCurrent} onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" aria-label="Mes siguiente">
          <ChevronRight className="h-5 w-5" />
        </button>
      </header>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
          <Flame className="h-3.5 w-3.5" aria-hidden />
          {activeThisMonth} {activeThisMonth === 1 ? "día activo" : "días activos"}
        </span>
        {freezesThisMonth > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
            <Snowflake className="h-3.5 w-3.5" aria-hidden />
            {freezesThisMonth} {freezesThisMonth === 1 ? "protector" : "protectores"}
          </span>
        )}
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {WEEK_LABELS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((d, di) => {
              const k = toKey(d);
              const c = count(d);
              const freeze = freezes.has(k) && c === 0;
              const on = active(d);
              const prevOn = di > 0 && active(week[di - 1]);
              const nextOn = di < 6 && active(week[di + 1]);
              const outside = !isSameMonth(d, cursor);
              const future = isAfter(d, new Date());
              // Floor at 0.6 so white day numbers stay readable on the lightest active days.
              const strength = 0.6 + 0.4 * (c / max);
              return (
                <div key={di} className="relative aspect-square p-0.5" title={c ? `${c} completadas` : undefined}>
                  {on && (
                    <div
                      className={cn("absolute inset-y-0.5", prevOn ? "left-0" : "left-0.5 rounded-l-full", nextOn ? "right-0" : "right-0.5 rounded-r-full")}
                      style={{ background: freeze ? "hsl(var(--muted))" : `hsl(var(--primary) / ${strength})`, opacity: outside ? 0.35 : 1 }}
                    />
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-full w-full items-center justify-center rounded-full text-xs tabular-nums",
                      outside || future ? "text-muted-foreground/50" : on && !freeze ? "font-semibold text-primary-foreground" : "text-muted-foreground",
                      k === todayKey && "ring-1 ring-foreground/60",
                    )}
                  >
                    {freeze && !outside ? <Snowflake className="h-3.5 w-3.5 text-primary" aria-label="Protector usado" /> : format(d, "d")}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

export default StreakCalendar;
