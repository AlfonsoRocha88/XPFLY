import { createClient } from "npm:@supabase/supabase-js@2";
import { mutateProfile } from "../_shared/profileUpdate.ts";
import { addDays, localDay } from "../_shared/day.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Guarded update: this runs on app start, and a claim-daily-bonus landing between the read
    // and the write used to have its new streak overwritten with 0.
    type Info = { action: string; gap?: number; remainingFreezes?: number; previousStreak?: number };
    const NONE = "none";
    const outcome = await mutateProfile<Info>(admin, userId, (profile) => {
      // The user's local day, like the habits and claim-daily-bonus. `>=` keeps dates saved as
      // UTC before this change (which can look like "tomorrow") from breaking a streak.
      const today = localDay(profile.timezone);
      const yesterday = addDays(today, -1);
      const streak = profile.daily_streak ?? 0;
      const last = profile.daily_completed_at as string | null;
      if (streak <= 0 || (last && last >= yesterday)) return { error: NONE, status: 200 };
      if (!last) return { updates: { daily_streak: 0 }, result: { action: "reset" } };

      const gap = daysBetween(last, yesterday);
      const freezes = profile.streak_freezes ?? 0;
      if (freezes >= gap) {
        return {
          updates: { streak_freezes: freezes - gap, daily_completed_at: yesterday },
          result: { action: "freeze_used", gap, remainingFreezes: freezes - gap, previousStreak: streak },
        };
      }
      return { updates: { daily_streak: 0, daily_completed_at: null }, result: { action: "reset", previousStreak: streak } };
    });

    if (!outcome.ok) {
      if (outcome.error !== NONE) return j({ error: outcome.error }, outcome.status);
      const { data: profile } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      return j({ profile, action: "none" });
    }
    return j({ profile: outcome.profile, ...outcome.result });
  } catch (e) {
    console.error("reconcile-streak", e);
    return j({ error: "internal_error" }, 500);
  }
});