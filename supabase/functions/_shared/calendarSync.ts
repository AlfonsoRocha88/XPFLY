// Copies an external calendar (iCal link or Google Calendar) into calendar_events.
// Edge functions only (uses npm:ical.js); the app never imports this file.
// deno-lint-ignore-file no-explicit-any
import ICAL from "npm:ical.js@2.1.0";

const PAST_DAYS = 30;
const FUTURE_DAYS = 180;
const MAX_EVENTS = 2000;
const MAX_BYTES = 5 * 1024 * 1024;

export type Feed = {
  id: string; user_id: string; kind: "ical" | "google"; url: string | null;
  google_calendar_id: string | null; name: string; color: string;
};
type Row = { feed_id: string; user_id: string; uid: string; title: string; start_time: string; end_time: string; all_day: boolean; location: string | null };

export class SyncError extends Error {}

/** webcal:// → https://; only public https hosts (no IPs, no localhost). */
export function normalizeUrl(raw: string): string {
  const u = new URL(raw.trim().replace(/^webcals?:\/\//i, "https://"));
  if (u.protocol !== "https:") throw new SyncError("Link inválido");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || /^[\d.]+$/.test(host) || host.includes(":")) {
    throw new SyncError("Link inválido");
  }
  return u.toString();
}

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { Accept: "text/calendar, */*" } });
    if (!res.ok) throw new SyncError(res.status === 404 ? "El link ya no existe" : "No se pudo descargar");
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); throw new SyncError("Calendario muy grande"); }
      chunks.push(value);
    }
    const all = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) { all.set(c, off); off += c.length; }
    return new TextDecoder().decode(all);
  } catch (e) {
    if (e instanceof SyncError) throw e;
    throw new SyncError("No se pudo descargar");
  } finally {
    clearTimeout(timer);
  }
}

const clip = (s: unknown, n: number) => (typeof s === "string" && s.trim() ? s.trim().slice(0, n) : null);

/** Parses ICS text: expands repeats inside the window, applies moved/cancelled instances. */
export function parseIcs(text: string, feed: Pick<Feed, "id" | "user_id">): { name: string | null; rows: Row[] } {
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new SyncError("Ese link no es un calendario");
  let comp: any;
  try { comp = new ICAL.Component(ICAL.parse(text)); } catch { throw new SyncError("Ese link no es un calendario"); }

  for (const tz of comp.getAllSubcomponents("vtimezone")) {
    try { ICAL.TimezoneService.register(tz); } catch { /* already known */ }
  }
  const from = Date.now() - PAST_DAYS * 86_400_000;
  const to = Date.now() + FUTURE_DAYS * 86_400_000;
  const rows: Row[] = [];

  const vevents = comp.getAllSubcomponents("vevent");
  const masters = new Map<string, any>();
  const exceptions: any[] = [];
  for (const ve of vevents) {
    const ev = new ICAL.Event(ve);
    if (ev.isRecurrenceException()) exceptions.push(ev); else masters.set(ev.uid, ev);
  }
  for (const ex of exceptions) {
    const m = masters.get(ex.uid);
    if (m) m.relateException(ex); else masters.set(`${ex.uid}#${ex.recurrenceId}`, ex);
  }

  const push = (ev: any, start: any, end: any, uid: string) => {
    if (rows.length >= MAX_EVENTS) return;
    const s = start.toJSDate().getTime();
    let e = end ? end.toJSDate().getTime() : s + (start.isDate ? 86_400_000 : 3_600_000);
    if (e <= s) e = s + (start.isDate ? 86_400_000 : 3_600_000);
    if (e < from || s > to) return;
    rows.push({
      feed_id: feed.id, user_id: feed.user_id, uid: uid.slice(0, 500),
      title: clip(ev.summary, 200) ?? "(Sin título)",
      start_time: new Date(s).toISOString(), end_time: new Date(e).toISOString(),
      all_day: !!start.isDate, location: clip(ev.location, 200),
    });
  };

  for (const [key, ev] of masters) {
    if (ev.component.getFirstPropertyValue("status")?.toString().toUpperCase() === "CANCELLED") continue;
    if (!ev.startDate) continue;
    if (!ev.isRecurring()) { push(ev, ev.startDate, ev.endDate, key); continue; }
    const it = ev.iterator();
    for (let i = 0, next = it.next(); next && i < 5000 && rows.length < MAX_EVENTS; i++, next = it.next()) {
      const t = next.toJSDate().getTime();
      if (t > to) break;
      if (t < from - 7 * 86_400_000) continue;
      const d = ev.getOccurrenceDetails(next);
      push(d.item, d.startDate, d.endDate, key);
    }
  }
  return { name: clip(comp.getFirstPropertyValue("x-wr-calname"), 40), rows };
}

