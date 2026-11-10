import { createClient } from "npm:@supabase/supabase-js@2";

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

function rollReward() {
  const r = Math.random();
  if (r < 0.6) {
    const amount = 10 + Math.floor(Math.random() * 21);
    return { type: "coins", amount, label: `${amount} Monedas`, icon: "coin", rarity: "common" };
  }
  if (r < 0.8) {
    const amount = 15 + Math.floor(Math.random() * 21);
    return { type: "xp", amount, label: `${amount} XP`, icon: "sparkle", rarity: "rare" };
  }
  if (r < 0.94) {
    const amount = 50 + Math.floor(Math.random() * 51);
    return { type: "coins_big", amount, label: `${amount} Monedas`, icon: "coins", rarity: "rare" };
  }
  if (r < 0.99) {
    return { type: "freeze", amount: 1, label: "Congelador de Racha", icon: "frost", rarity: "epic" };
  }
  const amount = 200 + Math.floor(Math.random() * 101);
  return { type: "coins_big", amount, label: `${amount} Monedas`, icon: "gem", rarity: "legendary" };
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

    const chests = profile.unopened_chests ?? 0;
    if (chests <= 0) return j({ error: "no_chests" }, 409);

    const reward = rollReward();
    const updates: Record<string, unknown> = { unopened_chests: chests - 1 };

    if (reward.type === "coins" || reward.type === "coins_big") {
      updates.coins = (profile.coins ?? 0) + reward.amount;
    } else if (reward.type === "xp") {
      const newXp = (profile.xp ?? 0) + reward.amount;
      updates.xp = newXp;
      updates.level = calculateLevel(newXp);
    } else if (reward.type === "freeze") {
      const max = profile.streak_freeze_max ?? 3;
      const cur = profile.streak_freezes ?? 0;
      updates.streak_freezes = Math.min(max, cur + 1);
    }

    const { data: updated, error: uErr } = await admin.from("profiles").update(updates).eq("user_id", userId).select().single();
    if (uErr) return j({ error: uErr.message }, 500);

    return j({ profile: updated, reward });
  } catch (e) {
    console.error("open-chest", e);
    return j({ error: "internal_error" }, 500);
  }
});