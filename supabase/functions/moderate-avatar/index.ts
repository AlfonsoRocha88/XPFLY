import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { AI_MODELS, AI_URL, aiHeaders } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BYTES = 1_500_000;
const PHOTO_PREFIX = "avatar-photo-";

const MODERATION_PROMPT = `You review profile pictures for a productivity app used by teens and adults.
Reject the image if it contains ANY of the following, even partially, stylized, drawn or as text:
- nudity, partial nudity, underwear/lingerie focus, sexual or suggestive content, sexual gestures
- violence, gore, blood, injuries, dead bodies, self-harm
- weapons pointed at the viewer or used threateningly
- hate symbols (e.g. swastikas, KKK imagery), racist, homophobic or otherwise hateful content or gestures
- drugs or drug use
- obscene or rude gestures (e.g. middle finger) or offensive / vulgar text
- graphic, disturbing or shocking imagery
Ordinary selfies, people, pets, landscapes, art, memes without offensive content are allowed.
When unsure, reject. Always call the report tool.`;

const REASONS: Record<string, string> = {
  sexual: "La foto parece contener desnudez o contenido sexual.",
  violence: "La foto parece contener violencia o contenido sangriento.",
  hate: "La foto parece contener símbolos o contenido de odio.",
  drugs: "La foto parece mostrar drogas.",
  offensive: "La foto parece contener gestos o texto ofensivo.",
  disturbing: "La foto parece contener contenido perturbador.",
  other: "La foto no cumple las normas de la comunidad.",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated user (verify_jwt is disabled at the platform level)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authed = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const { image } = await req.json();
    const match = typeof image === "string" ? image.match(/^data:image\/(webp|jpeg|png);base64,(.+)$/) : null;
    if (!match) return json({ error: "Imagen inválida" }, 400);
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_BYTES) return json({ error: "La imagen es demasiado grande" }, 413);

    const ai = await fetch(AI_URL, {
      method: "POST",
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.fast,
        messages: [
          { role: "system", content: MODERATION_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Review this profile picture." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report",
            description: "Report whether the image is allowed as a profile picture.",
            parameters: {
              type: "object",
              properties: {
                allowed: { type: "boolean" },
                category: { type: "string", enum: ["none", ...Object.keys(REASONS)] },
              },
              required: ["allowed", "category"],
            },
          },
        }],
        tool_choice: "required", // single tool, so it must be report
      }),
    });

    if (!ai.ok) {
      console.error("AI error:", ai.status, await ai.text());
      // Fail closed: nothing is published unless it was reviewed.
      return json({ allowed: false, reason: "No pudimos revisar la foto ahora. Intenta de nuevo en un momento." }, 503);
    }

    const result = await ai.json();
    const args = result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let verdict: { allowed?: boolean; category?: string } = {};
    try { verdict = JSON.parse(args ?? "{}"); } catch { /* treated as rejected below */ }

    if (verdict.allowed !== true) {
      console.log("avatar rejected", userId, verdict.category);
      return json({ allowed: false, reason: REASONS[verdict.category ?? "other"] ?? REASONS.other });
    }

    // Approved: publish with the service role (clients can't write to the avatars bucket).
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
