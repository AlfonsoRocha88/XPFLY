/** Today's date (YYYY-MM-DD) in the given IANA time zone, using the server clock. */
export function localDay(tz?: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC" }).format(new Date());
  } catch {
    // Unknown zone stored in the profile: fall back to UTC.
    return new Date().toISOString().slice(0, 10);
  }
}

/** Current hour (0–23) in the given IANA time zone; UTC when the zone is unknown. */
export function localHour(tz?: string | null): number {
  try {
    const h = new Intl.DateTimeFormat("en-US", { timeZone: tz || "UTC", hour: "numeric", hourCycle: "h23" }).format(new Date());
    return Number(h) % 24;
  } catch {
    return new Date().getUTCHours();
  }
}

/** YYYY-MM-DD shifted by whole days (calendar math on the date itself, no time zone involved). */
export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
