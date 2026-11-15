// League system for the app: twelve cosmic tiers (Asteroide → Galáctica), each but the top one
// with divisions III (entry) → II → I. Ids, names and trophy rules come from the shared module
// so the app and the edge functions can never disagree.
import {
  LEAGUES as SHARED,
  FAMILY_NAMES,
  type LeagueFamily,
  TASKS_PER_TROPHY,
  STREAK_BONUS_FROM,
  DAILY_TROPHY_BONUS,
  WEEKLY_TROPHY_BONUS,
  DECAY_FROM_FAMILY,
  leagueFamilyIndex,
} from "@shared/leagues";

export type { LeagueFamily };
export { TASKS_PER_TROPHY, STREAK_BONUS_FROM, DAILY_TROPHY_BONUS, WEEKLY_TROPHY_BONUS, DECAY_FROM_FAMILY, leagueFamilyIndex, FAMILY_NAMES };

export interface LeagueDivision {
  /** Stable id stored in profiles.current_league_id (e.g. "saturno-2") */
  id: string;
  /** Family id (e.g. "saturno"), used to pick the emblem */
  family: LeagueFamily;
  /** League family display name ("Saturno") */
  league: string;
  /** Division roman numeral ("III" | "II" | "I"). null for the single top tier. */
  division: "III" | "II" | "I" | null;
  /** Division as a number (3 = entry, 1 = top), null for the top tier */
  divisionNumber: 1 | 2 | 3 | null;
  /** Minimum trophies required to enter this division */
  minTrophies: number;
  /** Accent color of the league */
  color: string;
}

/** Accent per family: used for text, rings and progress bars next to the emblem. */
const COLORS: Record<LeagueFamily, string> = {
  asteroide: "#9a8f86",
  cometa: "#7fd4e8",
  luna: "#c9cfdc",
  mercurio: "#c7a77a",
  marte: "#d7744f",
  tierra: "#4fa3e0",
  neptuno: "#4f6fe8",
  saturno: "#e0c07a",
  jupiter: "#d4a27c",
  sol: "#ffc857",
  supernova: "#f28dd6",
  galactica: "#b9a4ff",
};

const ROMAN = { 1: "I", 2: "II", 3: "III" } as const;

export const LEAGUES: LeagueDivision[] = SHARED.map((d) => ({
  id: d.id,
  family: d.family,
  league: FAMILY_NAMES[d.family],
  division: d.division ? ROMAN[d.division] : null,
  divisionNumber: d.division,
  minTrophies: d.minTrophies,
  color: COLORS[d.family],
}));

/** Accent color for a league family name or id. */
export function leagueColor(nameOrFamily: string): string {
  return LEAGUES.find((d) => d.league === nameOrFamily || d.family === nameOrFamily)?.color ?? LEAGUES[0].color;
}

/** Display name with division: "Saturno II" / "Galáctica" */
export function leagueLabel(d: LeagueDivision): string {
  return d.division ? `${d.league} ${d.division}` : d.league;
}

/** Division object for a stored id (falls back to the first one). */
export function leagueById(id: string | null | undefined): LeagueDivision {
  return LEAGUES.find((d) => d.id === id) ?? LEAGUES[0];
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

/** Position of a division in the ladder (0 = Asteroide III), for "did I move up?" checks. */
export function leagueRank(id: string | null | undefined): number {
  return LEAGUES.findIndex((d) => d.id === id);
}

/** Returns the tier as Roman numeral (I = top, II, III = entry) or null for Galáctica. */
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