/** Google Calendar: fresh access token from the stored refresh token, then expanded events. */
async function googleRows(admin: any, feed: Feed): Promise<Row[]> {
  const id = Deno.env.get("GOOGLE_CLIENT_ID"), secret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!id || !secret) throw new SyncError("Google no está configurado");
  const { data: tok } = await admin.from("google_calendar_tokens").select("refresh_token").eq("user_id", feed.user_id).maybeSingle();
  if (!tok) throw new SyncError("Permiso de Google revocado");
  const tr = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: tok.refresh_token, grant_type: "refresh_token" }),
  });
  if (!tr.ok) throw new SyncError("Permiso de Google revocado");
  const { access_token } = await tr.json();

  const rows: Row[] = [];
  let page: string | undefined;
  const cal = encodeURIComponent(feed.google_calendar_id || "primary");
  do {
    const q = new URLSearchParams({
      singleEvents: "true", orderBy: "startTime", maxResults: "500",
      timeMin: new Date(Date.now() - PAST_DAYS * 86_400_000).toISOString(),
      timeMax: new Date(Date.now() + FUTURE_DAYS * 86_400_000).toISOString(),
    });
    if (page) q.set("pageToken", page);
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${cal}/events?${q}`, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!r.ok) throw new SyncError(r.status === 401 || r.status === 403 ? "Permiso de Google revocado" : "No se pudo descargar");
    const body = await r.json();
    for (const ev of body.items ?? []) {
      if (ev.status === "cancelled" || rows.length >= MAX_EVENTS) continue;
      const allDay = !!ev.start?.date;
      const s = allDay ? `${ev.start.date}T00:00:00Z` : ev.start?.dateTime;
      const e = allDay ? `${ev.end?.date ?? ev.start.date}T00:00:00Z` : ev.end?.dateTime;
      if (!s) continue;
      rows.push({
        feed_id: feed.id, user_id: feed.user_id, uid: String(ev.id).slice(0, 500),
        title: clip(ev.summary, 200) ?? "(Sin título)",
        start_time: new Date(s).toISOString(), end_time: new Date(e ?? s).toISOString(),
        all_day: allDay, location: clip(ev.location, 200),
      });
    }
    page = body.nextPageToken;
  } while (page && rows.length < MAX_EVENTS);
  return rows;
}

/** Replace the feed's events and record the outcome on the feed. Returns the event count. */
export async function syncFeed(admin: any, feed: Feed): Promise<number> {
  try {
    const rows = feed.kind === "google"
      ? await googleRows(admin, feed)
      : parseIcs(await fetchText(normalizeUrl(feed.url ?? "")), feed).rows;
    // De-duplicate on the unique key before inserting.
    const seen = new Set<string>();
    const unique = rows.filter((r) => { const k = `${r.uid}|${r.start_time}`; if (seen.has(k)) return false; seen.add(k); return true; });
    const { error: delErr } = await admin.from("calendar_events").delete().eq("feed_id", feed.id);
    if (delErr) throw delErr;
    for (let i = 0; i < unique.length; i += 500) {
      const { error } = await admin.from("calendar_events").insert(unique.slice(i, i + 500));
      if (error) throw error;
    }
    await admin.from("calendar_feeds").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", feed.id);
    return unique.length;
  } catch (e) {
    const msg = e instanceof SyncError ? e.message : "No se pudo sincronizar";
    if (!(e instanceof SyncError)) console.error("syncFeed", feed.id, e);
    await admin.from("calendar_feeds").update({ last_synced_at: new Date().toISOString(), last_error: msg }).eq("id", feed.id);
    throw e instanceof SyncError ? e : new SyncError(msg);
  }
}

export { fetchText };
