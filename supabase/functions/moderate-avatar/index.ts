import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BYTES = 1_500_000;
const PHOTO_PREFIX = "avatar-photo-";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated user (verify_jwt is disabled at the platform level)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authed = createClient(supabaseUrl, (Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY"))!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const { image } = await req.json().catch(() => ({}));
    const match = typeof image === "string" ? image.match(/^data:image\/(webp|jpeg|png);base64,(.+)$/) : null;
    if (!match) return json({ error: "Imagen inválida" }, 400);
    // Check the size before decoding, and treat bad base64 as a client error (atob throws).
    if (match[2].length > Math.ceil((MAX_BYTES * 4) / 3) + 4) return json({ error: "La imagen es demasiado grande" }, 413);
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    } catch {
      return json({ error: "Imagen inválida" }, 400);
    }
    if (bytes.length > MAX_BYTES) return json({ error: "La imagen es demasiado grande" }, 413);

    // Publish with the service role (clients can't write to the avatars bucket).
    // (The AI photo review was removed: it rejected ordinary photos and blocked uploads.)
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const path = `${userId}/${PHOTO_PREFIX}${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage.from("avatars").upload(path, bytes, { contentType: `image/${match[1]}` });
    if (upErr) throw upErr;

    const url = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error: profErr } = await admin.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
    if (profErr) throw profErr;

    // Keep only the new photo (drops older photos and old AI portraits).
    const { data: files } = await admin.storage.from("avatars").list(userId);
    const stale = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
    if (stale.length) await admin.storage.from("avatars").remove(stale);

    return json({ allowed: true, url });
  } catch (e) {
    console.error("moderate-avatar error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
