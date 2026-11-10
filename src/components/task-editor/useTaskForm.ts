import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";
import { parseQuickInput, type QuickKind } from "@/lib/quickParse";
import { DAILY_PRIORITY, XP_REWARDS } from "@/lib/xp";

export type RecurrenceUnit = "hour" | "day" | "week" | "month";
export type TaskKind = "task" | "daily";
export type DetailKey = "date" | "time" | "reminder" | "repeat" | "tags" | "note";

export interface TaskDialogData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  project_id: string | null;
  tags: string[];
  is_daily: boolean;
  start_time: string | null;
  end_time: string | null;
  recurrence_interval: number | null;
  recurrence_unit: RecurrenceUnit | null;
  recurrence_end_date: string | null;
  reminders: number[];
  daily_days: number[];
}

/** Reserved tag used by schedule blocks — never allowed from the task form. */
const RESERVED_TAG = "tipo:horario";

const hhmm = (iso: string | null | undefined) => (iso ? format(new Date(iso), "HH:mm") : null);

const withTime = (day: Date, time: string) => {
  const [h, m] = time.split(":").map(Number);
  const out = new Date(day);
  out.setHours(h || 0, m || 0, 0, 0);
  return out;
};

export function useTaskForm(task: Task | null | undefined, defaultProjectId: string | null | undefined, defaultDate: Date | null | undefined) {
  const editing = !!task;

  const [kind, setKind] = useState<TaskKind>(task?.is_daily ? "daily" : "task");
  const [text, setText] = useState(task?.title ?? "");
  const [ignored, setIgnored] = useState<Set<QuickKind>>(new Set());
  const [priority, setPriority] = useState<TaskPriority>(task && !task.is_daily ? task.priority : "medium");
  const [dailyDays, setDailyDays] = useState<number[]>(task?.daily_days ?? []);

  // date-only strings ("2026-11-10") must be parsed as local dates, not UTC.
  const [date, setDate] = useState<Date | null>(
    task?.due_date ? parseISO(task.due_date) : task?.start_time ? new Date(task.start_time) : defaultDate ? new Date(defaultDate) : null,
  );
  const [startTime, setStartTime] = useState<string | null>(hhmm(task?.start_time) ?? (defaultDate ? "09:00" : null));
  const [endTime, setEndTime] = useState<string | null>(hhmm(task?.end_time) ?? (defaultDate ? "10:00" : null));
  const [reminders, setReminders] = useState<number[]>(task?.reminders ?? []);

  const [repeatEvery, setRepeatEvery] = useState<number | null>(task?.recurrence_interval ?? null);
  const [repeatUnit, setRepeatUnit] = useState<RecurrenceUnit>((task?.recurrence_unit as RecurrenceUnit) ?? "day");
  const [repeatForDays, setRepeatForDays] = useState<number>(() => {
    if (!task?.recurrence_end_date) return 7;
    return Math.max(1, Math.ceil((new Date(task.recurrence_end_date).getTime() - Date.now()) / 86_400_000));
  });

  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [note, setNote] = useState(task?.description ?? "");

  // Sections that already hold a value start open, so editing shows what's set.
  const [open, setOpen] = useState<Set<DetailKey>>(() => {
    const s = new Set<DetailKey>();
    if (date && !task?.is_daily) s.add("date");
    if (startTime) s.add("time");
    if (reminders.length) s.add("reminder");
    if (repeatEvery) s.add("repeat");
    if (tags.length) s.add("tags");
    if (note) s.add("note");
    return s;
  });

  // Smart typing only for new tasks: an existing title like "Llamar mañana" stays as is.
  const parsed = useMemo(
    () => (editing ? null : parseQuickInput(text, new Date(), ignored)),
    [editing, text, ignored],
  );

  const title = parsed ? parsed.title : text.trim();
  const effectivePriority: TaskPriority = kind === "daily" ? DAILY_PRIORITY : parsed?.priority?.value ?? priority;
  const effectiveDate = parsed?.date?.value ?? date;
  const effectiveTime = parsed?.time?.value ?? startTime;
  const xp = XP_REWARDS[effectivePriority];

  /** Chip ✕: the word was meant literally, so it goes back into the title. */
  const ignore = (k: QuickKind) => setIgnored((prev) => new Set(prev).add(k));
  /** A manual pick replaces a detected value: drop the detected words from the text. */
  const consume = (k: QuickKind) => {
    const m = parsed?.[k];
    if (m) setText((t) => t.replace(m.text, " ").replace(/\s+/g, " ").trimStart());
  };
  const pickPriority = (p: TaskPriority) => { consume("priority"); setPriority(p); };
  const pickDate = (d: Date | null) => { consume("date"); setDate(d); };
  const pickTime = (t: string | null) => { consume("time"); setStartTime(t); };
  const toggleOpen = (k: DetailKey) => {
    if (k === "repeat" && !open.has(k) && !repeatEvery) setRepeatEvery(1);
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };
  const closeDetail = (k: DetailKey) => {
    setOpen((prev) => { const next = new Set(prev); next.delete(k); return next; });
    if (k === "date") pickDate(null);
    if (k === "time") { pickTime(null); setEndTime(null); setReminders([]); }
    if (k === "reminder") setReminders([]);
    if (k === "repeat") setRepeatEvery(null);
    if (k === "tags") setTags([]);
    if (k === "note") setNote("");
  };

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t || t.toLowerCase() === RESERVED_TAG || tags.includes(t)) return false;
    setTags([...tags, t]);
    return true;
  };

  const canSave = title.length > 0;

  const build = (): TaskDialogData | null => {
    if (!canSave) return null;
    const isDaily = kind === "daily";
    const day = effectiveDate ?? new Date();
    const start = !isDaily && effectiveTime ? withTime(day, effectiveTime) : null;
    let end: Date | null = null;
    if (start) {
      end = endTime && endTime > effectiveTime! ? withTime(day, endTime) : new Date(start.getTime() + 3_600_000);
    }
    const repeating = !isDaily && !!repeatEvery;
    let repeatEnd: string | null = null;
    if (repeating) {
      const e = new Date(start ?? new Date());
      e.setDate(e.getDate() + repeatForDays);
      repeatEnd = e.toISOString();
    }
    return {
      title,
      description: note.trim(),
      priority: effectivePriority,
      status: task?.status ?? "todo",
      due_date: isDaily ? null : effectiveDate ? format(effectiveDate, "yyyy-MM-dd") : null,
      project_id: task?.project_id ?? defaultProjectId ?? null,
      tags,
      is_daily: isDaily,
      start_time: start?.toISOString() ?? null,
      end_time: end?.toISOString() ?? null,
      recurrence_interval: repeating ? repeatEvery : null,
      recurrence_unit: repeating ? repeatUnit : null,
      recurrence_end_date: repeatEnd,
      reminders: start ? reminders : [],
      daily_days: isDaily ? dailyDays : [],
    };
  };

  return {
    editing, kind, setKind, text, setText, parsed, ignore, title,
    priority: effectivePriority, pickPriority, xp, dailyDays, setDailyDays,
    effectiveDate, pickDate, effectiveTime, pickTime, endTime, setEndTime,
    reminders, setReminders, repeatEvery, setRepeatEvery, repeatUnit, setRepeatUnit, repeatForDays, setRepeatForDays,
    tags, setTags, addTag, note, setNote, open, toggleOpen, closeDetail, canSave, build,
  };
}

export type TaskForm = ReturnType<typeof useTaskForm>;
