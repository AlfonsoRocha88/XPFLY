import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const body = await req.json().catch(() => ({}));
    const titleId: string | null = body?.titleId ?? null;
    if (titleId !== null && typeof titleId !== "string") return j({ error: "invalid_title" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    if (titleId) {
      const { data: profile } = await admin.from("profiles").select("unlocked_titles").eq("user_id", userId).maybeSingle();
      const unlocked: string[] = profile?.unlocked_titles ?? [];
      if (!unlocked.includes(titleId)) return j({ error: "title_not_unlocked" }, 403);
    }

    const { data: updated, error: uErr } = await admin.from("profiles").update({ equipped_title: titleId }).eq("user_id", userId).select().single();
    if (uErr) return j({ error: uErr.message }, 500);
    return j({ profile: updated });
  } catch (e) {
    console.error("equip-title", e);
    return j({ error: "internal_error" }, 500);
  }
});