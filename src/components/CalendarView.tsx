import { useMemo, useRef, useState } from "react";
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
const HOUR_HEIGHT = 56; // px — must match h-14

const formatHour12 = (h: number) => {
  const period = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${period}`;
};
const formatTime12 = (d: Date) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h < 12 ? "AM" : "PM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${m.toString().padStart(2, "0")} ${period}`;
};

/**
 * Lay out overlapping occurrences side-by-side. Returns column index and
 * total columns for each occurrence so width = 100/totalCols and left = col*width.
 */
const layoutOccurrences = (
  occs: TaskOccurrence[]
): Array<{ occ: TaskOccurrence; col: number; cols: number; endDate: Date }> => {
  const enriched = occs.map((o) => {
    const { endDate } = getOccBlockGeom(o);
    return { occ: o, endDate };
  });
  enriched.sort((a, b) => a.occ.start.getTime() - b.occ.start.getTime());

  const out: Array<{ occ: TaskOccurrence; col: number; cols: number; endDate: Date }> = [];
  let cluster: Array<{ occ: TaskOccurrence; endDate: Date; col: number }> = [];
  let clusterMaxEnd = 0;

  const flush = () => {
    if (cluster.length === 0) return;
    const cols = Math.max(...cluster.map((c) => c.col)) + 1;
    for (const c of cluster) out.push({ occ: c.occ, endDate: c.endDate, col: c.col, cols });
    cluster = [];
    clusterMaxEnd = 0;
  };

  for (const item of enriched) {
    if (cluster.length > 0 && item.occ.start.getTime() >= clusterMaxEnd) {
      flush();
    }
    const used = new Set(cluster.map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ occ: item.occ, endDate: item.endDate, col });
    clusterMaxEnd = Math.max(clusterMaxEnd, item.endDate.getTime());
  }
  flush();
  return out;
};

const getOccBlockGeom = (occ: TaskOccurrence) => {
  const startMinutes = occ.start.getHours() * 60 + occ.start.getMinutes();
  const endDate = occ.end ?? new Date(occ.start.getTime() + 60 * 60 * 1000);
  // clamp end to same day
  const sameDayEnd = isSameDay(occ.start, endDate)
    ? endDate
    : new Date(occ.start.getFullYear(), occ.start.getMonth(), occ.start.getDate(), 23, 59, 59);
  const endMinutes = sameDayEnd.getHours() * 60 + sameDayEnd.getMinutes();
  const durationMinutes = Math.max(30, endMinutes - startMinutes);
  return {
    top: (startMinutes / 60) * HOUR_HEIGHT,
    height: (durationMinutes / 60) * HOUR_HEIGHT,
    endDate: sameDayEnd,
  };
};

/** Extract a "color:#hex" tag from task.tags, falling back to project color. */
const getTaskColor = (task: Task, projectColor?: string): string => {
  const tag = (task.tags ?? []).find((t) => typeof t === "string" && t.startsWith("color:"));
  if (tag) {
    const hex = tag.slice("color:".length);
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  }
  return projectColor ?? "hsl(var(--primary))";
};

const CalendarView = ({ tasks, projects, onCreateAt, onEditTask, onDeleteTask }: CalendarViewProps) => {
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState<Date>(new Date());

  const range = useMemo(() => {
    if (view === "month") {
      const s = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
      const e = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
      return { start: s, end: e };
    }
    if (view === "week") {
      return { start: startOfWeek(cursor, { weekStartsOn: 0 }), end: endOfWeek(cursor, { weekStartsOn: 0 }) };
    }
    return { start: startOfDay(cursor), end: endOfDay(cursor) };
  }, [cursor, view]);

  const occurrences = useMemo(
    () => expandTasksInRange(tasks, range.start, range.end),
    [tasks, range.start, range.end]
  );

  const projectColor = (id: string | null) => projects.find((p) => p.id === id)?.color;

  const navigate = (dir: -1 | 1) => {
    if (view === "month") setCursor(addMonths(cursor, dir));
    else if (view === "week") setCursor(addWeeks(cursor, dir));
    else setCursor(addDays(cursor, dir));
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return format(cursor, "MMMM yyyy", { locale: es });
    if (view === "week") return `${format(range.start, "d MMM", { locale: es })} – ${format(range.end, "d MMM yyyy", { locale: es })}`;
    return format(cursor, "EEEE d 'de' MMMM yyyy", { locale: es });
  }, [view, cursor, range]);

  // Swipe navigation
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigate(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())} className="font-pixel text-xs">Hoy</Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <h2 className="font-pixel text-xs md:text-sm capitalize ml-2">{headerLabel}</h2>
        </div>
        <div className="flex rounded-lg bg-muted p-1">
          {(["month", "week", "day"] as CalView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1 rounded-md font-pixel text-xs transition-colors capitalize",
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "month" ? "Mes" : v === "week" ? "Semana" : "Día"}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 overflow-auto rounded-xl border border-border bg-card/40 backdrop-blur touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {view === "month" && (
          <MonthGrid cursor={cursor} range={range} occurrences={occurrences} projectColor={projectColor} onCreateAt={onCreateAt} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
        )}
        {view === "week" && (
          <WeekGrid range={range} occurrences={occurrences} projectColor={projectColor} onCreateAt={onCreateAt} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
        )}
        {view === "day" && (
          <DayGrid day={cursor} occurrences={occurrences} projectColor={projectColor} onCreateAt={onCreateAt} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
        )}
      </div>
    </div>
  );
};

