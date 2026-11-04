import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST = 100;

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

    const xp = profile.xp ?? 0;
    const freezes = profile.streak_freezes ?? 0;
    const max = profile.streak_freeze_max ?? 3;
    if (freezes >= max) return j({ error: "max_reached", max }, 409);
    if (xp < COST) return j({ error: "insufficient_xp", cost: COST }, 409);

    const newXp = xp - COST;
    const { data: updated, error: uErr } = await admin.from("profiles").update({
      xp: newXp,
      level: calculateLevel(newXp),
      streak_freezes: freezes + 1,
    }).eq("user_id", userId).select().single();
    if (uErr) return j({ error: uErr.message }, 500);

    return j({ profile: updated, cost: COST });
  } catch (e) {
    console.error("buy-streak-freeze", e);
    return j({ error: "internal_error" }, 500);
  }
});