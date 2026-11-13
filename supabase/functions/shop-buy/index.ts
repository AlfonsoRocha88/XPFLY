import { createClient } from "npm:@supabase/supabase-js@2";
import { shopItem } from "../_shared/shop.ts";

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
    const { data: p, error } = await admin
      .from("profiles")
      .select("coins, owned_items, unlocked_frames, streak_freezes, streak_freeze_max")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !p) return j({ error: "profile_not_found" }, 404);

    const owned: string[] = p.owned_items ?? [];
    if (item.kind !== "consumable" && owned.includes(item.id)) return j({ error: "already_owned" }, 409);
    if (item.id === "freeze" && (p.streak_freezes ?? 0) >= (p.streak_freeze_max ?? 3)) {
      return j({ error: "max_reached", max: p.streak_freeze_max ?? 3 }, 409);
    }
    if ((p.coins ?? 0) < item.price) return j({ error: "insufficient", price: item.price }, 409);

    const updates: Record<string, unknown> = { coins: (p.coins ?? 0) - item.price };
    if (item.kind === "consumable") updates.streak_freezes = (p.streak_freezes ?? 0) + 1;
    else updates.owned_items = [...owned, item.id];
    if (item.kind === "frame") updates.unlocked_frames = [...new Set([...(p.unlocked_frames ?? []), item.id])];

    // Optimistic concurrency: only apply if the balance didn't change since we read it.
    const { data: updated, error: uErr } = await admin
      .from("profiles")
      .update(updates)
      .eq("user_id", userId)
      .eq("coins", p.coins ?? 0)
      .select()
      .maybeSingle();
    if (uErr) return j({ error: uErr.message }, 500);
    if (!updated) return j({ error: "retry" }, 409);

    return j({ profile: updated, item: item.id });
  } catch (e) {
    console.error("shop-buy", e);
    return j({ error: "internal_error" }, 500);
  }
});
