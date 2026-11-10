import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Equips an unlocked avatar frame, or removes it with `frameId: null`. */
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
    const frameId: string | null = body?.frameId ?? null;
    if (frameId !== null && typeof frameId !== "string") return j({ error: "invalid_frame" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    if (frameId) {
      const { data: profile } = await admin.from("profiles").select("unlocked_frames").eq("user_id", userId).maybeSingle();
      if (!(profile?.unlocked_frames ?? []).includes(frameId)) return j({ error: "frame_not_unlocked" }, 403);
    }

    const { data: updated, error } = await admin.from("profiles").update({ equipped_frame: frameId }).eq("user_id", userId).select().single();
    if (error) return j({ error: error.message }, 500);
    return j({ profile: updated });
  } catch (e) {
    console.error("equip-frame", e);
    return j({ error: "internal_error" }, 500);
  }
});
