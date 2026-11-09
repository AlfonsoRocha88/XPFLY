import { createClient } from "npm:@supabase/supabase-js@2";
import { currentLeague } from "../_shared/leagues.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const XP_REWARDS = { low: 20, medium: 35, high: 50, urgent: 75 } as const;
type Priority = keyof typeof XP_REWARDS;

const DAILY_TROPHY_BONUS = 5;

function calculateLevel(totalXp: number) {
  let lvl = 1, need = 0;
  while (true) {
    need += 50 + (lvl - 1) * 25;
    if (totalXp < need) return lvl;
    lvl++;
  }
}

// --- Titles (mirror of src/lib/titles.ts) ---
const TITLES = [
  { id: "early_bird", applies: "morning", progressKey: "morning_missions", goal: 10, bonus: 1.10 },
  { id: "night_owl", applies: "night", progressKey: "night_missions", goal: 10, bonus: 1.10 },
  { id: "unstoppable", applies: "always", progressKey: "streak", goal: 7, bonus: 1.05 },
  { id: "speedster", applies: "urgent", progressKey: "urgent_missions", goal: 20, bonus: 1.15 },
] as const;

function classify(date: Date, priority: Priority) {
  const h = date.getHours();
  return { morning: h < 12, night: h >= 20, urgent: priority === "urgent" };
}

function getXpBonus(equipped: string | null, ctx: { morning: boolean; night: boolean; urgent: boolean }) {
  const t = TITLES.find((x) => x.id === equipped);
  if (!t) return 1;
  if (t.applies === "always") return t.bonus;
  if (t.applies === "morning" && ctx.morning) return t.bonus;
  if (t.applies === "night" && ctx.night) return t.bonus;
  if (t.applies === "urgent" && ctx.urgent) return t.bonus;
  return 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResp } = await userClient.auth.getUser();
    const userId = userResp?.user?.id;
    if (!userId) return j({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body?.task_id === "string" ? body.task_id : null;
    if (!taskId) return j({ error: "task_id_required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Fetch the task and verify ownership + state server-side.
    const { data: task, error: tErr } = await admin
      .from("tasks")
      .select("id, user_id, status, priority, is_daily, xp_awarded, created_at")
      .eq("id", taskId)
      .maybeSingle();
    if (tErr || !task) return j({ error: "task_not_found" }, 404);
    if (task.user_id !== userId) return j({ error: "forbidden" }, 403);
    if (task.status !== "done") return j({ error: "task_not_done" }, 409);
    if (task.xp_awarded === true) return j({ error: "already_awarded" }, 409);
    if (!task.is_daily) {
      const ageMs = Date.now() - new Date(task.created_at).getTime();
      if (ageMs < 60 * 60 * 1000) return j({ error: "task_too_new" }, 409);
    }

    // Atomically claim the XP award for this task. If another concurrent
    // request beat us, the conditional update returns 0 rows.
    const { data: claimed, error: cErr } = await admin
      .from("tasks")
      .update({ xp_awarded: true })
      .eq("id", taskId)
      .eq("user_id", userId)
      .eq("xp_awarded", false)
      .select("id")
      .maybeSingle();
    if (cErr) return j({ error: cErr.message }, 500);
    if (!claimed) return j({ error: "already_awarded" }, 409);

    // Priority is taken from the task itself, never from client input.
    const priority: Priority = (task.is_daily ? "urgent" : task.priority) as Priority;
    if (!(priority in XP_REWARDS)) return j({ error: "invalid_priority" }, 400);

    // Server-side verification of party membership — never trust client flag
    const { data: partyRow } = await admin
      .from("party_members")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();
    const partyBonus = !!partyRow;
    const { data: profile, error } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !profile) return j({ error: "profile_not_found" }, 404);

    const ctx = classify(new Date(), priority);
    const equipped = profile.equipped_title as string | null;
    const titleMult = getXpBonus(equipped, ctx);
    let reward = XP_REWARDS[priority];
    if (partyBonus) reward = Math.floor(reward * 1.1);
    reward = Math.floor(reward * titleMult);

    // --- Streak bonus (added ON TOP of base/title/party reward) ---
    // Day 1–6 → +0.3, 7–13 → +0.6, 14–29 → +0.9, 30+ → +1.2
    const streakDays = Number(profile.daily_streak ?? 0);
    let streakMult = 0;
    if (streakDays >= 30) streakMult = 1.2;
    else if (streakDays >= 14) streakMult = 0.9;
    else if (streakDays >= 7) streakMult = 0.6;
    else if (streakDays >= 1) streakMult = 0.3;
    const streakBonus = Math.ceil(reward * streakMult);
    reward = reward + streakBonus;

    const currentXp = profile.xp ?? 0;
    const newXp = currentXp + reward;
    const oldLevel = profile.level ?? 1;
    const newLevel = calculateLevel(newXp);
    const levelsGained = Math.max(0, newLevel - oldLevel);

    // Title progress
    const progress = profile.title_progress ?? { morning_missions: 0, night_missions: 0, urgent_missions: 0 };
    const nextProgress = {
      morning_missions: progress.morning_missions + (ctx.morning ? 1 : 0),
      night_missions: progress.night_missions + (ctx.night ? 1 : 0),
      urgent_missions: progress.urgent_missions + (ctx.urgent ? 1 : 0),
    };
    const unlocked: string[] = profile.unlocked_titles ?? [];
    const streak = profile.daily_streak ?? 0;
    const newlyUnlocked: string[] = [];
    for (const t of TITLES) {
      if (unlocked.includes(t.id)) continue;
      const value = t.progressKey === "streak" ? streak : (nextProgress as any)[t.progressKey];
      if (value >= t.goal) newlyUnlocked.push(t.id);
    }
    const allUnlocked = [...unlocked, ...newlyUnlocked];

    // Trophies: 1 trophy per 2 missions_completed (spec).
    const prevMissions = profile.missions_completed_total ?? 0;
    const newMissions = prevMissions + 1;
    const bonusTrophy = newMissions % 2 === 0;
    const trophyDelta = bonusTrophy ? 1 : 0;
    const newTrophies = (profile.trophies ?? 0) + trophyDelta;

    const { data: updated, error: uErr } = await admin
      .from("profiles")
      .update({
        xp: newXp,
        level: newLevel,
        title_progress: nextProgress,
        unlocked_titles: allUnlocked,
        trophies: newTrophies,
        highest_trophies: Math.max(profile.highest_trophies ?? 0, newTrophies),
        current_league_id: currentLeague(newTrophies),
        missions_completed_total: newMissions,
        last_mission_completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();
    if (uErr) return j({ error: uErr.message }, 500);

    return j({
      profile: updated,
      xpGained: reward,
      leveledUp: newLevel > oldLevel,
      bonusTrophyAwarded: bonusTrophy,
      missionsCompletedTotal: newMissions,
      newlyUnlockedTitles: newlyUnlocked,
    });
  } catch (e) {
    console.error("award-xp", e);
    return j({ error: "internal_error" }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}