/* ---------------- Month ---------------- */

const MonthGrid = ({
  cursor, range, occurrences, projectColor, onCreateAt, onEditTask, onDeleteTask,
}: {
  cursor: Date; range: { start: Date; end: Date }; occurrences: TaskOccurrence[];
  projectColor: (id: string | null) => string | undefined;
  onCreateAt: (d: Date) => void; onEditTask: (t: Task) => void; onDeleteTask: (id: string) => void;
}) => {
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="grid grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] h-full min-h-[600px]">
      {dayNames.map((d) => (
        <div key={d} className="border-b border-r border-border p-2 text-center font-pixel text-xs text-muted-foreground bg-muted/30 uppercase">{d}</div>
      ))}
      {days.map((day) => {
        const dayOccs = occurrences.filter((o) => isSameDay(o.start, day));
        const inMonth = isSameMonth(day, cursor);
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "border-b border-r border-border p-1 group relative flex flex-col gap-0.5 overflow-hidden",
              !inMonth && "bg-muted/10",
            )}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => onCreateAt(day)}
                className={cn(
                  "text-xs w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                  isToday(day) ? "bg-primary text-primary-foreground font-bold" : "text-foreground hover:bg-accent",
                  !inMonth && "text-muted-foreground/50"
                )}
              >
                {format(day, "d")}
              </button>
              <button
                onClick={() => onCreateAt(day)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {dayOccs.slice(0, 4).map((o) => (
                <OccChip key={o.occurrenceKey} occ={o} color={getTaskColor(o.task, projectColor(o.task.project_id))} onEdit={onEditTask} onDelete={onDeleteTask} />
              ))}
              {dayOccs.length > 4 && (
                <p className="text-xs text-muted-foreground px-1">+{dayOccs.length - 4} más</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- Week ---------------- */

const WeekGrid = ({
  range, occurrences, projectColor, onCreateAt, onEditTask, onDeleteTask,
}: {
  range: { start: Date; end: Date }; occurrences: TaskOccurrence[];
  projectColor: (id: string | null) => string | undefined;
  onCreateAt: (d: Date) => void; onEditTask: (t: Task) => void; onDeleteTask: (id: string) => void;
}) => {
  const days = eachDayOfInterval({ start: range.start, end: range.end });

  return (
    <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))]">
      <div className="border-b border-r border-border bg-muted/30" />
      {days.map((d) => (
        <button
          key={d.toISOString()}
          onClick={() => onCreateAt(d)}
          className="border-b border-r border-border p-2 text-center hover:bg-accent/30 transition-colors"
        >
          <div className="font-pixel text-xs text-muted-foreground uppercase">{format(d, "EEEEE", { locale: es })}</div>
          <div className={cn(
            "text-sm mt-1 inline-flex w-7 h-7 items-center justify-center rounded-full",
            isToday(d) && "bg-primary text-primary-foreground font-bold"
          )}>
            {format(d, "d")}
          </div>
        </button>
      ))}
      {/* Hour gutter */}
      <div className="relative">
        {HOURS.map((h) => (
          <div key={`hg-${h}`} style={{ height: HOUR_HEIGHT }} className="border-b border-r border-border px-1 text-right text-xs text-muted-foreground pt-0.5">
            {formatHour12(h)}
          </div>
        ))}
      </div>
      {/* Day columns */}
      {days.map((d) => {
        const dayOccs = occurrences.filter((o) => isSameDay(o.start, d));
        const laid = layoutOccurrences(dayOccs);
        return (
          <div key={`col-${d.toISOString()}`} className="relative border-r border-border" style={{ height: HOUR_HEIGHT * 24 }}>
            {HOURS.map((h) => (
              <div
                key={`bg-${h}`}
                onClick={() => { const dt = new Date(d); dt.setHours(h, 0, 0, 0); onCreateAt(dt); }}
                style={{ height: HOUR_HEIGHT }}
                className="border-b border-border hover:bg-accent/20 transition-colors cursor-pointer"
              />
            ))}
            {laid.map(({ occ: o, endDate, col, cols }) => {
              const geom = getOccBlockGeom(o);
              const widthPct = 100 / cols;
              const leftPct = col * widthPct;
              return (
                <div
                  key={o.occurrenceKey}
                  className="absolute px-px"
                  style={{ top: geom.top, height: geom.height, left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <OccTimeBlock occ={o} endDate={endDate} color={getTaskColor(o.task, projectColor(o.task.project_id))} onEdit={onEditTask} onDelete={onDeleteTask} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- Day ---------------- */

const DayGrid = ({
  day, occurrences, projectColor, onCreateAt, onEditTask, onDeleteTask,
}: {
  day: Date; occurrences: TaskOccurrence[];
  projectColor: (id: string | null) => string | undefined;
  onCreateAt: (d: Date) => void; onEditTask: (t: Task) => void; onDeleteTask: (id: string) => void;
}) => {
  const dayOccs = occurrences.filter((o) => isSameDay(o.start, day));
  const laid = layoutOccurrences(dayOccs);
  return (
    <div className="grid grid-cols-[60px_1fr]">
      <div className="relative">
        {HOURS.map((h) => (
          <div key={`dh-${h}`} style={{ height: HOUR_HEIGHT }} className="border-b border-r border-border px-2 text-right text-xs text-muted-foreground pt-1">
            {formatHour12(h)}
          </div>
        ))}
      </div>
      <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
        {HOURS.map((h) => (
          <div
            key={`dbg-${h}`}
            onClick={() => { const dt = new Date(day); dt.setHours(h, 0, 0, 0); onCreateAt(dt); }}
            style={{ height: HOUR_HEIGHT }}
            className="border-b border-border hover:bg-accent/20 transition-colors cursor-pointer"
          />
        ))}
        {laid.map(({ occ: o, endDate, col, cols }) => {
          const geom = getOccBlockGeom(o);
          const widthPct = 100 / cols;
          const leftPct = col * widthPct;
          return (
            <div
              key={o.occurrenceKey}
              className="absolute px-0.5"
              style={{ top: geom.top, height: geom.height, left: `${leftPct}%`, width: `${widthPct}%` }}
            >
              <OccTimeBlock occ={o} endDate={endDate} color={getTaskColor(o.task, projectColor(o.task.project_id))} onEdit={onEditTask} onDelete={onDeleteTask} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OccTimeBlock = ({
  occ, endDate, color, onEdit, onDelete,
}: { occ: TaskOccurrence; endDate: Date; color?: string; onEdit: (t: Task) => void; onDelete: (id: string) => void }) => {
  const isRecurring = !!(occ.task.recurrence_interval && occ.task.recurrence_unit);
  const c = color ?? "hsl(var(--primary))";
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onEdit(occ.task); }}
      className="group/block h-full w-full rounded-md px-2 py-1 text-[11px] cursor-pointer hover:brightness-110 transition-all overflow-hidden flex flex-col text-white shadow-sm"
      style={{ backgroundColor: c, borderLeft: `3px solid ${c}` }}
    >
      <div className="flex items-center gap-1">
        {isRecurring && <Repeat className="h-3 w-3 shrink-0 text-white/80" />}
        <span className={cn("truncate flex-1 font-semibold", occ.task.status === "done" && "line-through opacity-60")}>{occ.task.title}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(occ.task.id); }}
          className="opacity-0 group-hover/block:opacity-100 text-white/80 hover:text-white shrink-0"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <p className="text-xs text-white/85 mt-0.5 truncate">
        {formatTime12(occ.start)} – {formatTime12(endDate)}
      </p>
    </div>
  );
};

/* ---------------- Chips / blocks ---------------- */

const OccChip = ({
  occ, color, onEdit, onDelete,
}: { occ: TaskOccurrence; color?: string; onEdit: (t: Task) => void; onDelete: (id: string) => void }) => {
  const isRecurring = !!(occ.task.recurrence_interval && occ.task.recurrence_unit);
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onEdit(occ.task); }}
      className="group/chip flex items-center gap-1 rounded px-1.5 py-0.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
      style={{ backgroundColor: (color ?? "hsl(var(--primary))") + "30", borderLeft: `2px solid ${color ?? "hsl(var(--primary))"}` }}
    >
      {occ.task.start_time && <span className="text-muted-foreground shrink-0">{formatTime12(occ.start)}</span>}
      {isRecurring && <Repeat className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />}
      <span className={cn("truncate flex-1", occ.task.status === "done" && "line-through opacity-50")}>{occ.task.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(occ.task.id); }}
        className="opacity-0 group-hover/chip:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
};

export default CalendarView;
