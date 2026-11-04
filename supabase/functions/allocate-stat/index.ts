import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_STATS = { hp: 10, mp: 10, str: 10, int: 10, spd: 10, def: 10 };
const VALID_STATS = new Set(Object.keys(DEFAULT_STATS));

const CLASS_TIER_THRESHOLDS = [0, 6, 18, 36];

type StatKey = keyof typeof DEFAULT_STATS;
type Stats = typeof DEFAULT_STATS;

const CLASSES: Record<string, { outfits: [string, string, string] }> = {
  mage: { outfits: ["mage_apprentice", "mage", "mage_master"] },
  warrior: { outfits: ["warrior_apprentice", "armor", "warrior_master"] },
  rogue: { outfits: ["rogue_apprentice", "hunter", "rogue_master"] },
  tank: { outfits: ["tank_apprentice", "armor", "tank_master"] },
  battlemage: { outfits: ["battlemage_apprentice", "mage", "battlemage_master"] },
  spellblade: { outfits: ["spellblade_apprentice", "mage", "spellblade_master"] },
  paladin: { outfits: ["paladin_apprentice", "armor", "paladin_master"] },
  ranger: { outfits: ["ranger_apprentice", "hunter", "ranger_master"] },
  monk: { outfits: ["monk_apprentice", "casual", "monk_master"] },
};

function detectClass(stats: Stats, spent: number) {
  const allocated: Record<StatKey, number> = {
    hp: Math.max(0, (stats.hp - DEFAULT_STATS.hp) / 5),
    mp: Math.max(0, (stats.mp - DEFAULT_STATS.mp) / 5),
    str: Math.max(0, stats.str - DEFAULT_STATS.str),
    int: Math.max(0, stats.int - DEFAULT_STATS.int),
    spd: Math.max(0, stats.spd - DEFAULT_STATS.spd),
    def: Math.max(0, stats.def - DEFAULT_STATS.def),
  };
  const total = Object.values(allocated).reduce((a, b) => a + b, 0);
  if (total < CLASS_TIER_THRESHOLDS[1]) return { classId: null, tier: 0, outfit: null };
  const sorted = (Object.entries(allocated) as [StatKey, number][]).sort((a, b) => b[1] - a[1]);
  const [topKey, topVal] = sorted[0];
  const [secondKey, secondVal] = sorted[1];
  const topPct = topVal / total;
  const comboPct = (topVal + secondVal) / total;
  let classId: string | null = null;
  if (topPct >= 0.6) {
    if (topKey === "int" || topKey === "mp") classId = "mage";
    else if (topKey === "str") classId = "warrior";
    else if (topKey === "spd") classId = "rogue";
    else if (topKey === "def" || topKey === "hp") classId = "tank";
  } else if (comboPct >= 0.75) {
    const pair = new Set([topKey, secondKey]);
    const has = (a: StatKey, b: StatKey) => pair.has(a) && pair.has(b);
    if (has("int", "str")) classId = "battlemage";
    else if (has("int", "spd")) classId = "spellblade";
    else if (has("str", "def") || has("str", "hp")) classId = "paladin";
    else if (has("spd", "str")) classId = "ranger";
    else if (has("spd", "int") || has("spd", "mp")) classId = "monk";
    else if (has("int", "def") || has("int", "hp")) classId = "spellblade";
  }
  if (!classId) return { classId: null, tier: 0, outfit: null };
  let tier: 0 | 1 | 2 | 3 = 0;
  if (spent >= CLASS_TIER_THRESHOLDS[3]) tier = 3;
  else if (spent >= CLASS_TIER_THRESHOLDS[2]) tier = 2;
  else if (spent >= CLASS_TIER_THRESHOLDS[1]) tier = 1;
  const outfit = tier > 0 ? CLASSES[classId].outfits[tier - 1] : null;
  return { classId, tier, outfit };
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

    const body = await req.json().catch(() => ({}));
    const stat = body?.stat as StatKey;
    if (!stat || !VALID_STATS.has(stat)) return j({ error: "invalid_stat" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: profile, error } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error || !profile) return j({ error: "profile_not_found" }, 404);

    const available = profile.stat_points_available ?? 0;
    if (available <= 0) return j({ error: "no_points" }, 409);

    const stats: Stats = { ...DEFAULT_STATS, ...(profile.stats ?? {}) };
    const inc = stat === "hp" || stat === "mp" ? 5 : 1;
    const newStats = { ...stats, [stat]: stats[stat] + inc };
    const spent = (profile.stat_points_spent ?? 0) + 1;

    const prevClass = profile.current_class as string | null;
    const prevTier = profile.current_class_tier ?? 0;
    const detected = detectClass(newStats, spent);
    const unlockedOutfits: string[] = profile.unlocked_outfits ?? ["hunter", "casual"];
    const newUnlocked = new Set(unlockedOutfits);
    let outfitToEquip: string | undefined;
    let levelUpClass = false;
    if (detected.outfit && !newUnlocked.has(detected.outfit)) {
      newUnlocked.add(detected.outfit);
      outfitToEquip = detected.outfit;
      levelUpClass = true;
    } else if (detected.classId && (detected.classId !== prevClass || detected.tier !== prevTier)) {
      levelUpClass = detected.tier > prevTier;
    }

    const cfg = profile.avatar_config ?? {};
    const newCfg = outfitToEquip ? { ...cfg, outfit: outfitToEquip } : cfg;

    const updates: Record<string, unknown> = {
      stats: newStats,
      stat_points_available: available - 1,
      stat_points_spent: spent,
      unlocked_outfits: Array.from(newUnlocked),
      current_class: detected.classId,
      current_class_tier: detected.tier,
    };
    if (outfitToEquip) updates.avatar_config = newCfg;

    const { data: updated, error: uErr } = await admin.from("profiles").update(updates).eq("user_id", userId).select().single();
    if (uErr) return j({ error: uErr.message }, 500);

    return j({ profile: updated, classId: detected.classId, tier: detected.tier, outfitEquipped: outfitToEquip ?? null, levelUpClass });
  } catch (e) {
    console.error("allocate-stat", e);
    return j({ error: "internal_error" }, 500);
  }
});