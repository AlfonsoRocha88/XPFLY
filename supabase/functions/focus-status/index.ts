// Answers the iPhone Shortcuts automation that runs when a blocked app is opened.
// GET /functions/v1/focus-status?t=<private token>
// Plain-text reply so the shortcut stays tiny: "ok" means let the app open;
// anything else is the message to show before sending the user to the Home Screen.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });

/** YYYY-MM-DD and weekday (0 = Sunday, like JS getDay) of a moment in a time zone. */
function localDay(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, dow };
}

Deno.serve(async (req) => {
  // Any failure answers "ok": a broken link must never lock someone out of their phone.
  try {
    const token = new URL(req.url).searchParams.get("t") ?? "";
    if (!UUID.test(token)) return text("ok");

    const db = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: s } = await db
      .from("focus_settings")
      .select("user_id, lock_until_dailies, focus_until, pause_until")
      .eq("token", token)
      .maybeSingle();
    if (!s) return text("ok");

    const now = new Date();
    if (s.pause_until && new Date(s.pause_until) > now) return text("ok");

    if (s.focus_until && new Date(s.focus_until) > now) {
      const mins = Math.ceil((new Date(s.focus_until).getTime() - now.getTime()) / 60_000);
      return text(`Estás en modo enfoque. Te quedan ${mins} min.`);
    }

    if (s.lock_until_dailies) {
      const { data: profile } = await db.from("profiles").select("timezone").eq("user_id", s.user_id).maybeSingle();
      let tz = profile?.timezone || "UTC";
      try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { tz = "UTC"; }
      const today = localDay(now, tz);

      const { data: dailies } = await db
        .from("tasks")
        .select("status, completed_at, daily_days, tags")
        .eq("user_id", s.user_id)
        .eq("is_daily", true)
        .is("parent_task_id", null);

      // Same rule as the app's "Tareas diarias": scheduled for today, and done today.
      const pending = (dailies ?? []).filter((t) => {
        if (t.tags?.includes("tipo:horario")) return false;
        if (t.daily_days?.length && !t.daily_days.includes(today.dow)) return false;
        const doneToday = t.status === "done" && !!t.completed_at && localDay(new Date(t.completed_at), tz).ymd === today.ymd;
        return !doneToday;
      }).length;

      if (pending > 0) {
        return text(pending === 1
          ? "Te falta 1 tarea diaria en XPFly. Termínala para desbloquear."
          : `Te faltan ${pending} tareas diarias en XPFly. Termínalas para desbloquear.`);
      }
    }
    return text("ok");
  } catch (e) {
    console.error("focus-status error", e);
    return text("ok");
  }
});
