export interface AvatarConfig {
  skinColor: string;
  hairStyle: string;
  hairColor: string;
  eyeStyle: string;
  eyeColor: string;
  faceStyle: string;
  height: number; // 0.85 - 1.15
  outfit: string;
}

export interface PlayerStats {
  hp: number;
  mp: number;
  str: number;
  int: number;
  spd: number;
  def: number;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skinColor: "#f5d0a9",
  hairStyle: "short",
  hairColor: "#2b1810",
  eyeStyle: "normal",
  eyeColor: "#3b82f6",
  faceStyle: "round",
  height: 1.0,
  outfit: "hunter",
};

export const DEFAULT_STATS: PlayerStats = {
  hp: 10,
  mp: 10,
  str: 10,
  int: 10,
  spd: 10,
  def: 10,
};

export const POINTS_PER_LEVEL = 3;

// Color palettes
export const SKIN_COLORS = [
  "#fbe1c4", "#f5d0a9", "#e6b58a", "#c98e6b", "#9c6b4a", "#6b4426", "#3d2614",
];

export const HAIR_COLORS = [
  "#0a0a0a", "#2b1810", "#5a3a1f", "#a06a3a", "#d4a017", "#e8d5a8",
  "#9b6bff", "#3b82f6", "#22c55e", "#ef4444", "#ec4899", "#06b6d4", "#ffffff",
];

export const EYE_COLORS = [
  "#1a1a2e", "#3b1f0a", "#5a3a1f", "#22c55e", "#06b6d4", "#3b82f6",
  "#9b6bff", "#ef4444", "#f59e0b", "#ec4899",
];

export const HAIR_STYLES = [
  { id: "short", name: "Corto" },
  { id: "spiky", name: "Spiky" },
  { id: "long", name: "Largo" },
  { id: "ponytail", name: "Coleta" },
  { id: "bangs", name: "Flequillo" },
  { id: "messy", name: "Despeinado" },
  { id: "mohawk", name: "Mohawk" },
  { id: "bald", name: "Calvo" },
];

export const EYE_STYLES = [
  { id: "normal", name: "Normales" },
  { id: "sharp", name: "Afilados" },
  { id: "big", name: "Grandes" },
  { id: "closed", name: "Cerrados" },
  { id: "glow", name: "Brillantes" },
];

export const FACE_STYLES = [
  { id: "round", name: "Redondo" },
  { id: "angular", name: "Anguloso" },
  { id: "soft", name: "Suave" },
];

export const OUTFITS = [
  { id: "hunter", name: "Cazador", color: "#1e293b", accent: "#06b6d4" },
  { id: "casual", name: "Casual", color: "#475569", accent: "#94a3b8" },
  { id: "armor", name: "Armadura", color: "#334155", accent: "#facc15" },
  { id: "mage", name: "Mago", color: "#581c87", accent: "#c4b5fd" },
];

// Extended outfits unlocked through class progression
export const CLASS_OUTFITS = [
  // Pure single-stat classes
  { id: "mage_apprentice", name: "Aprendiz Mago", color: "#3b1d6b", accent: "#a78bfa", trim: "#facc15" },
  { id: "mage_master",     name: "Mago Maestro", color: "#1e0e4a", accent: "#c4b5fd", trim: "#fde047" },
  { id: "warrior_apprentice", name: "Guerrero Novato", color: "#3f1d1d", accent: "#f97316", trim: "#fbbf24" },
  { id: "warrior_master",     name: "Guerrero Maestro", color: "#1f0c0c", accent: "#fb923c", trim: "#fde047" },
  { id: "rogue_apprentice", name: "Asesino Novato", color: "#0a2e1a", accent: "#22c55e", trim: "#86efac" },
  { id: "rogue_master",     name: "Asesino Maestro", color: "#04130c", accent: "#4ade80", trim: "#fbbf24" },
  { id: "tank_apprentice", name: "Guardián Novato", color: "#3a3a0e", accent: "#facc15", trim: "#fde68a" },
  { id: "tank_master",     name: "Guardián Maestro", color: "#1f1f08", accent: "#fde047", trim: "#fef3c7" },
  // Hybrids
  { id: "battlemage_apprentice", name: "Battlemage Novato", color: "#2a1140", accent: "#f97316", trim: "#a78bfa" },
  { id: "battlemage_master",     name: "Battlemage Maestro", color: "#160820", accent: "#fb923c", trim: "#c4b5fd" },
  { id: "spellblade_apprentice", name: "Spellblade Novato", color: "#0e2440", accent: "#a78bfa", trim: "#22c55e" },
  { id: "spellblade_master",     name: "Spellblade Maestro", color: "#06122a", accent: "#c4b5fd", trim: "#4ade80" },
  { id: "paladin_apprentice", name: "Paladín Novato", color: "#3a2a0a", accent: "#facc15", trim: "#fde047" },
  { id: "paladin_master",     name: "Paladín Maestro", color: "#1a1305", accent: "#fde047", trim: "#fef3c7" },
  { id: "ranger_apprentice", name: "Ranger Novato", color: "#0a3020", accent: "#22c55e", trim: "#a3e635" },
  { id: "ranger_master",     name: "Ranger Maestro", color: "#041a10", accent: "#4ade80", trim: "#fde047" },
  { id: "monk_apprentice", name: "Monje Novato", color: "#2a1a40", accent: "#06b6d4", trim: "#a78bfa" },
  { id: "monk_master",     name: "Monje Maestro", color: "#15082a", accent: "#22d3ee", trim: "#c4b5fd" },
];

