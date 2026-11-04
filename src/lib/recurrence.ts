import { addHours, addDays, addWeeks, addMonths, isBefore, isSameDay, startOfDay, endOfDay } from "date-fns";
import type { Task } from "@/lib/types";

export type RecurrenceUnit = "hour" | "day" | "week" | "month";

export interface TaskOccurrence {
  task: Task;
  start: Date;
  end: Date | null;
  occurrenceKey: string; // unique id for this instance: `${task.id}_${isoStart}`
}

const addByUnit = (date: Date, amount: number, unit: RecurrenceUnit): Date => {
  switch (unit) {
    case "hour": return addHours(date, amount);
    case "day": return addDays(date, amount);
    case "week": return addWeeks(date, amount);
    case "month": return addMonths(date, amount);
  }
};

/**
 * Expand a single task into all its occurrences within [rangeStart, rangeEnd].
 * Non-recurring tasks return at most one occurrence (using start_time or due_date).
 */
export const expandTask = (task: Task, rangeStart: Date, rangeEnd: Date): TaskOccurrence[] => {
  const out: TaskOccurrence[] = [];

  // Determine base start: prefer start_time, fallback to due_date at 00:00
  const baseStart = task.start_time
    ? new Date(task.start_time)
    : task.due_date
      ? startOfDay(new Date(task.due_date))
      : null;

  if (!baseStart) return out;

  const baseEnd = task.end_time ? new Date(task.end_time) : null;
  const durationMs = baseEnd ? baseEnd.getTime() - baseStart.getTime() : 0;

  const interval = task.recurrence_interval ?? 0;
  const unit = task.recurrence_unit as RecurrenceUnit | null;
  const recurrenceEnd = task.recurrence_end_date ? new Date(task.recurrence_end_date) : null;

  // Non-recurring
  if (!interval || !unit) {
    if (baseStart <= rangeEnd && (baseEnd ?? baseStart) >= rangeStart) {
      out.push({
        task,
        start: baseStart,
        end: baseEnd,
        occurrenceKey: `${task.id}_${baseStart.toISOString()}`,
      });
    }
    return out;
  }

  // Recurring: iterate from baseStart, advancing by interval+unit until we pass min(recurrenceEnd, rangeEnd)
  const hardStop = recurrenceEnd && recurrenceEnd < rangeEnd ? recurrenceEnd : rangeEnd;
  let cur = new Date(baseStart);
  let safety = 0;
  while (cur <= hardStop && safety < 5000) {
    if (cur >= rangeStart) {
      const occEnd = durationMs > 0 ? new Date(cur.getTime() + durationMs) : null;
      out.push({
        task,
        start: new Date(cur),
        end: occEnd,
        occurrenceKey: `${task.id}_${cur.toISOString()}`,
      });
    }
    cur = addByUnit(cur, interval, unit);
    safety++;
  }
  return out;
};

export const expandTasksInRange = (tasks: Task[], rangeStart: Date, rangeEnd: Date): TaskOccurrence[] => {
  const all: TaskOccurrence[] = [];
  for (const t of tasks) all.push(...expandTask(t, rangeStart, rangeEnd));
  return all.sort((a, b) => a.start.getTime() - b.start.getTime());
};

export const occurrencesOnDay = (occurrences: TaskOccurrence[], day: Date): TaskOccurrence[] =>
  occurrences.filter((o) => isSameDay(o.start, day));

export const dayBounds = (day: Date) => ({ start: startOfDay(day), end: endOfDay(day) });

export const isFutureOrSame = (a: Date, b: Date) => !isBefore(a, b);
