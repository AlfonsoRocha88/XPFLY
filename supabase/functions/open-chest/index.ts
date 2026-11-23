import { createClient } from "npm:@supabase/supabase-js@2";
import { ORB_COSMETICS, pickOrbCosmetic } from "../_shared/shop.ts";
import { mutateProfile } from "../_shared/profileUpdate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Reward = { type: "destellos" | "cosmetic" | "freeze"; amount: number; label: string; icon: string; rarity: string; itemId?: string };

/** What an orb holds: almost always Destellos, sometimes a protector, rarely a shop cosmetic. */
function rollReward(owned: string[], canFreeze: boolean): Reward {
  const r = Math.random();
  const missing = ORB_COSMETICS.filter((id) => !owned.includes(id));
  // Cosmetic: a rarity first (60/28/10/2 over what's still missing), then an item of it.
  // The reveal shows the item's own rarity.
  const item = r < 0.06 ? pickOrbCosmetic(missing, Math.random(), Math.random()) : undefined;
  if (item) {
    return { type: "cosmetic", amount: 1, itemId: item.id, label: item.name, icon: item.kind === "frame" ? "frame" : "planet", rarity: item.rarity ?? "rare" };
  }
  // Its own 5% band, so owning every cosmetic never makes protectors more common.
  if (r >= 0.06 && r < 0.11 && canFreeze) return { type: "freeze", amount: 1, label: "Protector de racha", icon: "frost", rarity: "epic" };
  if (r < 0.3) {
    const amount = 50 + Math.floor(Math.random() * 51);
    return { type: "destellos", amount, label: `${amount} destellos`, icon: "destellos", rarity: "rare" };
  }
  const amount = 15 + Math.floor(Math.random() * 21);
  return { type: "destellos", amount, label: `${amount} destellos`, icon: "destellos", rarity: "common" };
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
    // Guarded update: two taps on the last orb used to both see unopened_chests = 1 and both
    // pay a reward (and coins from a concurrent award could be overwritten).
    const outcome = await mutateProfile<Reward>(admin, userId, (profile) => {
      const chests = profile.unopened_chests ?? 0;
      if (chests <= 0) return { error: "no_chests", status: 409 };

      const owned: string[] = profile.owned_items ?? [];
      const canFreeze = (profile.streak_freezes ?? 0) < (profile.streak_freeze_max ?? 3);
      const reward = rollReward(owned, canFreeze);
      const updates: Record<string, unknown> = { unopened_chests: chests - 1 };

      if (reward.type === "destellos") {
        updates.coins = (profile.coins ?? 0) + reward.amount;
      } else if (reward.type === "freeze") {
        updates.streak_freezes = (profile.streak_freezes ?? 0) + 1;
      } else if (reward.itemId) {
        updates.owned_items = [...owned, reward.itemId];
        if (reward.itemId.startsWith("frame-")) updates.unlocked_frames = [...new Set([...(profile.unlocked_frames ?? []), reward.itemId])];
      }
      return { updates, result: reward };
    });
    if (!outcome.ok) return j({ error: outcome.error }, outcome.status);
    const updated = outcome.profile;
    const reward = outcome.result;

    return j({ profile: updated, reward });
  } catch (e) {
    console.error("open-chest", e);
    return j({ error: "internal_error" }, 500);
  }
});