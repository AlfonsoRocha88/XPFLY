import { createClient } from "npm:@supabase/supabase-js@2";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, CONSTELLATIONS, TIER_COINS, frameFor, tierReached, type Metrics } from "../_shared/achievements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/**
 * Claims every achievement tier the user has reached but not claimed yet (or only those of
 * `achievementId`). Progress is recomputed here from server data, so the client can't fake it.
 * The unique (user, achievement, tier) row makes double claims pay nothing.
 */
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

    const body = await req.json().catch(() => ({}));
    const only: string | null = typeof body?.achievementId === "string" ? body.achievementId : null;
    if (only && !ACHIEVEMENT_BY_ID[only]) return j({ error: "unknown_achievement" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: metrics, error: mErr } = await admin.rpc("achievement_metrics", { p_user: userId });
    if (mErr || !metrics) return j({ error: "metrics_failed" }, 500);

    const { data: existing } = await admin.from("achievement_unlocks").select("achievement_id, tier").eq("user_id", userId);
    const have = new Set((existing ?? []).map((r) => `${r.achievement_id}:${r.tier}`));

    const rows: { user_id: string; achievement_id: string; tier: number; coins: number }[] = [];
    for (const def of ACHIEVEMENTS) {
      if (only && def.id !== only) continue;
      const reached = tierReached(def, metrics as Metrics);
      for (let tier = 1; tier <= reached; tier++) {
        if (!have.has(`${def.id}:${tier}`)) rows.push({ user_id: userId, achievement_id: def.id, tier, coins: TIER_COINS[tier - 1] });
      }
    }
    if (!rows.length) return j({ claimed: [], coins: 0, frames: [] });

    // ignoreDuplicates: a concurrent claim of the same tier inserts nothing and pays nothing.
    const { data: inserted, error: iErr } = await admin
      .from("achievement_unlocks")
      .upsert(rows, { onConflict: "user_id,achievement_id,tier", ignoreDuplicates: true })
      .select("achievement_id, tier, coins");
    if (iErr) return j({ error: iErr.message }, 500);
    const claimed = inserted ?? [];
    const coins = claimed.reduce((s, r) => s + r.coins, 0);

    // A constellation completed in gold unlocks its avatar frame.
    const goldNow = new Set([
      ...(existing ?? []).filter((r) => r.tier === 3).map((r) => r.achievement_id),
      ...claimed.filter((r) => r.tier === 3).map((r) => r.achievement_id),
    ]);
    const { data: profile } = await admin.from("profiles").select("coins, unlocked_frames").eq("user_id", userId).single();
    const frames = new Set<string>(profile?.unlocked_frames ?? []);
    const newFrames = CONSTELLATIONS.map((c) => c.id)
      .filter((c) => ACHIEVEMENTS.filter((a) => a.constellation === c).every((a) => goldNow.has(a.id)))
      .map(frameFor)
      .filter((f) => !frames.has(f));
    newFrames.forEach((f) => frames.add(f));

    const { data: updated, error: uErr } = await admin
      .from("profiles")
      .update({ coins: (profile?.coins ?? 0) + coins, unlocked_frames: [...frames] })
      .eq("user_id", userId)
      .select()
      .single();
    if (uErr) return j({ error: uErr.message }, 500);

    return j({ claimed, coins, frames: newFrames, profile: updated });
  } catch (e) {
    console.error("claim-achievement", e);
    return j({ error: "internal_error" }, 500);
  }
});
