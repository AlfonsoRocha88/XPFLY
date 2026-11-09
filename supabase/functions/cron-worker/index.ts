// Called by pg_cron. Modes via ?mode=
//   - "mission-reminders" (every minute): scans tasks with reminders array whose computed reminder time
//     falls within the last minute window, fires push per task.
//   - "trophy-decay" (daily): competitive leagues lose trophies after inactivity or overdue urgent tasks.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { leagueFamilyIndex } from "../_shared/leagues.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function dispatch(event: string, user_id: string, payload: any = {}) {
  await fetch(`${SUPABASE_URL}/functions/v1/dispatch-event`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ event, user_id, payload }),
  }).catch((e) => console.error("dispatch fail", e));
}

async function missionReminders() {
  const now = Date.now();
  const windowMs = 90 * 1000; // 1.5 min window for safety

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
  return leagueFamilyIndex(id) >= 7;
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
    .gte("trophies", 3500); // Rey III lower bound — pre-filter; double-check by id below
  if (error) { console.error("trophyDecay profiles err", error); return { processed: 0 }; }

  let processed = 0;
  for (const p of profiles || []) {
    if (!isCompetitive(p.current_league_id)) continue;

    const dailyLossUsed = p.daily_trophy_loss_date === today ? Number(p.daily_trophy_loss ?? 0) : 0;
    let remainingCap = Math.max(0, MAX_DAILY_TROPHY_LOSS - dailyLossUsed);
    if (remainingCap <= 0) continue;

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
    if (remainingCap > 0) {
      const cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const { data: urgents } = await supabase
        .from("tasks")
        .select("id, created_at")
        .eq("user_id", p.user_id)
        .eq("priority", "urgent")
        .neq("status", "done")
        .lt("created_at", cutoff)
        .order("created_at", { ascending: true });

      let urgentLossToday = 0;
      for (const _t of urgents || []) {
        if (urgentLossToday >= MAX_URGENT_TROPHY_LOSS_PER_DAY) break;
        const apply = Math.min(PER_URGENT_TROPHY_LOSS, remainingCap, trophies, MAX_URGENT_TROPHY_LOSS_PER_DAY - urgentLossToday);
        if (apply <= 0) break;
        trophies -= apply;
        loss += apply;
        remainingCap -= apply;
        urgentLossToday += apply;
      }
    }

    if (loss > 0) {
      const { error: uErr } = await supabase
        .from("profiles")
        .update({
          trophies,
          pyro_last_decay_date: newDecayDate,
          daily_trophy_loss: dailyLossUsed + loss,
          daily_trophy_loss_date: today,
        })
        .eq("user_id", p.user_id);
      if (uErr) console.error("trophyDecay update err", uErr);
      else processed++;
    }
  }
  return { processed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "mission-reminders";

  // Allow either service-role auth or apikey header from pg_cron
  const auth = req.headers.get("authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  const ok = auth === `Bearer ${SERVICE_KEY}` || apikey === SERVICE_KEY;
  if (!ok) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

  try {
    let result: any;
    if (mode === "trophy-decay") result = await trophyDecay();
    else result = await missionReminders();
    return new Response(JSON.stringify({ mode, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 200, headers: corsHeaders });
  }
});