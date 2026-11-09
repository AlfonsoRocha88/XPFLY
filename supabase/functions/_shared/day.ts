/** Today's date (YYYY-MM-DD) in the given IANA time zone, using the server clock. */
export function localDay(tz?: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC" }).format(new Date());
  } catch {
    // Unknown zone stored in the profile: fall back to UTC.
    return new Date().toISOString().slice(0, 10);
  }
}
