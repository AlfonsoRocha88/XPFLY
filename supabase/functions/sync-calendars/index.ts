// Connect a calendar by link, or sync the caller's calendars now.
// Body: { url, provider? }  → validates, creates the feed (auto name + color), imports events.
//       { feedId? }         → re-syncs that feed, or all of the caller's feeds.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type Feed, SyncError, fetchText, normalizeUrl, parseIcs, syncFeed } from "../_shared/calendarSync.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const PALETTE = ["#7c8cff", "#ff8fb1", "#5fd4a8", "#ffb35c", "#b18cff", "#5cc8ff"];
const PROVIDER_NAME: Record<string, string> = { google: "Google", iphone: "iPhone", outlook: "Outlook" };
const MAX_FEEDS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "unauthorized" }, 401);
    const { data: u } = await createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } }).auth.getUser();
    const userId = u?.user?.id;
    if (!userId) return j({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { data: feeds } = await admin.from("calendar_feeds").select("*").eq("user_id", userId);

    // ---- Connect a new calendar by link ----
    if (typeof body.url === "string" && body.url.trim()) {
      if ((feeds?.length ?? 0) >= MAX_FEEDS) return j({ error: `Máximo ${MAX_FEEDS} calendarios` }, 409);
      let url: string;
      try { url = normalizeUrl(body.url); } catch { return j({ error: "Ese no es un link válido" }, 400); }
      if (feeds?.some((f) => f.url === url)) return j({ error: "Ya conectaste ese calendario" }, 409);

      // Download and parse first, so a bad link never leaves an empty feed behind.
      let parsed;
      try { parsed = parseIcs(await fetchText(url), { id: "pending", user_id: userId }); }
      catch (e) { return j({ error: e instanceof SyncError ? e.message : "No se pudo leer el calendario" }, 400); }

      const used = new Set((feeds ?? []).map((f) => f.color));
      const color = PALETTE.find((c) => !used.has(c)) ?? PALETTE[(feeds?.length ?? 0) % PALETTE.length];
      const name = (parsed.name || PROVIDER_NAME[body.provider] || "Calendario").slice(0, 40);
      const { data: feed, error } = await admin.from("calendar_feeds")
        .insert({ user_id: userId, kind: "ical", url, name, color, last_synced_at: new Date().toISOString() })
        .select("*").single();
      if (error) return j({ error: error.code === "23505" ? "Ya conectaste ese calendario" : error.message }, 409);

      const rows = parsed.rows.map((r) => ({ ...r, feed_id: feed.id }));
      const seen = new Set<string>();
      const unique = rows.filter((r) => { const k = `${r.uid}|${r.start_time}`; if (seen.has(k)) return false; seen.add(k); return true; });
      for (let i = 0; i < unique.length; i += 500) {
        const { error: insErr } = await admin.from("calendar_events").insert(unique.slice(i, i + 500));
        if (insErr) { await admin.from("calendar_feeds").delete().eq("id", feed.id); return j({ error: "No se pudo guardar el calendario" }, 500); }
      }
      return j({ feed, count: unique.length });
    }

    // ---- Sync now ----
    const targets = (feeds ?? []).filter((f) => !body.feedId || f.id === body.feedId) as Feed[];
    const results = [];
    for (const f of targets) {
      try { results.push({ id: f.id, count: await syncFeed(admin, f) }); }
      catch (e) { results.push({ id: f.id, error: e instanceof Error ? e.message : "error" }); }
    }
    return j({ results });
  } catch (e) {
    console.error("sync-calendars", e);
    return j({ error: "internal_error" }, 500);
  }
});