export const ALL_OUTFITS = [...OUTFITS, ...CLASS_OUTFITS];

export function getOutfit(id: string) {
  return ALL_OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
}

/* ----------------------------------------------------------
   Hybrid class system
   - Trigger: a stat is "dominant" when it has >= 60% of allocated points.
   - Pure class: 1 dominant stat.
   - Hybrid class: 2 stats together >= 75% with neither dominant alone.
   - Tiers unlock by milestones of TOTAL points spent.
   ---------------------------------------------------------- */
export type ClassId =
  | "mage" | "warrior" | "rogue" | "tank"
  | "battlemage" | "spellblade" | "paladin" | "ranger" | "monk";

export interface ClassDef {
  id: ClassId;
  name: string;
  description: string;
  primary: keyof PlayerStats;
  secondary?: keyof PlayerStats;
  // outfit id per tier (1, 2, 3)
  outfits: [string, string, string];
  glow: string; // hsl-ish color for aura
}

export const CLASSES: Record<ClassId, ClassDef> = {
  mage:        { id: "mage",        name: "Mago",        description: "Maestro del arcano",  primary: "int",                 outfits: ["mage_apprentice", "mage", "mage_master"], glow: "#a78bfa" },
  warrior:     { id: "warrior",     name: "Guerrero",    description: "Fuerza pura",          primary: "str",                 outfits: ["warrior_apprentice", "armor", "warrior_master"], glow: "#f97316" },
  rogue:       { id: "rogue",       name: "Asesino",     description: "Velocidad letal",      primary: "spd",                 outfits: ["rogue_apprentice", "hunter", "rogue_master"], glow: "#22c55e" },
  tank:        { id: "tank",        name: "Guardián",    description: "Muro inquebrantable",  primary: "def",                 outfits: ["tank_apprentice", "armor", "tank_master"], glow: "#facc15" },
  battlemage:  { id: "battlemage",  name: "Battlemage",  description: "Magia y acero",        primary: "int", secondary: "str", outfits: ["battlemage_apprentice", "mage", "battlemage_master"], glow: "#f97316" },
  spellblade:  { id: "spellblade",  name: "Spellblade",  description: "Hechizos veloces",     primary: "int", secondary: "spd", outfits: ["spellblade_apprentice", "mage", "spellblade_master"], glow: "#a78bfa" },
  paladin:     { id: "paladin",     name: "Paladín",     description: "Fe y defensa",         primary: "str", secondary: "def", outfits: ["paladin_apprentice", "armor", "paladin_master"], glow: "#facc15" },
  ranger:      { id: "ranger",      name: "Ranger",      description: "Cazador ágil",         primary: "spd", secondary: "str", outfits: ["ranger_apprentice", "hunter", "ranger_master"], glow: "#22c55e" },
  monk:        { id: "monk",        name: "Monje",       description: "Cuerpo y mente",       primary: "spd", secondary: "int", outfits: ["monk_apprentice", "casual", "monk_master"], glow: "#06b6d4" },
};

