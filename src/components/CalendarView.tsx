import { useEffect, useMemo, useRef, useState } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks,
  format, isSameMonth, isSameDay, isToday, eachDayOfInterval, startOfDay, endOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import type { Project } from "@/lib/types";
import { expandTasksInRange, type TaskOccurrence } from "@/lib/recurrence";

type CalView = "month" | "week" | "day";

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  onCreateAt: (date: Date) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 56; // px per hour in week/day views
const GUTTER = "grid-cols-[44px_repeat(7,minmax(0,1fr))]";

const formatHour12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
const formatTime12 = (d: Date) => {
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${d.getMinutes().toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const formatClock = (d: Date) => `${d.getHours() % 12 === 0 ? 12 : d.getHours() % 12}:${d.getMinutes().toString().padStart(2, "0")}`;
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** A task with a date but no time belongs in the all-day row, not at 12 AM. */
const isAllDay = (o: TaskOccurrence) => !o.task.start_time;

/** The current time, re-rendered on every minute boundary (the now-line moves with it). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let interval: number | undefined;
    const tick = () => setNow(new Date());
    const toNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = window.setTimeout(() => { tick(); interval = window.setInterval(tick, 60_000); }, toNextMinute);
    // Coming back to the tab after a while: jump straight to the right time.
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearTimeout(timeout); window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  return now;
}

const getOccBlockGeom = (occ: TaskOccurrence) => {
  const startMinutes = minutesOf(occ.start);
  const endDate = occ.end ?? new Date(occ.start.getTime() + 60 * 60 * 1000);
  const sameDayEnd = isSameDay(occ.start, endDate)
    ? endDate
    : new Date(occ.start.getFullYear(), occ.start.getMonth(), occ.start.getDate(), 23, 59, 59);
  const durationMinutes = Math.max(30, minutesOf(sameDayEnd) - startMinutes);
  return {
    top: (startMinutes / 60) * HOUR_HEIGHT,
    height: (durationMinutes / 60) * HOUR_HEIGHT,
    endDate: sameDayEnd,
  };
};

/** Lay out overlapping occurrences side by side: column index and column count per item. */
const layoutOccurrences = (occs: TaskOccurrence[]) => {
  const enriched = occs.map((o) => ({ occ: o, endDate: getOccBlockGeom(o).endDate }));
  enriched.sort((a, b) => a.occ.start.getTime() - b.occ.start.getTime());
  const out: Array<{ occ: TaskOccurrence; col: number; cols: number; endDate: Date }> = [];
  let cluster: Array<{ occ: TaskOccurrence; endDate: Date; col: number }> = [];
  let clusterMaxEnd = 0;
  const flush = () => {
    if (!cluster.length) return;
    const cols = Math.max(...cluster.map((c) => c.col)) + 1;
    for (const c of cluster) out.push({ ...c, cols });
    cluster = [];
    clusterMaxEnd = 0;
  };
  for (const item of enriched) {
    // Blocks shorter than 30 min still take 30 min of room, so compare against the drawn end.
    const drawnEnd = Math.max(item.endDate.getTime(), item.occ.start.getTime() + 30 * 60_000);
    if (cluster.length && item.occ.start.getTime() >= clusterMaxEnd) flush();
    const used = new Set(cluster.map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ occ: item.occ, endDate: item.endDate, col });
    clusterMaxEnd = Math.max(clusterMaxEnd, drawnEnd);
  }
  flush();
  return out;
};

/** "color:#hex" tag first, then the project colour, then the theme primary. */
const getTaskColor = (task: Task, projectColor?: string): string => {
  const tag = (task.tags ?? []).find((t) => typeof t === "string" && t.startsWith("color:"));
  const hex = tag?.slice("color:".length);
  if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  return projectColor ?? "hsl(var(--primary))";
};
const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

const CalendarView = ({ tasks, projects, onCreateAt, onEditTask, onDeleteTask }: CalendarViewProps) => {
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => {
    if (view === "month") {
      return { start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }) };
    }
    if (view === "week") return { start: startOfWeek(cursor, { weekStartsOn: 0 }), end: endOfWeek(cursor, { weekStartsOn: 0 }) };
    return { start: startOfDay(cursor), end: endOfDay(cursor) };
  }, [cursor, view]);

  const occurrences = useMemo(() => expandTasksInRange(tasks, range.start, range.end), [tasks, range.start, range.end]);
  const projectColor = (id: string | null) => projects.find((p) => p.id === id)?.color;

  // Week/day open on "now" (with a bit of context above), like Google Calendar.
  useEffect(() => {
    if (view === "month" || !scrollRef.current) return;
    const y = (minutesOf(new Date()) / 60) * HOUR_HEIGHT - HOUR_HEIGHT * 1.5;
    scrollRef.current.scrollTo({ top: Math.max(0, y) });
  }, [view]);

  const navigate = (dir: -1 | 1) => {
    if (view === "month") setCursor(addMonths(cursor, dir));
    else if (view === "week") setCursor(addWeeks(cursor, dir));
    else setCursor(addDays(cursor, dir));
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return format(cursor, "MMMM yyyy", { locale: es });
    if (view === "week") return `${format(range.start, "d MMM", { locale: es })} – ${format(range.end, "d MMM", { locale: es })}`;
    return format(cursor, "EEEE d 'de' MMMM", { locale: es });
  }, [view, cursor, range]);

  // Swipe sideways to change month/week/day.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) navigate(dx < 0 ? 1 : -1);
  };

  const shared = { occurrences, projectColor, onCreateAt, onEditTask, onDeleteTask, now };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 px-4 pb-3 pt-4 md:px-8 md:pt-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate font-serif text-[28px] font-medium capitalize leading-tight tracking-tight">{headerLabel}</h1>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)} aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setCursor(new Date())}>Hoy</Button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(1)} aria-label="Siguiente"><ChevronRight className="h-5 w-5" /></Button>
          </div>
        </div>
        <div className="glass flex rounded-full p-1">
          {(["month", "week", "day"] as CalView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex-1 rounded-full py-1.5 text-sm font-medium transition-all",
                view === v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "month" ? "Mes" : v === "week" ? "Semana" : "Día"}
            </button>
          ))}
        </div>
      </div>

      {/* The lit card frame stays still; only the inner area scrolls (so the edge never scrolls away). */}
      <div className="surface mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden [--edge-inset:0] md:mx-8">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain touch-pan-y"
        // Week/day scroll inside the card (sticky day header, opens on "now"); month grows with the page.
        style={view === "month" ? undefined : { maxHeight: "calc(100dvh - 15rem)" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {view === "month" && <MonthGrid cursor={cursor} range={range} {...shared} />}
        {view === "week" && <TimeGrid days={eachDayOfInterval({ start: range.start, end: range.end })} {...shared} />}
        {view === "day" && <TimeGrid days={[cursor]} {...shared} />}
      </div>
      </div>
    </div>
  );
};

