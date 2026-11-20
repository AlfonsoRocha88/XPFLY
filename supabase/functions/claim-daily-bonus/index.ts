import { createClient } from "npm:@supabase/supabase-js@2";
import { DAILY_TROPHY_BONUS, WEEKLY_TROPHY_BONUS, currentLeague } from "../_shared/leagues.ts";
import { addDays, localDay } from "../_shared/day.ts";
import { mutateProfile } from "../_shared/profileUpdate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


function calculateLevel(totalXp: number) {
  let lvl = 1, need = 0;
  while (true) {
    need += 50 + (lvl - 1) * 25;
    if (totalXp < need) return lvl;
    lvl++;
  }
}


function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userResp } = await userClient.auth.getUser();
    const userId = userResp?.user?.id;
    if (!userId) return j({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: profile, error } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error || !profile) return j({ error: "profile_not_found" }, 404);

    // "Today" is the user's local day, the same one their habits are checked against.
    // `>=` also covers dates saved as UTC before this change (they can look like "tomorrow").
    const today = localDay(profile.timezone);
    const yesterday = addDays(today, -1);
    if (profile.daily_completed_at && profile.daily_completed_at >= today) return j({ error: "already_claimed" }, 409);

    // The bonus requires today's habits to be done AND paid through award-xp,
    // so calling this function directly without doing them earns nothing.
    const day = localDay(profile.timezone);
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
    const habitsToday = () =>
      admin
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_daily", true)
        .is("parent_task_id", null)
        .not("tags", "cs", "{tipo:horario}")
        .or(`daily_days.eq.{},daily_days.cs.{${dow}}`);
    const due = (await habitsToday()).count ?? 0;
    const pending = (await habitsToday().neq("status", "done")).count ?? 0;
    const { count: paid } = await admin
      .from("xp_awards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("day", day);
    if (due === 0 || pending > 0 || (paid ?? 0) < due) return j({ error: "dailies_incomplete" }, 409);
    const bonusXp = 100;

    // Re-checked inside the guarded update: two overlapping claims used to both pass the
    // "already_claimed" check above and pay the XP, chest and trophies twice.
    type Claim = { leveledUp: boolean; newStreak: number; earnedFreeze: boolean; trophyDelta: number; weeklyBonus: number; newlyUnlocked: string[] };
    const outcome = await mutateProfile<Claim>(admin, userId, (p) => {
      if (p.daily_completed_at && p.daily_completed_at >= today) return { error: "already_claimed", status: 409 };
      const currentStreak = p.daily_streak ?? 0;
      const newStreak = p.daily_completed_at === yesterday ? currentStreak + 1 : 1;
      const newXp = (p.xp ?? 0) + bonusXp;
      const oldLevel = p.level ?? 1;
      const newLevel = calculateLevel(newXp);

      const prevFreezes = p.streak_freezes ?? 0;
      const freezeMax = p.streak_freeze_max ?? 3;
      const earnedFreeze = newStreak > currentStreak && newStreak % 7 === 0 && prevFreezes < freezeMax;
      const newFreezes = earnedFreeze ? prevFreezes + 1 : prevFreezes;

      // "Semana perfecta": every 7 consecutive days with all dailies done pays a weekly bonus.
      const weeklyBonus = newStreak > currentStreak && newStreak % 7 === 0 ? WEEKLY_TROPHY_BONUS : 0;
      const trophyDelta = DAILY_TROPHY_BONUS + weeklyBonus;
      const newTrophies = (p.trophies ?? 0) + trophyDelta;

      // Streak title ("Constante" @ 7 days)
      const unlocked: string[] = p.unlocked_titles ?? [];
      const newlyUnlocked: string[] = newStreak >= 7 && !unlocked.includes("unstoppable") ? ["unstoppable"] : [];

      return {
        updates: {
          xp: newXp,
          level: newLevel,
          daily_completed_at: today,
          daily_streak: newStreak,
          streak_freezes: newFreezes,
          unopened_chests: (p.unopened_chests ?? 0) + 1,
          trophies: newTrophies,
          highest_trophies: Math.max(p.highest_trophies ?? 0, newTrophies),
          current_league_id: currentLeague(newTrophies),
          unlocked_titles: [...unlocked, ...newlyUnlocked],
        },
        result: { leveledUp: newLevel > oldLevel, newStreak, earnedFreeze, trophyDelta, weeklyBonus, newlyUnlocked },
      };
    });
    if (!outcome.ok) return j({ error: outcome.error }, outcome.status);
    const updated = outcome.profile;
    const { leveledUp, newStreak, earnedFreeze, trophyDelta, weeklyBonus, newlyUnlocked } = outcome.result;

    return j({
      profile: updated,
      xpGained: bonusXp,
      leveledUp,
      streak: newStreak,
      earnedFreeze,
      trophyDelta,
      weeklyBonus,
      newlyUnlockedTitles: newlyUnlocked,
    });
  } catch (e) {
    console.error("claim-daily-bonus", e);
    return j({ error: "internal_error" }, 500);
  }
});