import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

// Ad-hoc in-memory rate limit (per instance). Not distributed; best-effort.
const WINDOW_MS = 60_000; // 1 min
const MAX_HITS = 10; // 10 lookups per IP per minute
const hits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_HITS;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Demasiados intentos, espera un momento." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.username === "string" ? body.username : "";
    const username = raw.trim().toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!username || username.length < 3 || username.length > 32 || !/^[a-z0-9_]+$/.test(username)) {
      return new Response(JSON.stringify({ error: "usuario inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6 || password.length > 256) {
      return new Response(JSON.stringify({ error: "Usuario o contraseña inválidos" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("username", username)
      .maybeSingle();

    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: "Usuario o contraseña inválidos" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: uErr } = await admin.auth.admin.getUserById(profile.user_id);
    if (uErr || !userData?.user?.email) {
      console.error("resolve-username user lookup failed", uErr);
      return new Response(JSON.stringify({ error: "Usuario o contraseña inválidos" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
      email: userData.user.email,
      password,
    });
    if (signInErr?.code === "email_not_confirmed") {
      // Password was right; the account just hasn't confirmed its email yet.
      return new Response(JSON.stringify({ error: "Confirma tu correo antes de entrar: abre el correo más reciente de XPFly.", code: "email_not_confirmed", email: userData.user.email }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (signInErr || !signInData.session) {
      return new Response(JSON.stringify({ error: "Usuario o contraseña inválidos" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      }),
      {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("resolve-username error", e);
    return new Response(JSON.stringify({ error: "No se pudo iniciar sesión" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});