type GridProps = {
  occurrences: TaskOccurrence[];
  projectColor: (id: string | null) => string | undefined;
  onCreateAt: (d: Date) => void;
  onEditTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  now: Date;
};

/* ---------------- Month ---------------- */

const MonthGrid = ({ cursor, range, occurrences, projectColor, onCreateAt, onEditTask, onDeleteTask }: GridProps & { cursor: Date; range: { start: Date; end: Date } }) => {
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const weeks = days.length / 7;

  return (
    <div className="grid h-full min-h-[560px] grid-cols-7" style={{ gridTemplateRows: `auto repeat(${weeks}, minmax(0, 1fr))` }}>
      {dayNames.map((d) => (
        <div key={d} className="border-b border-border/60 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
      ))}
      {days.map((day, i) => {
        const dayOccs = occurrences.filter((o) => isSameDay(o.start, day));
        const inMonth = isSameMonth(day, cursor);
        const today = isToday(day);
        return (
          <div
            key={day.toISOString()}
            onClick={() => onCreateAt(day)}
            className={cn(
              "group relative flex min-w-0 cursor-pointer flex-col gap-0.5 overflow-hidden border-b border-border/60 p-1 transition-colors hover:bg-foreground/[0.03]",
              (i + 1) % 7 !== 0 && "border-r",
              !inMonth && "opacity-40",
              today && "bg-primary/[0.07]",
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums", today ? "bg-primary font-semibold text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.6)]" : "text-foreground")}>
                {format(day, "d")}
              </span>
              <Plus className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </div>
            <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
              {dayOccs.slice(0, 3).map((o) => (
                <OccChip key={o.occurrenceKey} occ={o} color={getTaskColor(o.task, projectColor(o.task.project_id))} onEdit={onEditTask} onDelete={onDeleteTask} />
              ))}
              {dayOccs.length > 3 && <p className="px-1 text-[10px] font-medium text-muted-foreground">+{dayOccs.length - 3} más</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- Week & Day (time grid) ---------------- */

const TimeGrid = ({ days, occurrences, projectColor, onCreateAt, onEditTask, onDeleteTask, now }: GridProps & { days: Date[] }) => {
  const cols = days.length === 1 ? "grid-cols-[44px_minmax(0,1fr)]" : GUTTER;
  const showsToday = days.some((d) => isToday(d));
  const nowY = (minutesOf(now) / 60) * HOUR_HEIGHT;
  const allDay = days.map((d) => occurrences.filter((o) => isAllDay(o) && isSameDay(o.start, d)));
  const hasAllDay = allDay.some((list) => list.length > 0);

  return (
    <div className={cn("grid", cols)}>
      {/* Sticky day header (+ all-day row) */}
      <div className="sticky top-0 z-30 col-span-full grid border-b border-border/60 bg-card/85 backdrop-blur-xl" style={{ gridTemplateColumns: "inherit" }}>
        <div />
        {days.map((d) => (
          <button key={d.toISOString()} onClick={() => onCreateAt(d)} className="flex flex-col items-center gap-0.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{format(d, days.length === 1 ? "EEEE" : "EEE", { locale: es })}</span>
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums", isToday(d) ? "bg-primary font-semibold text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.6)]" : "text-foreground")}>
              {format(d, "d")}
            </span>
          </button>
        ))}
        {hasAllDay && (
          <>
            <div className="flex items-start justify-end pr-1.5 pt-1 text-[9px] font-semibold uppercase leading-tight text-muted-foreground">Todo el día</div>
            {allDay.map((list, i) => (
              <div key={i} className="min-w-0 space-y-0.5 px-0.5 pb-1.5">
                {list.map((o) => (
                  <OccChip key={o.occurrenceKey} occ={o} color={getTaskColor(o.task, projectColor(o.task.project_id))} onEdit={onEditTask} onDelete={onDeleteTask} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Hour gutter: labels sit on the hour lines */}
      <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
        {HOURS.slice(1).map((h) => {
          const nearNow = showsToday && Math.abs(h * 60 - minutesOf(now)) < 18;
          return (
            <span
              key={h}
              className={cn("absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground transition-opacity", nearNow && "opacity-0")}
              style={{ top: h * HOUR_HEIGHT }}
            >
              {formatHour12(h)}
            </span>
          );
        })}
        {showsToday && (
          <span
            className="absolute right-0.5 z-20 -translate-y-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.7)]"
            style={{ top: nowY }}
          >
            {formatClock(now)}
          </span>
        )}
      </div>

      {/* Day columns */}
      {days.map((d) => {
        const laid = layoutOccurrences(occurrences.filter((o) => !isAllDay(o) && isSameDay(o.start, d)));
        const today = isToday(d);
        return (
          <div key={d.toISOString()} className={cn("relative border-l border-border/50", today && "bg-primary/[0.04]")} style={{ height: HOUR_HEIGHT * 24 }}>
            {HOURS.map((h) => (
              <div
                key={h}
                onClick={() => { const dt = new Date(d); dt.setHours(h, 0, 0, 0); onCreateAt(dt); }}
                style={{ height: HOUR_HEIGHT }}
                className="relative cursor-pointer border-t border-border/50 transition-colors first:border-t-0 hover:bg-foreground/[0.04] after:absolute after:inset-x-0 after:top-1/2 after:border-t after:border-dashed after:border-border/25"
              />
            ))}

            {laid.map(({ occ: o, endDate, col, cols: n }) => {
              const geom = getOccBlockGeom(o);
              // Overlaps cascade like Google Calendar: each later one shifts right and sits on top,
              // instead of splitting a narrow column into unreadable slivers.
              const left = n > 1 ? col * Math.min(40, 70 / (n - 1)) : 0;
              return (
                <div
                  key={o.occurrenceKey}
                  className="absolute p-[1.5px]"
                  style={{ top: geom.top, height: geom.height, left: `${left}%`, width: `${100 - left}%`, zIndex: 10 + col }}
                >
                  <OccTimeBlock occ={o} endDate={endDate} height={geom.height} past={endDate < now} color={getTaskColor(o.task, projectColor(o.task.project_id))} onEdit={onEditTask} onDelete={onDeleteTask} />
                </div>
              );
            })}

            {/* Now-line: bold with a glowing dot on today, a faint guide across the rest of the week */}
            {showsToday && (
              today ? (
                <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowY }} aria-label={`Ahora, ${formatTime12(now)}`}>
                  <div className="h-[2px] -translate-y-1/2 bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.9)]" />
                  <span className="absolute -left-[5px] top-0 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]">
                    <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping motion-safe:[animation-duration:2.4s]" />
                  </span>
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-x-0 z-20 h-px bg-primary/30" style={{ top: nowY }} aria-hidden />
              )
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- Blocks & chips ---------------- */

const OccTimeBlock = ({
  occ, endDate, height, past, color, onEdit, onDelete,
}: { occ: TaskOccurrence; endDate: Date; height: number; past: boolean; color: string; onEdit: (t: Task) => void; onDelete: (id: string) => void }) => {
  const isRecurring = !!(occ.task.recurrence_interval && occ.task.recurrence_unit);
  const compact = height < 46; // 30–45 min: one line
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onEdit(occ.task); }}
      onKeyDown={(e) => { if (e.key === "Enter") onEdit(occ.task); }}
      className={cn(
        "group/block relative flex h-full w-full cursor-pointer overflow-hidden rounded-md pl-[8px] pr-1 text-left text-[11px] leading-[1.15] text-foreground outline-none transition-[filter,opacity] hover:brightness-125 focus-visible:ring-2 focus-visible:ring-primary/60",
        compact ? "items-center gap-1" : "flex-col gap-0.5 py-1",
        past && "opacity-55",
      )}
      style={{ background: `linear-gradient(${tint(color, 30)}, ${tint(color, 30)}), hsl(var(--card))`, boxShadow: `inset 0 0 0 1px ${tint(color, 45)}` }}
    >
      <span className="absolute inset-y-[3px] left-[3px] w-[3px] rounded-full" style={{ background: color }} aria-hidden />
      <span className={cn("flex min-w-0 gap-1", compact ? "items-center" : "items-start overflow-hidden")}>
        {isRecurring && <Repeat className="mt-px h-2.5 w-2.5 shrink-0 opacity-70" />}
        {/* Tall blocks wrap the name (even mid-word in narrow week columns); short ones truncate. */}
        <span className={cn("font-semibold", compact ? "truncate" : "[overflow-wrap:anywhere]")}>{occ.task.title}</span>
      </span>
      <span className={cn("truncate tabular-nums text-foreground/70", compact && "hidden min-[420px]:inline")}>
        {formatTime12(occ.start)}{compact ? "" : ` – ${formatTime12(endDate)}`}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(occ.task.id); }}
        className="absolute right-1 top-1 hidden rounded p-0.5 text-foreground/70 hover:text-foreground [@media(hover:hover)]:group-hover/block:block"
        aria-label={`Eliminar ${occ.task.title}`}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

const OccChip = ({
  occ, color, onEdit, onDelete,
}: { occ: TaskOccurrence; color: string; onEdit: (t: Task) => void; onDelete: (id: string) => void }) => {
  const isRecurring = !!(occ.task.recurrence_interval && occ.task.recurrence_unit);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onEdit(occ.task); }}
      onKeyDown={(e) => { if (e.key === "Enter") onEdit(occ.task); }}
      className="group/chip relative flex min-w-0 cursor-pointer items-center gap-1 overflow-hidden rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-primary/60 py-0.5 pl-[7px] pr-1 text-[10px] font-medium leading-tight text-foreground transition-[filter] hover:brightness-125 sm:text-[11px]"
      style={{ background: tint(color, 26) }}
    >
      <span className="absolute inset-y-[2px] left-[2px] w-[2.5px] rounded-full" style={{ background: color }} aria-hidden />
      {occ.task.start_time && <span className="hidden shrink-0 tabular-nums text-foreground/65 sm:inline">{formatTime12(occ.start)}</span>}
      {isRecurring && <Repeat className="h-2.5 w-2.5 shrink-0 opacity-70" />}
      <span className="min-w-0 flex-1 truncate">{occ.task.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(occ.task.id); }}
        className="hidden shrink-0 text-foreground/60 hover:text-destructive [@media(hover:hover)]:group-hover/chip:block"
        aria-label={`Eliminar ${occ.task.title}`}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
};

export default CalendarView;
