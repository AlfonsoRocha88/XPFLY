/** Helpers to read timestamps as the user's local calendar day and hour, in their profile time zone. */

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions) {
  const key = tz + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, ...opts });
    } catch {
      f = new Intl.DateTimeFormat("en-CA", opts);
    }
    fmtCache.set(key, f);
  }
  return f;
}

/** "YYYY-MM-DD" of the instant in the given zone. */
export const dayKey = (d: Date | string, tz: string) =>
  fmt(tz, { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));

/** 0–23 hour of the instant in the given zone. */
export const hourIn = (d: Date | string, tz: string) =>
  Number(fmt(tz, { hour: "2-digit", hourCycle: "h23" }).format(new Date(d))) % 24;

/** Parses "YYYY-MM-DD" as a local Date at midnight (for labels and weekday math). */
export const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Consecutive day keys ending today (inclusive), oldest first. */
export function lastDays(count: number, tz: string): string[] {
  const today = fromKey(dayKey(new Date(), tz));
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (count - 1 - i));
    return toKey(d);
  });
}

export const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
