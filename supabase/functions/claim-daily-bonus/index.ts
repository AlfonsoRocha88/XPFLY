import { createClient } from "npm:@supabase/supabase-js@2";
import { currentLeague } from "../_shared/leagues.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_TROPHY_BONUS = 5;

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

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (profile.daily_completed_at === today) return j({ error: "already_claimed" }, 409);

    const currentStreak = profile.daily_streak ?? 0;
    const newStreak = profile.daily_completed_at === yesterday ? currentStreak + 1 : 1;
    const bonusXp = 100;
    const newXp = (profile.xp ?? 0) + bonusXp;
    const oldLevel = profile.level ?? 1;
    const newLevel = calculateLevel(newXp);

    const prevFreezes = profile.streak_freezes ?? 0;
    const freezeMax = profile.streak_freeze_max ?? 3;
    const earnedFreeze = newStreak > currentStreak && newStreak % 7 === 0 && prevFreezes < freezeMax;
    const newFreezes = earnedFreeze ? prevFreezes + 1 : prevFreezes;

    const newChests = (profile.unopened_chests ?? 0) + 1;
    const newTrophies = (profile.trophies ?? 0) + DAILY_TROPHY_BONUS;

    // Streak title ("Constante" @ 7 days)
    const unlocked: string[] = profile.unlocked_titles ?? [];
    const newlyUnlocked: string[] = [];
    if (newStreak >= 7 && !unlocked.includes("unstoppable")) newlyUnlocked.push("unstoppable");
    const allUnlocked = newlyUnlocked.length ? [...unlocked, ...newlyUnlocked] : unlocked;

    const { data: updated, error: uErr } = await admin.from("profiles").update({
      xp: newXp,
      level: newLevel,
      daily_completed_at: today,
      daily_streak: newStreak,
      streak_freezes: newFreezes,
      unopened_chests: newChests,
      trophies: newTrophies,
      highest_trophies: Math.max(profile.highest_trophies ?? 0, newTrophies),
      current_league_id: currentLeague(newTrophies),
      unlocked_titles: allUnlocked,
    }).eq("user_id", userId).select().single();
    if (uErr) return j({ error: uErr.message }, 500);

    return j({
      profile: updated,
      xpGained: bonusXp,
      leveledUp: newLevel > oldLevel,
      streak: newStreak,
      earnedFreeze,
      newlyUnlockedTitles: newlyUnlocked,
    });
  } catch (e) {
    console.error("claim-daily-bonus", e);
    return j({ error: "internal_error" }, 500);
  }
});