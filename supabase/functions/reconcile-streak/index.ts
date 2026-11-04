import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function dateOnly(d: Date) { return d.toISOString().split("T")[0]; }
function daysBetween(a: string, b: string) {
  const t1 = new Date(a + "T00:00:00Z").getTime();
  const t2 = new Date(b + "T00:00:00Z").getTime();
  return Math.round((t2 - t1) / 86400000);
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

    const streak = profile.daily_streak ?? 0;
    if (streak <= 0) return j({ profile, action: "none" });
    const today = dateOnly(new Date());
    const yesterday = dateOnly(new Date(Date.now() - 86400000));
    const last = profile.daily_completed_at as string | null;

    if (!last) {
      const { data } = await admin.from("profiles").update({ daily_streak: 0 }).eq("user_id", userId).select().single();
      return j({ profile: data, action: "reset" });
    }
    if (last === today || last === yesterday) return j({ profile, action: "none" });

    const gap = daysBetween(last, yesterday);
    const freezes = profile.streak_freezes ?? 0;
    if (freezes >= gap) {
      const { data } = await admin.from("profiles").update({
        streak_freezes: freezes - gap,
        daily_completed_at: yesterday,
      }).eq("user_id", userId).select().single();
      return j({ profile: data, action: "freeze_used", gap, remainingFreezes: freezes - gap, previousStreak: streak });
    }
    const { data } = await admin.from("profiles").update({ daily_streak: 0, daily_completed_at: null }).eq("user_id", userId).select().single();
    return j({ profile: data, action: "reset", previousStreak: streak });
  } catch (e) {
    console.error("reconcile-streak", e);
    return j({ error: "internal_error" }, 500);
  }
});