import { addDays } from "date-fns";
import type { TaskPriority } from "@/lib/types";

/** Pieces the quick-add line can detect. Each one becomes a removable chip. */
export type QuickKind = "date" | "time" | "priority";

export interface QuickMatch<T> {
  value: T;
  /** Exact text that was matched, removed from the title. */
  text: string;
}

export interface QuickParse {
  title: string;
  date: QuickMatch<Date> | null;
  time: QuickMatch<string> | null; // "HH:mm"
  priority: QuickMatch<TaskPriority> | null;
}

const strip = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// ---------------- Priority: "!alta", "!urgente" ----------------
const PRIORITY_WORDS: Record<string, TaskPriority> = { baja: "low", media: "medium", alta: "high", urgente: "urgent" };

function matchPriority(text: string): QuickMatch<TaskPriority> | null {
  const m = /(?:^|\s)(!(baja|media|alta|urgente))(?=\s|$)/i.exec(text);
  return m ? { value: PRIORITY_WORDS[m[2].toLowerCase()], text: m[1] } : null;
}

// ---------------- Date: hoy, mañana, pasado mañana, (el) lunes ----------------
const WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function matchDate(text: string, now: Date): QuickMatch<Date> | null {
  // Matched on an accent-free copy (same length), then sliced from the original text.
  const plain = strip(text);
  const re = /(?:^|\s)((?:pasado manana)|(?:hoy)|(?:manana)|(?:(?:el\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)))(?=\s|$)/;
  const m = re.exec(plain);
  if (!m) return null;
  const start = m.index + m[0].indexOf(m[1]);
  const original = text.slice(start, start + m[1].length);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let value: Date;
  if (m[1] === "hoy") value = today;
  else if (m[1] === "manana") value = addDays(today, 1);
  else if (m[1] === "pasado manana") value = addDays(today, 2);
  else {
    // Next occurrence of that weekday; "lunes" said on a Monday means next week.
    const target = WEEKDAYS.indexOf(m[2]);
    const diff = (target - today.getDay() + 7) % 7 || 7;
    value = addDays(today, diff);
  }
  return { value, text: original };
}

// ---------------- Time: "7pm", "19:00", "a las 7" ----------------
/**
 * Finds a time in the text and returns it as "HH:mm" plus the exact text matched.
 * Return null when there is no time.
 */
function matchTime(text: string): QuickMatch<string> | null {
  // TODO(human)
  return null;
}

/**
 * Splits a quick-add line into a clean title and detected date/time/priority.
 * Kinds in `ignore` are left in the title (the user removed that chip).
 */
export function parseQuickInput(text: string, now: Date = new Date(), ignore: ReadonlySet<QuickKind> = new Set()): QuickParse {
  const priority = ignore.has("priority") ? null : matchPriority(text);
  const date = ignore.has("date") ? null : matchDate(text, now);
  const time = ignore.has("time") ? null : matchTime(text);

  let title = text;
  for (const m of [priority, date, time]) if (m) title = title.replace(m.text, " ");
  title = title.replace(/\s+/g, " ").trim();

  return { title, date, time, priority };
}
