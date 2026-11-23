// Called by pg_cron. Modes via ?mode=
//   - "mission-reminders" (every minute): scans tasks with reminders array whose computed reminder time
//     falls within the last minute window, fires push per task.
//   - "trophy-decay" (daily): competitive leagues lose trophies after inactivity or overdue urgent tasks.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { DECAY_FROM_FAMILY, currentLeague, leagueFamilyIndex } from "../_shared/leagues.ts";
import { mutateProfile } from "../_shared/profileUpdate.ts";
import { isServiceCaller } from "../_shared/serviceAuth.ts";
import { type Feed, syncFeed } from "../_shared/calendarSync.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function dispatch(event: string, user_id: string, payload: any = {}) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dispatch-event`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ event, user_id, payload }),
    });
    const text = await res.text();
    if (!res.ok || text.includes("error")) console.error("dispatch", event, res.status, text);
  } catch (e) {
    console.error("dispatch fail", e);
  }
}

async function missionReminders() {
  const now = Date.now();
  // pg_cron runs every minute, so each run owns (now - 60s, now]. A wider window made
  // two consecutive runs both fire the same reminder.
  const windowMs = 60 * 1000;

  // Pull tasks with non-empty reminders and start_time in the near future
  const horizon = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const past = new Date(now - 60 * 60 * 1000).toISOString();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, user_id, title, start_time, reminders, status")
    .gt("start_time", past)
    .lt("start_time", horizon)
    .neq("status", "done");
  if (error) { console.error(error); return { sent: 0 }; }

  let sent = 0;
  for (const t of tasks || []) {
    if (!t.start_time || !Array.isArray(t.reminders) || t.reminders.length === 0) continue;
    const startMs = new Date(t.start_time).getTime();
    for (const minsBefore of t.reminders) {
      const fireAt = startMs - Number(minsBefore) * 60 * 1000;
      if (fireAt <= now && fireAt > now - windowMs) {
        await dispatch("mission_reminder", t.user_id, { title: t.title, task_id: t.id });
        sent++;
      }
    }
  }
  return { sent };
}

function isCompetitive(id: string | null | undefined): boolean {
  return leagueFamilyIndex(id) >= DECAY_FROM_FAMILY;
}

const MAX_DAILY_TROPHY_LOSS = 14;
const MAX_INACTIVITY_TROPHY_LOSS_PER_DAY = 4;
const MAX_URGENT_TROPHY_LOSS_PER_DAY = 10;
const PER_URGENT_TROPHY_LOSS = 2;

/**
 * Scan competitive users (league 7+) and apply:
 *  - Inactivity decay: 1 trophy / 5h past 24h since the last completed task, max 4/day
 *  - Urgent mission decay: 2 trophies/day per unfinished urgent mission older than 24h,
 *    oldest first, max 10/day
 * Combined daily cap: 14 trophies (enforced via profiles.daily_trophy_loss / _date).
 */
async function trophyDecay() {
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, trophies, current_league_id, last_mission_completed_at, pyro_last_decay_date, daily_trophy_loss, daily_trophy_loss_date")
    .gte("trophies", 3500); // Neptuno III lower bound (DECAY_FROM_FAMILY) — pre-filter; double-check by id below
  if (error) { console.error("trophyDecay profiles err", error); return { processed: 0 }; }

  let processed = 0;
  for (const candidate of profiles || []) {
    if (!isCompetitive(candidate.current_league_id)) continue;
    if (candidate.daily_trophy_loss_date === today && Number(candidate.daily_trophy_loss ?? 0) >= MAX_DAILY_TROPHY_LOSS) continue;

    const cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const { count: urgentCount, error: urgErr } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", candidate.user_id)
      .eq("priority", "urgent")
      .neq("status", "done")
      .lt("created_at", cutoff);
    if (urgErr) { console.error("trophyDecay urgents err", urgErr); continue; }

    // Computed from a fresh read inside a guarded update, so a task completed during the run
    // (award-xp adding trophies) is not overwritten by "trophies read - loss".
    const outcome = await mutateProfile(supabase, candidate.user_id, (p) => {
      if (!isCompetitive(p.current_league_id)) return { error: "skip", status: 200 };
      const dailyLossUsed = p.daily_trophy_loss_date === today ? Number(p.daily_trophy_loss ?? 0) : 0;
      let remainingCap = Math.max(0, MAX_DAILY_TROPHY_LOSS - dailyLossUsed);
      if (remainingCap <= 0) return { error: "skip", status: 200 };

      let trophies = Number(p.trophies ?? 0);
      let loss = 0;
      let newDecayDate = p.pyro_last_decay_date as string | null;

      // 1) Inactivity decay (once per day)
      const lastTs = p.last_mission_completed_at ? new Date(p.last_mission_completed_at).getTime() : null;
      if (lastTs != null && p.pyro_last_decay_date !== today) {
        const hoursSince = (now - lastTs) / 36e5;
        if (hoursSince >= 24) {
          const ticks = Math.min(MAX_INACTIVITY_TROPHY_LOSS_PER_DAY, Math.floor((hoursSince - 24) / 5) + 1);
          const apply = Math.min(ticks, remainingCap, trophies);
          if (apply > 0) {
            trophies -= apply;
            loss += apply;
            remainingCap -= apply;
          }
          newDecayDate = today;
        }
      }

      // 2) Urgent mission decay — oldest first, capped at 10/day, 2 per mission
      let urgentLossToday = 0;
      for (let i = 0; i < (urgentCount ?? 0) && remainingCap > 0; i++) {
        if (urgentLossToday >= MAX_URGENT_TROPHY_LOSS_PER_DAY) break;
        const apply = Math.min(PER_URGENT_TROPHY_LOSS, remainingCap, trophies, MAX_URGENT_TROPHY_LOSS_PER_DAY - urgentLossToday);
        if (apply <= 0) break;
        trophies -= apply;
        loss += apply;
        remainingCap -= apply;
        urgentLossToday += apply;
      }

      if (loss <= 0) return { error: "skip", status: 200 };
      return {
        updates: {
          trophies,
          // Keep the league in step with the trophies (log_league_change records the demotion).
          current_league_id: currentLeague(trophies),
          pyro_last_decay_date: newDecayDate,
          daily_trophy_loss: dailyLossUsed + loss,
          daily_trophy_loss_date: today,
        },
        result: loss,
      };
    });
    if (outcome.ok) processed++;
    else if (outcome.error !== "skip") console.error("trophyDecay update err", candidate.user_id, outcome.error);
  }
  return { processed };
}

/** Re-sync external calendars not refreshed in the last 15 minutes (oldest first, 50 per run). */
async function calendarSync() {
  const cutoff = new Date(Date.now() - 14 * 60 * 1000).toISOString();
  const { data: feeds, error } = await supabase
    .from("calendar_feeds")
    .select("*")
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(50);
  if (error) { console.error("calendarSync", error); return { synced: 0 }; }
  let synced = 0, failed = 0;
  for (const f of feeds ?? []) {
    try { await syncFeed(supabase, f as Feed); synced++; } catch { failed++; }
  }
  return { synced, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "mission-reminders";

  // pg_cron calls with the secret key stored in Vault (xpfly_service_key). It may be a different
  // valid secret than this function's SUPABASE_SERVICE_ROLE_KEY, so verify it rather than compare.
  if (!(await isServiceCaller(req))) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    let result: any;
    if (mode === "trophy-decay") result = await trophyDecay();
    else if (mode === "calendar-sync") result = await calendarSync();
    else result = await missionReminders();
    return new Response(JSON.stringify({ mode, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(mode, e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: corsHeaders });
  }
});