import type { Task } from "@/lib/types";
import type { ActivityRow } from "@/hooks/useActivity";
import type { SleepLog } from "@/hooks/useDailyLog";
import { dayKey, fromKey, lastDays } from "@/lib/localDay";

export type RangeDays = 7 | 30 | 90;

export interface DayStat {
  key: string;
  date: Date;
  tasks: number;
  habits: number;
  total: number;
  xp: number;
}

export interface HabitRow {
  id: string;
  title: string;
  done: number;
  due: number;
  rate: number; // 0..1
}

/** Time-of-day slots used by the rhythm heatmap. */
export const SLOTS = [
  { id: "morning", label: "Mañana", from: 5, to: 12 },
  { id: "afternoon", label: "Tarde", from: 12, to: 18 },
  { id: "evening", label: "Noche", from: 18, to: 24 },
  { id: "late", label: "Madrugada", from: 0, to: 5 },
] as const;
export const slotOf = (hour: number) => SLOTS.findIndex((s) => hour >= s.from && hour < s.to);

/** Monday-first weekday order for rows. */
export const WEEKDAYS = [
  { d: 1, short: "L", long: "lunes" }, { d: 2, short: "M", long: "martes" }, { d: 3, short: "X", long: "miércoles" },
  { d: 4, short: "J", long: "jueves" }, { d: 5, short: "V", long: "viernes" }, { d: 6, short: "S", long: "sábado" },
  { d: 0, short: "D", long: "domingo" },
];

export interface Stats {
  days: DayStat[];
  prevDays: DayStat[];
  completed: number;
  prevCompleted: number;
  xp: number;
  prevXp: number;
  habitRate: number | null;
  prevHabitRate: number | null;
  habits: HabitRow[];
  /** heat[weekdayIndex (Mon-first)][slot] = completions */
  heat: number[][];
  sleep: { key: string; date: Date; minutes: number | null }[];
  sleepAvg: number | null;
  prevSleepAvg: number | null;
  /** Hours slept vs completions that same day (the log's day is the morning after). */
  sleepPairs: { key: string; minutes: number; total: number }[];
  activeDays: number;
}

function bucket(keys: string[], rows: ActivityRow[]): DayStat[] {
  const map = new Map(keys.map((k) => [k, { key: k, date: fromKey(k), tasks: 0, habits: 0, total: 0, xp: 0 }]));
  for (const r of rows) {
    const d = map.get(r.day);
    if (!d) continue;
    if (r.isDaily) d.habits++;
    else d.tasks++;
    d.total++;
    d.xp += r.xp;
  }
  return keys.map((k) => map.get(k)!);
}

function habitStats(keys: string[], habits: Task[], rows: ActivityRow[], today: string, tz: string): { rows: HabitRow[]; rate: number | null } {
  const doneBy = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.isDaily) continue;
    if (!doneBy.has(r.taskId)) doneBy.set(r.taskId, new Set());
    doneBy.get(r.taskId)!.add(r.day);
  }
  let due = 0;
  let done = 0;
  const out: HabitRow[] = habits.map((h) => {
    const createdKey = dayKey(h.created_at, tz);
    const days = h.daily_days ?? [];
    const doneDays = doneBy.get(h.id) ?? new Set<string>();
    let hDue = 0;
    let hDone = 0;
    for (const k of keys) {
      if (k < createdKey) continue;
      if (days.length && !days.includes(fromKey(k).getDay())) continue;
      const isDone = doneDays.has(k);
      // Today only counts once it's done, so the morning doesn't look like a failure.
      if (k === today && !isDone) continue;
      hDue++;
      if (isDone) hDone++;
    }
    due += hDue;
    done += hDone;
    return { id: h.id, title: h.title, done: hDone, due: hDue, rate: hDue ? hDone / hDue : 0 };
  });
  return {
    rows: out.filter((r) => r.due > 0).sort((a, b) => b.rate - a.rate || b.due - a.due),
    rate: due ? done / due : null,
  };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function computeStats(range: RangeDays, activity: ActivityRow[], sleepLogs: SleepLog[], habits: Task[], tz: string): Stats {
  const all = lastDays(range * 2, tz);
  const prevKeys = all.slice(0, range);
  const keys = all.slice(range);
  const today = keys[keys.length - 1];

  const days = bucket(keys, activity);
  const prevDays = bucket(prevKeys, activity);
  const sum = (ds: DayStat[], f: (d: DayStat) => number) => ds.reduce((s, d) => s + f(d), 0);

  const cur = habitStats(keys, habits, activity, today, tz);
  const prev = habitStats(prevKeys, habits, activity, today, tz);

  const heat = WEEKDAYS.map(() => SLOTS.map(() => 0));
  for (const r of activity) {
    if (r.day < keys[0]) continue;
    const row = WEEKDAYS.findIndex((w) => w.d === r.weekday);
    const col = slotOf(r.hour);
    if (row >= 0 && col >= 0) heat[row][col]++;
  }

  const sleepBy = new Map(sleepLogs.map((l) => [l.day, l.sleepMinutes]));
  const sleep = keys.map((k) => ({ key: k, date: fromKey(k), minutes: sleepBy.get(k) ?? null }));
  const totalsBy = new Map(days.map((d) => [d.key, d.total]));
  const sleepPairs = sleep
    .filter((s) => s.minutes != null && s.key !== today)
    .map((s) => ({ key: s.key, minutes: s.minutes!, total: totalsBy.get(s.key) ?? 0 }));

  return {
    days,
    prevDays,
    completed: sum(days, (d) => d.total),
    prevCompleted: sum(prevDays, (d) => d.total),
    xp: sum(days, (d) => d.xp),
    prevXp: sum(prevDays, (d) => d.xp),
    habitRate: cur.rate,
    prevHabitRate: prev.rate,
    habits: cur.rows,
    heat,
    sleep,
    sleepAvg: avg(sleep.filter((s) => s.minutes != null).map((s) => s.minutes!)),
    prevSleepAvg: avg(prevKeys.map((k) => sleepBy.get(k)).filter((m): m is number => m != null)),
    sleepPairs,
    activeDays: days.filter((d) => d.total > 0).length,
  };
}

export const fmtHours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
};

/** One-letter Spanish weekday (L M X J V S D): "EEEEE" in date-fns gives "M" for both martes and miércoles. */
export const dayInitial = (d: Date) => WEEKDAYS.find((w) => w.d === d.getDay())!.short;
