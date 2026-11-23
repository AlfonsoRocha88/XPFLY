// Google sends the user back here after consent. Verifies the signed state, stores the refresh
// token (service role only), creates the "Google" calendar feed, imports it, and returns to the app.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type Feed, syncFeed } from "../_shared/calendarSync.ts";

const b64urlDecode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function verify(state: string, secret: string): Promise<{ u: string; r: string; e: number } | null> {
  const [data, sig] = state.split(".");
  if (!data || !sig) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), new TextEncoder().encode(data));
  if (!ok) return null;
  const p = JSON.parse(new TextDecoder().decode(b64urlDecode(data)));
  return p.e > Date.now() ? p : null;
}

const back = (origin: string, status: string) => Response.redirect(`${origin}/?calendar=${status}`, 302);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const secret = Deno.env.get("GOOGLE_STATE_SECRET");
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!secret || !clientId || !clientSecret) return new Response("Google Calendar no está configurado", { status: 503 });

  const state = await verify(url.searchParams.get("state") ?? "", secret).catch(() => null);
  if (!state) return new Response("Enlace vencido. Vuelve a Constela e inténtalo otra vez.", { status: 400 });
  const code = url.searchParams.get("code");
  if (!code) return back(state.r, "google-cancel");

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const tr = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code",
        redirect_uri: `${SUPABASE_URL}/functions/v1/google-calendar-callback`,
      }),
    });
    if (!tr.ok) { console.error("google token", await tr.text()); return back(state.r, "google-error"); }
    const tok = await tr.json();
    if (!tok.refresh_token) return back(state.r, "google-error");

    let email: string | null = null;
    try {
      const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(String(tok.id_token).split(".")[1])));
      email = payload.email ?? null;
    } catch { /* email is optional */ }

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("google_calendar_tokens").upsert({ user_id: state.u, refresh_token: tok.refresh_token, email });

    let { data: feed } = await admin.from("calendar_feeds").select("*").eq("user_id", state.u).eq("kind", "google").maybeSingle();
    if (!feed) {
      const { data: created } = await admin.from("calendar_feeds")
        .insert({ user_id: state.u, kind: "google", google_calendar_id: "primary", name: "Google", color: "#5cc8ff" })
        .select("*").single();
      feed = created;
    }
    if (feed) await syncFeed(admin, feed as Feed).catch(() => undefined);
    return back(state.r, "google-ok");
  } catch (e) {
    console.error("google-calendar-callback", e);
    return back(state.r, "google-error");
  }
});
