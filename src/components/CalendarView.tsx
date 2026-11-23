import { useEffect, useMemo, useRef, useState } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks,
  format, isSameMonth, isSameDay, isToday, eachDayOfInterval, startOfDay, endOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, MapPin, Plus, Trash2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ConnectCalendar from "@/components/calendar/ConnectCalendar";
import { useExternalEvents, type ExternalEvent } from "@/hooks/useExternalEvents";
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

/** Anything placed on the time grid: task occurrences and connected-calendar events. */
type Timed = { start: Date; end: Date | null };

/** One connected-calendar event clipped to one day of the visible range (read-only). */
type ExtSeg = { ev: ExternalEvent; start: Date; end: Date; key: string };
type DayExternal = { allDay: ExtSeg[]; timed: ExtSeg[] };
const dayKey = (d: Date) => startOfDay(d).getTime();

const getOccBlockGeom = (occ: Timed) => {
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
const layoutOccurrences = <T extends Timed>(occs: T[]) => {
  const enriched = occs.map((o) => ({ occ: o, endDate: getOccBlockGeom(o).endDate }));
  enriched.sort((a, b) => a.occ.start.getTime() - b.occ.start.getTime());
  const out: Array<{ occ: T; col: number; cols: number; endDate: Date }> = [];
  let cluster: Array<{ occ: T; endDate: Date; col: number }> = [];
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

/** Month cell / all-day row content: tasks and calendar events, all-day first, then by time. */
type CellItem = { kind: "task"; occ: TaskOccurrence; rank: number; t: number } | { kind: "ext"; seg: ExtSeg; rank: number; t: number };
const mergeCell = (occs: TaskOccurrence[], extAllDay?: ExtSeg[], extTimed?: ExtSeg[]): CellItem[] => {
  const items: CellItem[] = occs.map((o) => ({ kind: "task", occ: o, rank: isAllDay(o) ? 0 : 1, t: o.start.getTime() }));
  if (!extAllDay?.length && !extTimed?.length) return items;
  for (const seg of extAllDay ?? []) items.push({ kind: "ext", seg, rank: 0, t: seg.start.getTime() });
  for (const seg of extTimed ?? []) items.push({ kind: "ext", seg, rank: 1, t: seg.start.getTime() });
  return items.sort((a, b) => a.rank - b.rank || a.t - b.t);
};

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
  const [connectOpen, setConnectOpen] = useState(false);

  // Connected calendars: fetched per visible range, then split into per-day pieces once per range.
  const { events: externalEvents } = useExternalEvents(range.start, range.end);
  const externalByDay = useMemo(() => {
    const map = new Map<number, DayExternal>();
    if (!externalEvents.length) return map;
    for (const day of eachDayOfInterval({ start: range.start, end: range.end })) {
      const ds = startOfDay(day);
      const de = addDays(ds, 1);
      const entry: DayExternal = { allDay: [], timed: [] };
      for (const ev of externalEvents) {
        if (ev.start >= de || ev.end <= ds) continue;
        const seg: ExtSeg = { ev, start: ev.start > ds ? ev.start : ds, end: ev.end < de ? ev.end : de, key: `${ev.id}_${ds.getTime()}` };
        // A timed event that covers this whole day (middle of a multi-day one) reads as all-day.
        if (ev.allDay || (seg.start <= ds && seg.end >= de)) entry.allDay.push(seg); else entry.timed.push(seg);
      }
      if (entry.allDay.length || entry.timed.length) map.set(ds.getTime(), entry);
    }
    return map;
  }, [externalEvents, range.start, range.end]);
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

  const shared = { occurrences, externalByDay, projectColor, onCreateAt, onEditTask, onDeleteTask, now };

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
        <div className="flex items-center gap-2">
        <div className="glass flex flex-1 rounded-full p-1">
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
        <button
          onClick={() => setConnectOpen(true)}
          className="glass flex h-10 w-10 shrink-0 touch-manipulation select-none items-center justify-center rounded-full text-muted-foreground transition-[color,transform] duration-150 hover:text-foreground active:scale-90"
          aria-label="Conectar calendario"
          title="Conectar calendario"
        >
          <CalendarPlus className="h-[18px] w-[18px]" />
        </button>
        </div>
      </div>
      <ConnectCalendar open={connectOpen} onOpenChange={setConnectOpen} />

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
  externalByDay: Map<number, DayExternal>;
  projectColor: (id: string | null) => string | undefined;
  onCreateAt: (d: Date) => void;
  onEditTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  now: Date;
};

/* ---------------- Month ---------------- */

const MonthGrid = ({ cursor, range, occurrences, externalByDay, projectColor, onCreateAt, onEditTask, onDeleteTask }: GridProps & { cursor: Date; range: { start: Date; end: Date } }) => {
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const weeks = days.length / 7;

  return (
    <div className="grid h-full min-h-[560px] grid-cols-7" style={{ gridTemplateRows: `auto repeat(${weeks}, minmax(0, 1fr))` }}>
      {dayNames.map((d) => (
        <div key={d} className="border-b border-border/60 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
      ))}
      {days.map((day, i) => {
        const ext = externalByDay.get(dayKey(day));
        const dayOccs = mergeCell(occurrences.filter((o) => isSameDay(o.start, day)), ext?.allDay, ext?.timed);
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
              {dayOccs.slice(0, 3).map((it) => (it.kind === "ext"
                ? <ExtChip key={it.seg.key} seg={it.seg} />
                : <OccChip key={it.occ.occurrenceKey} occ={it.occ} color={getTaskColor(it.occ.task, projectColor(it.occ.task.project_id))} onEdit={onEditTask} onDelete={onDeleteTask} />
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

const TimeGrid = ({ days, occurrences, externalByDay, projectColor, onCreateAt, onEditTask, onDeleteTask, now }: GridProps & { days: Date[] }) => {
  const cols = days.length === 1 ? "grid-cols-[44px_minmax(0,1fr)]" : GUTTER;
  const showsToday = days.some((d) => isToday(d));
  const nowY = (minutesOf(now) / 60) * HOUR_HEIGHT;
  const allDay = days.map((d) => mergeCell(occurrences.filter((o) => isAllDay(o) && isSameDay(o.start, d)), externalByDay.get(dayKey(d))?.allDay));
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
                {list.map((it) => (it.kind === "ext"
                  ? <ExtChip key={it.seg.key} seg={it.seg} />
                  : <OccChip key={it.occ.occurrenceKey} occ={it.occ} color={getTaskColor(it.occ.task, projectColor(it.occ.task.project_id))} onEdit={onEditTask} onDelete={onDeleteTask} />
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
        // Tasks and calendar events share one overlap layout, so they never sit on top of each other.
        const items: Array<Timed & ({ kind: "task"; occ: TaskOccurrence } | { kind: "ext"; seg: ExtSeg })> =
          occurrences.filter((o) => !isAllDay(o) && isSameDay(o.start, d)).map((o) => ({ kind: "task", occ: o, start: o.start, end: o.end }));
        for (const seg of externalByDay.get(dayKey(d))?.timed ?? []) items.push({ kind: "ext", seg, start: seg.start, end: seg.end });
        const laid = layoutOccurrences(items);
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

            {laid.map(({ occ: item, endDate, col, cols: n }) => {
              const geom = getOccBlockGeom(item);
              // Overlaps cascade like Google Calendar: each later one shifts right and sits on top,
              // instead of splitting a narrow column into unreadable slivers.
              const left = n > 1 ? col * Math.min(40, 70 / (n - 1)) : 0;
              return (
                <div
                  key={item.kind === "task" ? item.occ.occurrenceKey : item.seg.key}
                  className="absolute p-[1.5px]"
                  style={{ top: geom.top, height: geom.height, left: `${left}%`, width: `${100 - left}%`, zIndex: 10 + col }}
                >
                  {item.kind === "task"
                    ? <OccTimeBlock occ={item.occ} endDate={endDate} height={geom.height} past={endDate < now} color={getTaskColor(item.occ.task, projectColor(item.occ.task.project_id))} onEdit={onEditTask} onDelete={onDeleteTask} />
                    : <ExtTimeBlock seg={item.seg} endDate={endDate} height={geom.height} past={item.seg.end < now} />}
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

/* ---------------- Connected-calendar events (read-only) ---------------- */

const shortDate = (d: Date) => format(d, "d MMM", { locale: es });

/** Tap a calendar event: what, when, where, which calendar. Never opens the task editor. */
const ExtPopover = ({ ev, children }: { ev: ExternalEvent; children: React.ReactElement }) => {
  const lastDay = new Date(ev.end.getTime() - 1);
  const oneDay = isSameDay(ev.start, lastDay);
  const when = ev.allDay
    ? oneDay ? "Todo el día" : `${shortDate(ev.start)} – ${shortDate(lastDay)}`
    : oneDay
      ? `${formatTime12(ev.start)} – ${formatTime12(ev.end)}`
      : `${shortDate(ev.start)} ${formatTime12(ev.start)} – ${shortDate(ev.end)} ${formatTime12(ev.end)}`;
  return (
    // Modal: the tap that dismisses it must not also land on a slot and create a task.
    <Popover modal>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="w-[min(18rem,calc(100vw-2rem))] space-y-2 p-3.5"
        // Portaled, but React events still bubble to the month cell / hour slot behind it.
        onClick={stopEvent}
      >
        <p className="font-semibold leading-snug [overflow-wrap:anywhere]">{ev.title}</p>
        <p className="text-sm tabular-nums text-muted-foreground">{when}</p>
        {ev.location && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{ev.location}</span>
          </p>
        )}
        <p className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-muted-foreground">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ev.color }} aria-hidden />
          <span className="truncate">{ev.calendarName}</span>
        </p>
      </PopoverContent>
    </Popover>
  );
};

const stopEvent = (e: React.SyntheticEvent) => e.stopPropagation();
/** The blocks are divs (they hold block content), so give them a button's Enter/Space. */
const keyClick = (e: React.KeyboardEvent<HTMLElement>) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); }
};

const ExtTimeBlock = ({ seg, endDate, height, past }: { seg: ExtSeg; endDate: Date; height: number; past: boolean }) => {
  const { ev } = seg;
  const compact = height < 46;
  return (
    <ExtPopover ev={ev}>
      <div
        role="button"
        tabIndex={0}
        onClick={stopEvent}
        onKeyDown={keyClick}
        aria-label={`${ev.title}, ${ev.calendarName}`}
        className={cn(
          "relative flex h-full w-full cursor-pointer select-none overflow-hidden rounded-md pl-1.5 pr-1 text-left text-[11px] leading-[1.15] text-foreground outline-none transition-[filter,opacity] focus-visible:ring-2 focus-visible:ring-primary/60 active:brightness-125 [@media(hover:hover)]:hover:brightness-125",
          compact ? "items-center gap-1" : "flex-col gap-0.5 py-1",
          past && "opacity-55",
        )}
        style={{ background: `linear-gradient(${tint(ev.color, 20)}, ${tint(ev.color, 20)}), hsl(var(--card))`, boxShadow: `inset 0 0 0 1px ${tint(ev.color, 35)}` }}
      >
        <span className={cn("flex min-w-0 gap-1", compact ? "items-center" : "items-start overflow-hidden")}>
          <CalendarDays className="mt-px h-2.5 w-2.5 shrink-0" style={{ color: ev.color }} aria-hidden />
          <span className={cn("font-medium", compact ? "truncate" : "[overflow-wrap:anywhere]")}>{ev.title}</span>
        </span>
        <span className={cn("truncate tabular-nums text-foreground/65", compact && "hidden min-[420px]:inline")}>
          {formatTime12(seg.start)}{compact ? "" : ` – ${formatTime12(endDate)}`}
        </span>
      </div>
    </ExtPopover>
  );
};

const ExtChip = ({ seg }: { seg: ExtSeg }) => {
  const { ev } = seg;
  const showTime = !ev.allDay && seg.start.getTime() === ev.start.getTime();
  return (
    <ExtPopover ev={ev}>
      <div
        role="button"
        tabIndex={0}
        onClick={stopEvent}
        onKeyDown={keyClick}
        aria-label={`${ev.title}, ${ev.calendarName}`}
        className="relative flex min-w-0 cursor-pointer select-none items-center gap-1 overflow-hidden rounded-[5px] px-1 py-0.5 text-[10px] font-medium leading-tight text-foreground outline-none transition-[filter] focus-visible:ring-2 focus-visible:ring-primary/60 active:brightness-125 sm:text-[11px] [@media(hover:hover)]:hover:brightness-125"
        style={{ background: tint(ev.color, 18), boxShadow: `inset 0 0 0 1px ${tint(ev.color, 28)}` }}
      >
        <CalendarDays className="h-2.5 w-2.5 shrink-0" style={{ color: ev.color }} aria-hidden />
        {showTime && <span className="hidden shrink-0 tabular-nums text-foreground/65 sm:inline">{formatTime12(seg.start)}</span>}
        <span className="min-w-0 flex-1 truncate">{ev.title}</span>
      </div>
    </ExtPopover>
  );
};

export default CalendarView;
