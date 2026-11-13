// Called by Postgres triggers (via pg_net), cron jobs, and edge functions to push notifications.
// Body: { event: string, user_id?: string, payload?: any, row_id?: string }
// For trigger-driven events (friend_request, clan_join_request, league_promotion), this function
// re-fetches the source row via service-role and validates before sending — so it can be safely
// called with the public anon key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

async function send(targetUserId: string, title: string, body: string, tag: string, data: any = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: targetUserId, title, body, tag, data }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { event, user_id, payload = {}, row_id } = await req.json();

    // Events that accept a free-form user_id (and possibly free-form text) must
    // only be callable by trusted internal callers (cron, edge functions) using
    // the service-role key. Trigger-driven events below re-fetch & revalidate
    // the source row, so they can stay callable with the anon key from pg_net.
    const PRIVILEGED_EVENTS = new Set([
      "mission_reminder",
    ]);
    if (PRIVILEGED_EVENTS.has(event)) {
      const auth = req.headers.get("authorization") || "";
      if (auth !== `Bearer ${SERVICE_KEY}`) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    switch (event) {
      case "friend_request": {
        // Re-fetch friendship row to validate
        if (!row_id) return new Response(JSON.stringify({ error: "row_id required" }), { status: 200, headers: corsHeaders });
        const { data: f } = await supabase.from("friendships").select("user_id, friend_id, status").eq("id", row_id).maybeSingle();
        if (!f || f.status !== "pending") return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const fromId = f.user_id;
        const toId = f.friend_id;
        let username = "Alguien";
        const { data: p } = await supabase.from("profiles").select("username, display_name").eq("user_id", fromId).maybeSingle();
        username = p?.username || p?.display_name || "Alguien";
        await send(toId, "Constela", `${username} te envió una solicitud de amistad`, "friend-request", { url: "/" });
        break;
      }
      case "clan_join_request": {
        if (!row_id) return new Response(JSON.stringify({ error: "row_id required" }), { status: 200, headers: corsHeaders });
        const { data: r } = await supabase.from("clan_join_requests").select("clan_id, status").eq("id", row_id).maybeSingle();
        if (!r || r.status !== "pending") return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: c } = await supabase.from("clans").select("leader_id").eq("id", r.clan_id).maybeSingle();
        if (c?.leader_id) await send(c.leader_id, "Constela", "Alguien quiere unirse a tu clan", "clan-join", { url: "/" });
        break;
      }
      case "league_promotion": {
        if (!row_id) return new Response(JSON.stringify({ error: "row_id required" }), { status: 200, headers: corsHeaders });
        const { data: lc } = await supabase.from("league_changes").select("user_id, direction").eq("id", row_id).maybeSingle();
        if (!lc || lc.direction !== "promotion") return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        await send(lc.user_id, "Constela", "Subiste de liga. Buen trabajo.", "league-up", { url: "/leagues" });
        break;
      }
      case "mission_reminder": {
        if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 200, headers: corsHeaders });
        await send(user_id, "Constela", `Recordatorio: ${payload.title || "tienes una tarea pendiente"}`, `mission-${payload.task_id || ""}`, { url: "/" });
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "unknown_event" }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 200, headers: corsHeaders });
  }
});