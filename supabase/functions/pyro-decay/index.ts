import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type DecayState = "ok" | "alert" | "dying" | "critical";

function xpForLevel(level: number): number {
  // Mirror of public.xp_for_level: sum_{i=1..level-1} (50 + (i-1)*25)
  let total = 0;
  for (let i = 1; i < level; i++) total += 50 + (i - 1) * 25;
  return total;
}

// --- League helpers (mirror src/lib/leagues.ts) ---
// Families ordered 1..12. Leagues 7+ ("Rey" and above) are competitive.
const LEAGUE_FAMILIES = [
  "mortal","guerrero","caballero","heroe","campeon","leyenda",
  "rey","emperador","dios","titan","primordial","singularidad",
] as const;
function leagueFamilyIndex(id: string | null | undefined): number {
  if (!id) return 0;
  const fam = id.replace(/-\d$/, "");
  const i = LEAGUE_FAMILIES.indexOf(fam as any);
  return i < 0 ? 0 : i + 1; // 1-based
}
function isCompetitive(id: string | null | undefined): boolean {
  return leagueFamilyIndex(id) >= 7;
}

const MAX_DAILY_TROPHY_LOSS = 14;
const MAX_PYRO_TROPHY_LOSS_PER_DAY = 4;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Auth: read user from caller's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsResp, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr) console.error("pyro-decay getClaims failed", claimsErr);
    const userId = claimsResp?.claims?.sub as string | undefined;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select(
        "user_id, xp, level, trophies, last_mission_completed_at, pyro_last_decay_date, current_league_id, daily_trophy_loss, daily_trophy_loss_date",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr || !profile) {
      if (pErr) console.error("pyro-decay profile lookup failed", pErr);
      return new Response(
        JSON.stringify({ state: "ok", hoursSinceLastMission: null, xpLost: 0, trophiesLost: 0, decayApplied: false, profileMissing: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const lastTs = profile.last_mission_completed_at
      ? new Date(profile.last_mission_completed_at).getTime()
      : null;
    const now = Date.now();
    const hoursSince = lastTs == null ? Infinity : (now - lastTs) / 36e5;

    let state: DecayState = "ok";
    if (lastTs != null) {
      if (hoursSince >= 72) state = "critical";
      else if (hoursSince >= 48) state = "dying";
      else if (hoursSince >= 24) state = "alert";
    } else {
      // Never completed a mission yet → treat as "ok"; decay only kicks in once they've started.
      state = "ok";
    }

    let xpLost = 0;
    let trophiesLost = 0;
    let decayApplied = false;
    const today = new Date().toISOString().slice(0, 10);

    // --- Pyro trophy decay (competitive leagues only, every 5h past 24h, max 4/day) ---
    const competitive = isCompetitive(profile.current_league_id);
    // Reset daily loss counter at midnight
    const dailyLossDate = profile.daily_trophy_loss_date as string | null;
    const dailyLossUsed = dailyLossDate === today ? Number(profile.daily_trophy_loss ?? 0) : 0;

    let newTrophies = Number(profile.trophies ?? 0);
    let newDailyLoss = dailyLossUsed;
    let newPyroDecayDate = profile.pyro_last_decay_date as string | null;

    if (competitive && lastTs != null && hoursSince >= 24) {
      // How many 5h ticks past the 24h mark — capped at 4/day from pyro decay
      const ticksSinceStart = Math.floor((hoursSince - 24) / 5) + 1;
      const ticksToday = Math.min(MAX_PYRO_TROPHY_LOSS_PER_DAY, ticksSinceStart);
      // Apply at most one batch per day (date-gated)
      if (profile.pyro_last_decay_date !== today) {
        const remainingDailyCap = Math.max(0, MAX_DAILY_TROPHY_LOSS - dailyLossUsed);
        const loss = Math.min(ticksToday, remainingDailyCap, newTrophies);
        if (loss > 0) {
          newTrophies -= loss;
          trophiesLost += loss;
          newDailyLoss += loss;
        }
        newPyroDecayDate = today;
      }
    }

    // XP decay (unchanged behavior): still tied to dying/critical state, once per day.
    let newXp = Number(profile.xp ?? 0);
    if ((state === "dying" || state === "critical") && profile.pyro_last_decay_date !== today) {
      const lvl = Number(profile.level ?? 1);
      const totalXp = Number(profile.xp ?? 0);
      const floorXp = xpForLevel(lvl);
      const progress = Math.max(0, totalXp - floorXp);
      const xpDecay = Math.floor(progress * 0.02);
      newXp = Math.max(floorXp, totalXp - xpDecay);
      xpLost = totalXp - newXp;
      newPyroDecayDate = today;
    }

    if (xpLost > 0 || trophiesLost > 0) {
      const { error: uErr } = await admin
        .from("profiles")
        .update({
          xp: newXp,
          trophies: newTrophies,
          pyro_last_decay_date: newPyroDecayDate,
          daily_trophy_loss: newDailyLoss,
          daily_trophy_loss_date: today,
        })
        .eq("user_id", userId);
      if (uErr) {
        console.error("pyro-decay profile update failed", uErr);
        return new Response(JSON.stringify({ error: "update_failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      decayApplied = true;

      // Fire push notification once per day on entering dying/critical state
      if (state === "dying" || state === "critical") {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/dispatch-event`, {
            method: "POST",
            headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ event: "pyro_warning_48h", user_id: userId }),
          });
        } catch (e) { console.error("pyro-decay push dispatch failed", e); }
      }
    }

    return new Response(
      JSON.stringify({
        state,
        hoursSinceLastMission: lastTs == null ? null : Math.floor(hoursSince),
        xpLost,
        trophiesLost,
        decayApplied,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("pyro-decay error:", e);
    return new Response(JSON.stringify({ error: "decay_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});