export const CLASS_TIER_NAMES = ["", "Novato", "Adepto", "Maestro"] as const;

// Tier thresholds in TOTAL points spent
export const CLASS_TIER_THRESHOLDS = [0, 6, 18, 36];

export interface ClassResult {
  classId: ClassId | null;
  tier: 0 | 1 | 2 | 3;
  outfit: string | null;
  label: string; // "Aprendiz Mago"
}

export function detectClass(stats: PlayerStats, spent: number): ClassResult {
  // Compute allocated points above the 10-baseline for each stat.
  // hp/mp grow by 5 per point, so divide by 5; others by 1.
  const allocated: Record<keyof PlayerStats, number> = {
    hp: Math.max(0, (stats.hp - DEFAULT_STATS.hp) / 5),
    mp: Math.max(0, (stats.mp - DEFAULT_STATS.mp) / 5),
    str: Math.max(0, stats.str - DEFAULT_STATS.str),
    int: Math.max(0, stats.int - DEFAULT_STATS.int),
    spd: Math.max(0, stats.spd - DEFAULT_STATS.spd),
    def: Math.max(0, stats.def - DEFAULT_STATS.def),
  };
  const total = Object.values(allocated).reduce((a, b) => a + b, 0);
  if (total < CLASS_TIER_THRESHOLDS[1]) {
    return { classId: null, tier: 0, outfit: null, label: "Sin clase" };
  }

  // Sort stats by points desc
  const sorted = (Object.entries(allocated) as [keyof PlayerStats, number][])
    .sort((a, b) => b[1] - a[1]);
  const [topKey, topVal] = sorted[0];
  const [secondKey, secondVal] = sorted[1];
  const topPct = topVal / total;
  const comboPct = (topVal + secondVal) / total;

  let classId: ClassId | null = null;

  // Pure: top stat >= 60%
  if (topPct >= 0.6) {
    if (topKey === "int") classId = "mage";
    else if (topKey === "str") classId = "warrior";
    else if (topKey === "spd") classId = "rogue";
    else if (topKey === "def" || topKey === "hp") classId = "tank";
    else if (topKey === "mp") classId = "mage";
  }
  // Hybrid: top two together >= 75%, neither alone >= 60%
  else if (comboPct >= 0.75) {
    const pair = new Set([topKey, secondKey]);
    const has = (a: keyof PlayerStats, b: keyof PlayerStats) => pair.has(a) && pair.has(b);
    if (has("int", "str")) classId = "battlemage";
    else if (has("int", "spd")) classId = "spellblade";
    else if (has("str", "def") || has("str", "hp")) classId = "paladin";
    else if (has("spd", "str")) classId = "ranger";
    else if (has("spd", "int") || has("spd", "mp")) classId = "monk";
    else if (has("int", "def") || has("int", "hp")) classId = "spellblade";
  }

  if (!classId) return { classId: null, tier: 0, outfit: null, label: "Aventurero" };

  // Tier from total spent
  let tier: 0 | 1 | 2 | 3 = 0;
  if (spent >= CLASS_TIER_THRESHOLDS[3]) tier = 3;
  else if (spent >= CLASS_TIER_THRESHOLDS[2]) tier = 2;
  else if (spent >= CLASS_TIER_THRESHOLDS[1]) tier = 1;

  const def = CLASSES[classId];
  const outfit = tier > 0 ? def.outfits[tier - 1] : null;
  const label = tier > 0 ? `${CLASS_TIER_NAMES[tier]} ${def.name}` : def.name;
  return { classId, tier, outfit, label };
}

export const STAT_INFO: Record<keyof PlayerStats, { label: string; color: string; icon: string }> = {
  hp: { label: "HP", color: "#ef4444", icon: "❤" },
  mp: { label: "MP", color: "#3b82f6", icon: "✦" },
  str: { label: "FUERZA", color: "#f97316", icon: "⚔" },
  int: { label: "INT", color: "#a855f7", icon: "✺" },
  spd: { label: "VELOCIDAD", color: "#22c55e", icon: "➤" },
  def: { label: "DEFENSA", color: "#facc15", icon: "🛡" },
};

export function calculateExpectedPoints(level: number): number {
  return Math.max(0, (level - 1) * POINTS_PER_LEVEL);
}
