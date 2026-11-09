// League system: twelve tiers named after metals and stones.
// Each tier (except the top one) has 3 divisions: III (entry) → II → I (top).
// Trophies are earned: +1 per completed task, +5 bonus when all dailies are done.
// Ids are mirrored in supabase/functions/_shared/leagues.ts; keep both in sync.

export interface LeagueDivision {
  /** Stable id stored in profiles.current_league_id (e.g. "plata-2") */
  id: string;
  /** League family name */
  league: string;
  /** Division roman numeral ("III" | "II" | "I"). null for the single top tier. */
  division: "III" | "II" | "I" | null;
  /** Minimum trophies required to enter this division */
  minTrophies: number;
  /** Base color of the league medallion */
  color: string;
}

const slug = (name: string) => name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const L = (league: string, color: string, base: [number, number, number]): LeagueDivision[] => [
  { id: `${slug(league)}-3`, league, division: "III", minTrophies: base[0], color },
  { id: `${slug(league)}-2`, league, division: "II", minTrophies: base[1], color },
  { id: `${slug(league)}-1`, league, division: "I", minTrophies: base[2], color },
];

export const LEAGUES: LeagueDivision[] = [
  ...L("Hierro", "#7d838c", [0, 50, 100]),
  ...L("Bronce", "#b0763f", [200, 300, 400]),
  ...L("Plata", "#a3adba", [550, 700, 850]),
  ...L("Oro", "#c9a12e", [1050, 1250, 1450]),
  ...L("Platino", "#6fa7b8", [1700, 1950, 2200]),
  ...L("Zafiro", "#3a66c4", [2500, 2800, 3100]),
  ...L("Esmeralda", "#2e8f66", [3500, 3900, 4300]),
  ...L("Rubí", "#b8384f", [4800, 5300, 5800]),
  ...L("Amatista", "#7f58bd", [6400, 7000, 7600]),
  ...L("Diamante", "#4fb3d4", [8300, 9000, 9700]),
  ...L("Ónix", "#2f3340", [10500, 11300, 12100]),
  { id: "elite", league: "Élite", division: null, minTrophies: 13000, color: "#a8893a" },
];

/** Medallion color for a league family name. */
export function leagueColor(name: string): string {
  return LEAGUES.find((d) => d.league === name)?.color ?? LEAGUES[0].color;
}

/** Display name with division: "Plata II" / "Élite" */
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

/** Returns the tier as Roman numeral (I = top, II, III = entry) or null for Élite. */
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
