// Internal-use edge function: sends a Web Push notification to one or many users.
// Called by other edge functions and by pg_cron (with the service-role key).
// Body: { user_ids?: string[], user_id?: string, title: string, body: string, tag?: string, data?: object }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:noreply@xpfly.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: either service-role (internal/cron) or another edge function passing service key
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (auth !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const userIds: string[] = body.user_ids || (body.user_id ? [body.user_id] : []);
    const title: string = body.title || "XPFly";
    const message: string = body.body || "";
    const tag: string | undefined = body.tag;
    const data: any = body.data || {};

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (error) throw error;

    const payload = JSON.stringify({ title, body: message, tag, data });
    let sent = 0;
    const expired: string[] = [];

    await Promise.all((subs || []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) expired.push(s.id);
        console.error("push fail", code, e?.body || e?.message);
      }
    }));

    if (expired.length) {
      await supabase.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(JSON.stringify({ sent, expired: expired.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});