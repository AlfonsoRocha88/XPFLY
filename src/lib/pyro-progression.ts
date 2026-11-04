/**
 * Phase 4 — Pyro power-level progression.
 * As Pyro is fed missions, his "power" rises and unlocks app features one by one.
 */

export type FeatureKey =
  | "missions"
  | "calendar"
  | "stats"
  | "shop"
  | "leagues"
  | "social"
  | "clans";

export interface PyroTier {
  level: number;
  /** Total cumulative missions fed required to reach this tier. */
  threshold: number;
  /** Feature(s) unlocked when this tier is reached. */
  unlocks: FeatureKey | ReadonlyArray<FeatureKey>;
  /** Display name shown on the cutscene banner. */
  title: string;
  /** What the user gains, in dramatic Pyro voice. */
  description: string;
  /** Spanish, casual, dramatic tagline that Pyro says. */
  pyroLine: string;
  emoji: string;
}

/**
 * Always-unlocked baseline features.
 * Missions list is available from level 0.
 */
export const BASE_FEATURES: ReadonlyArray<FeatureKey> = ["missions"];

export const PYRO_TIERS: ReadonlyArray<PyroTier> = [
  {
    level: 1,
    threshold: 1,
    unlocks: ["calendar", "stats", "shop"],
    title: "PYRO DESPIERTA",
    description: "Calendario, Logros y Tienda activos. Ahora puedes planear el futuro.",
    pyroLine: "¡Eh, ya respiro! Te abrí Calendario, Logros y Tienda 📅",
    emoji: "📅",
  },
  {
    level: 2,
    threshold: 2,
    unlocks: "social",
    title: "PYRO EVOLUCIONA",
    description: "Conexiones sociales activas. Añade amigos y forma tu Party.",
    pyroLine: "¡Ya no andas solo! Conexiones sociales activadas 🤝",
    emoji: "🤝",
  },
  {
    level: 3,
    threshold: 4,
    unlocks: "clans",
    title: "PYRO PROSPERA",
    description: "Clanes desbloqueados. Forja alianzas con otros héroes.",
    pyroLine: "¡Hora de forjar alianzas! Los Clanes están abiertos ⚔️",
    emoji: "⚔️",
  },
  {
    level: 4,
    threshold: 6,
    unlocks: "leagues",
    title: "PYRO ASCIENDE",
    description: "Las Ligas te aceptan. Compite contra otros héroes.",
    pyroLine: "OK. Ya estás listo para la guerra. Bienvenido a las Ligas 🛡️",
    emoji: "🛡️",
  },
];

/** Returns the tier matching this exact power_level (0..5), or null at L0. */
export function getTierForLevel(level: number): PyroTier | null {
  return PYRO_TIERS.find((t) => t.level === level) ?? null;
}

/** Returns the set of features unlocked at a given power level. */
export function unlockedFeaturesAt(level: number): Set<FeatureKey> {
  const set = new Set<FeatureKey>(BASE_FEATURES);
  for (const t of PYRO_TIERS) {
    if (level >= t.level) {
      if (Array.isArray(t.unlocks)) (t.unlocks as ReadonlyArray<FeatureKey>).forEach((f) => set.add(f));
      else set.add(t.unlocks as FeatureKey);
    }
  }
  return set;
}

/**
 * Given a previous power level and a new total of missions fed,
 * returns the new power level (may be unchanged or jump multiple tiers).
 */
export function computePowerFromTotal(totalFed: number, currentLevel: number): number {
  let lvl = currentLevel;
  for (const t of PYRO_TIERS) {
    if (totalFed >= t.threshold && t.level > lvl) lvl = t.level;
  }
  return lvl;
}

/** Next tier the user is working toward, or null if maxed. */
export function getNextTier(level: number): PyroTier | null {
  return PYRO_TIERS.find((t) => t.level > level) ?? null;
}