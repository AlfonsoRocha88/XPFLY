// Starts "Conectar Google Calendar": returns Google's consent URL for the signed-in user.
// State = HMAC-signed { u: user id, r: app origin, e: expiry } so the callback knows who to save for.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function sign(payload: object, secret: string) {
  const data = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `${data}.${b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)))}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const stateSecret = Deno.env.get("GOOGLE_STATE_SECRET");
  if (!clientId || !Deno.env.get("GOOGLE_CLIENT_SECRET") || !stateSecret) return j({ error: "not_configured" }, 503);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return j({ error: "unauthorized" }, 401);
  const { data: u } = await createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } }).auth.getUser();
  if (!u?.user) return j({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  let origin: string;
  try {
    const o = new URL(String(body.returnTo || ""));
    if (o.protocol !== "https:" && o.hostname !== "localhost") throw new Error();
    origin = o.origin;
  } catch { return j({ error: "invalid_return" }, 400); }

  const state = await sign({ u: u.user.id, r: origin, e: Date.now() + 10 * 60_000 }, stateSecret);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${SUPABASE_URL}/functions/v1/google-calendar-callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly email",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return j({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});
