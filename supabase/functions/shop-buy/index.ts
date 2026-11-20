import { createClient } from "npm:@supabase/supabase-js@2";
import { shopItem } from "../_shared/shop.ts";
import { mutateProfile } from "../_shared/profileUpdate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Buys one shop item with Destellos. Prices come from the server catalog, never from the client. */
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
    const item = typeof body?.itemId === "string" ? shopItem(body.itemId) : undefined;
    if (!item) return j({ error: "unknown_item" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    // Guarded on updated_at (not only coins): an orb that dropped a cosmetic or a protector
    // at the same moment changes owned_items/streak_freezes without touching coins, and the
    // old coins-only check let this purchase overwrite it.
    const outcome = await mutateProfile(admin, userId, (p) => {
      const owned: string[] = p.owned_items ?? [];
      if (item.kind !== "consumable" && owned.includes(item.id)) return { error: "already_owned", status: 409 };
      if (item.id === "freeze" && (p.streak_freezes ?? 0) >= (p.streak_freeze_max ?? 3)) {
        return { error: "max_reached", status: 409, extra: { max: p.streak_freeze_max ?? 3 } };
      }
      if ((p.coins ?? 0) < item.price) return { error: "insufficient", status: 409, extra: { price: item.price } };

      const updates: Record<string, unknown> = { coins: (p.coins ?? 0) - item.price };
      if (item.kind === "consumable") updates.streak_freezes = (p.streak_freezes ?? 0) + 1;
      else updates.owned_items = [...owned, item.id];
      if (item.kind === "frame") updates.unlocked_frames = [...new Set([...(p.unlocked_frames ?? []), item.id])];
      return { updates, result: null };
    });
    if (!outcome.ok) return j({ error: outcome.error, ...outcome.extra }, outcome.status);
    const updated = outcome.profile;

    return j({ profile: updated, item: item.id });
  } catch (e) {
    console.error("shop-buy", e);
    return j({ error: "internal_error" }, 500);
  }
});
