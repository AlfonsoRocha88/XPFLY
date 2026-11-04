import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const HAIR_STYLES = ["short", "long", "curly", "wavy", "buzz", "ponytail", "messy", "bald", "spiky", "braided"];
const EYE_STYLES = ["normal", "sharp", "round", "narrow", "wide", "almond"];
const FACE_STYLES = ["round", "oval", "square", "heart", "long", "angular"];

function safeEnum(value: unknown, allowed: string[], fallback: string): string {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}
function safeHex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_RE.test(value) ? value : fallback;
}
function safeText(value: unknown, maxLen = 40): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^a-zA-Z0-9 _'-]/g, "").trim().slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : null;
}

function buildPrompt(cfg: any, opts: { className?: string | null; title?: string | null; gender?: string | null }) {
  const skin = safeHex(cfg?.skinColor, "#f5d0a9");
  const hair = safeHex(cfg?.hairColor, "#2b1810");
  const eyes = safeHex(cfg?.eyeColor, "#3b82f6");
  const hairStyle = safeEnum(cfg?.hairStyle, HAIR_STYLES, "short");
  const eyeStyle = safeEnum(cfg?.eyeStyle, EYE_STYLES, "normal");
  const face = safeEnum(cfg?.faceStyle, FACE_STYLES, "round");
  const outfit = typeof cfg?.outfit === "string" ? cfg.outfit : "hunter";

  const outfitDesc: Record<string, string> = {
    hunter: "dark tactical hunter coat with cyan glowing trims, Solo Leveling style",
    casual: "casual modern hoodie and pants, urban look",
    armor: "dark steel plate armor with golden trims",
    mage: "dark purple mage robe with arcane runes glowing softly",
    mage_apprentice: "deep indigo mage robe with violet runes",
    mage_master: "ornate archmage robe with brilliant violet glow",
    warrior_apprentice: "leather warrior gear with orange accents",
    warrior_master: "blackened warrior plate with fiery orange trims",
    rogue_apprentice: "dark green rogue cloak with hood",
    rogue_master: "shadowy assassin garb with emerald glow",
    tank_apprentice: "heavy yellow-trimmed armor",
    tank_master: "imposing golden plate armor",
    battlemage_apprentice: "purple robe with sword harness",
    battlemage_master: "dark battlemage armor blending steel and arcane runes",
    spellblade_apprentice: "blue robe with curved blade",
    spellblade_master: "elegant blue and violet spellblade attire",
    paladin_apprentice: "white and gold paladin cloth",
    paladin_master: "radiant golden paladin armor",
    ranger_apprentice: "leaf-green ranger cloak",
    ranger_master: "elite ranger garb with bow",
    monk_apprentice: "loose cyan monk robes",
    monk_master: "flowing cyan monk attire with glowing wraps",
  };

  const safeClassName = safeText(opts.className, 30);
  const safeTitle = safeText(opts.title, 40);
  const className = safeClassName ? `, ${safeClassName} class` : "";
  const titleLine = safeTitle ? `, mood reflects the title "${safeTitle}"` : "";

  const genderMap: Record<string, string> = {
    male: "STRICTLY MALE character, masculine features, masculine jawline, masculine body shape — must be a man, never a woman or androgynous",
    female: "STRICTLY FEMALE character, feminine features, feminine face, feminine body shape — must be a woman, never a man or androgynous",
    nonbinary: "androgynous gender-neutral character, ambiguous features that read neither strictly male nor strictly female",
    prefer_not: "androgynous gender-neutral character, ambiguous features that read neither strictly male nor strictly female",
  };
  const genderKey = typeof opts.gender === "string" && opts.gender in genderMap ? opts.gender : "prefer_not";
  const genderLine = genderMap[genderKey] ?? genderMap.prefer_not;

  return `Detailed digital painted character portrait, anime / Solo Leveling inspired, dark moody background with subtle blue magical glow. Bust shot from chest up, three-quarter view, dramatic rim lighting. The portrait MUST fill the entire square frame edge-to-edge with no empty background borders, no letterboxing, no white space.

Character: ${genderLine}. ${face}-faced young hero${className}${titleLine}.
Skin tone close to ${skin}. Hair: ${hairStyle} hairstyle, color close to ${hair}, with painted highlights and individual strands. Eyes: ${eyeStyle} shape, vivid ${eyes} irises with subtle inner glow.
Outfit: ${outfitDesc[outfit] ?? outfitDesc.hunter}.

Style: hand-painted illustration, soft cel-shading mixed with painterly textures, clean ink line accents, NOT geometric, NOT made of cubes/cylinders/blocks, NOT low-poly, NOT 3D render, NOT pixel art. No text, no watermark, no logos. Centered composition, fills the entire square 1:1 frame with the character and cohesive dark backdrop reaching every edge. CRITICAL: respect the gender constraint above exactly — do not change it.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: corsHeaders });
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const user = userData.user;

    const { config, className, title, gender } = await req.json();
    if (!config) {
      return new Response(JSON.stringify({ error: "missing config" }), { status: 400, headers: corsHeaders });
    }

    const prompt = buildPrompt(config, { className, title, gender });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("generate-avatar AI gateway error", aiRes.status, txt);
      return new Response(JSON.stringify({ error: "No se pudo generar el avatar" }), { status: 502, headers: corsHeaders });
    }
    const aiJson = await aiRes.json();
    const dataUrl: string | undefined = aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) {
      return new Response(JSON.stringify({ error: "no image" }), { status: 502, headers: corsHeaders });
    }

    const b64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const path = `${user.id}/avatar-${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage.from("avatars").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (upErr) {
      console.error("generate-avatar upload failed", upErr);
      return new Response(JSON.stringify({ error: "No se pudo guardar el avatar" }), { status: 500, headers: corsHeaders });
    }
    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = pub.publicUrl;

    await admin.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);

    return new Response(JSON.stringify({ avatar_url: avatarUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-avatar error", e);
    return new Response(JSON.stringify({ error: "No se pudo generar el avatar" }), { status: 500, headers: corsHeaders });
  }
});