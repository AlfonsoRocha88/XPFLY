import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_TROPHY_BONUS = 5;
const POINTS_PER_LEVEL = 3;

function calculateLevel(totalXp: number) {
  let lvl = 1, need = 0;
  while (true) {
    need += 50 + (lvl - 1) * 25;
    if (totalXp < need) return lvl;
    lvl++;
  }
}

const LEAGUES: { id: string; minTrophies: number }[] = [];
(function init() {
  const L = (name: string, base: [number, number, number]) => {
    LEAGUES.push({ id: `${name.toLowerCase()}-3`, minTrophies: base[0] });
    LEAGUES.push({ id: `${name.toLowerCase()}-2`, minTrophies: base[1] });
    LEAGUES.push({ id: `${name.toLowerCase()}-1`, minTrophies: base[2] });
  };
  L("Mortal", [0, 50, 100]);
  L("Guerrero", [200, 300, 400]);
  L("Caballero", [550, 700, 850]);
  L("Heroe", [1050, 1250, 1450]);
  L("Campeon", [1700, 1950, 2200]);
  L("Leyenda", [2500, 2800, 3100]);
  L("Rey", [3500, 3900, 4300]);
  L("Emperador", [4800, 5300, 5800]);
  L("Dios", [6400, 7000, 7600]);
  L("Titan", [8300, 9000, 9700]);
  L("Primordial", [10500, 11300, 12100]);
  LEAGUES.push({ id: "singularidad", minTrophies: 13000 });
})();
function currentLeague(t: number) {
  let cur = LEAGUES[0];
  for (const d of LEAGUES) {
    if (t >= d.minTrophies) cur = d;
    else break;
  }
  return cur.id;
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
    const levelsGained = Math.max(0, newLevel - oldLevel);
    const pointsGained = levelsGained * POINTS_PER_LEVEL;
    const newAvailable = (profile.stat_points_available ?? 0) + pointsGained;

    const prevFreezes = profile.streak_freezes ?? 0;
    const freezeMax = profile.streak_freeze_max ?? 3;
    const earnedFreeze = newStreak > currentStreak && newStreak % 7 === 0 && prevFreezes < freezeMax;
    const newFreezes = earnedFreeze ? prevFreezes + 1 : prevFreezes;

    const newChests = (profile.unopened_chests ?? 0) + 1;
    const newTrophies = (profile.trophies ?? 0) + DAILY_TROPHY_BONUS;

    // Streak title (Imparable @ 7)
    const unlocked: string[] = profile.unlocked_titles ?? [];
    const newlyUnlocked: string[] = [];
    if (newStreak >= 7 && !unlocked.includes("unstoppable")) newlyUnlocked.push("unstoppable");
    const allUnlocked = newlyUnlocked.length ? [...unlocked, ...newlyUnlocked] : unlocked;

    const { data: updated, error: uErr } = await admin.from("profiles").update({
      xp: newXp,
      level: newLevel,
      daily_completed_at: today,
      daily_streak: newStreak,
      stat_points_available: newAvailable,
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
      pointsGained,
      earnedFreeze,
      newlyUnlockedTitles: newlyUnlocked,
    });
  } catch (e) {
    console.error("claim-daily-bonus", e);
    return j({ error: "internal_error" }, 500);
  }
});