// League system — Clash of Clans style with Roman-numeral divisions.
// Each league (except the top one) has 3 divisions: III (entry) → II → I (top).
// Trophies are earned: +1 per completed mission, +5 bonus when all dailies done.

export interface LeagueDivision {
  /** Stable id used internally (e.g. "knight-2") */
  id: string;
  /** League family name */
  league: string;
  /** Division roman numeral ("III" | "II" | "I"). null for the single Singularity tier. */
  division: "III" | "II" | "I" | null;
  /** Minimum trophies required to enter this division */
  minTrophies: number;
  /** Distinctive color (HSL/hex) for the shield */
  color: string;
  /** Emoji used as emblem inside the shield */
  emblem: string;
}

const L = (
  league: string,
  color: string,
  emblem: string,
  base: [number, number, number],
): LeagueDivision[] => [
  { id: `${league.toLowerCase()}-3`, league, division: "III", minTrophies: base[0], color, emblem },
  { id: `${league.toLowerCase()}-2`, league, division: "II", minTrophies: base[1], color, emblem },
  { id: `${league.toLowerCase()}-1`, league, division: "I", minTrophies: base[2], color, emblem },
];

export const LEAGUES: LeagueDivision[] = [
  ...L("Mortal", "#94a3b8", "🪨", [0, 50, 100]),
  ...L("Guerrero", "#a16207", "🗡️", [200, 300, 400]),
  ...L("Caballero", "#cbd5e1", "🛡️", [550, 700, 850]),
  ...L("Heroe", "#16a34a", "🏹", [1050, 1250, 1450]),
  ...L("Campeon", "#0ea5e9", "🏆", [1700, 1950, 2200]),
  ...L("Leyenda", "#a855f7", "⚜️", [2500, 2800, 3100]),
  ...L("Rey", "#eab308", "👑", [3500, 3900, 4300]),
  ...L("Emperador", "#f97316", "🦅", [4800, 5300, 5800]),
  ...L("Dios", "#fde047", "✨", [6400, 7000, 7600]),
  ...L("Titan", "#ef4444", "🔥", [8300, 9000, 9700]),
  ...L("Primordial", "#7c3aed", "🌌", [10500, 11300, 12100]),
  { id: "singularidad", league: "Singularidad", division: null, minTrophies: 13000, color: "#f0abfc", emblem: "♾️" },
];

/** Display name with division: "Caballero II" / "Singularidad" */
export function leagueLabel(d: LeagueDivision): string {
  return d.division ? `${d.league} ${d.division}` : d.league;
}

/** Returns the player's current division based on their trophy count. */
export function getCurrentLeague(trophies: number): LeagueDivision {
  let current = LEAGUES[0];
  for (const d of LEAGUES) {
    if (trophies >= d.minTrophies) current = d;
    else break;
  }
  return current;
}

/** Returns the next division above the current one, or null if at the top. */
export function getNextLeague(trophies: number): LeagueDivision | null {
  for (const d of LEAGUES) {
    if (d.minTrophies > trophies) return d;
  }
  return null;
}

/** 0..1 progress within the current division towards the next one. */
export function getDivisionProgress(trophies: number): number {
  const cur = getCurrentLeague(trophies);
  const next = getNextLeague(trophies);
  if (!next) return 1;
  const span = next.minTrophies - cur.minTrophies;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (trophies - cur.minTrophies) / span));
}

/** Trophies awarded when claiming the daily bonus (all dailies done). */
export const DAILY_TROPHY_BONUS = 5;

/** Returns the tier as Roman numeral (I = top, II, III = entry) or null for Singularidad. */
export function leagueTierRoman(id: string | null | undefined): "I" | "II" | "III" | null {
  if (!id) return null;
  const m = id.match(/-(\d)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n === 1) return "I";
  if (n === 2) return "II";
  if (n === 3) return "III";
  return null;
}
