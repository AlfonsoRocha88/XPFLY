// Leagues: twelve cosmic tiers, from an asteroid to a whole galaxy. Shared by the app
// (`@shared/leagues`) and the edge functions, so ids, names and trophy rules live in one place.
// Ids are stored in profiles.current_league_id (e.g. "saturno-2"); the top tier is "galactica".

export type LeagueFamily =
  | "asteroide" | "cometa" | "luna" | "mercurio" | "marte" | "tierra"
  | "neptuno" | "saturno" | "jupiter" | "sol" | "supernova" | "galactica";

/** Families in order, with display name and the trophies needed for divisions III, II, I. */
export const FAMILIES: Array<{ id: Exclude<LeagueFamily, "galactica">; name: string; base: [number, number, number] }> = [
  { id: "asteroide", name: "Asteroide", base: [0, 50, 100] },
  { id: "cometa", name: "Cometa", base: [200, 300, 400] },
  { id: "luna", name: "Luna", base: [550, 700, 850] },
  { id: "mercurio", name: "Mercurio", base: [1050, 1250, 1450] },
  { id: "marte", name: "Marte", base: [1700, 1950, 2200] },
  { id: "tierra", name: "Tierra", base: [2500, 2800, 3100] },
  { id: "neptuno", name: "Neptuno", base: [3500, 3900, 4300] },
  { id: "saturno", name: "Saturno", base: [4800, 5300, 5800] },
  { id: "jupiter", name: "Júpiter", base: [6400, 7000, 7600] },
  { id: "sol", name: "Sol", base: [8300, 9000, 9700] },
  { id: "supernova", name: "Supernova", base: [10500, 11300, 12100] },
];
export const TOP_FAMILY = { id: "galactica" as const, name: "Galáctica", minTrophies: 13000 };

export const FAMILY_NAMES: Record<LeagueFamily, string> = {
  ...Object.fromEntries(FAMILIES.map((f) => [f.id, f.name])),
  galactica: TOP_FAMILY.name,
} as Record<LeagueFamily, string>;

export const LEAGUES: { id: string; family: LeagueFamily; division: 1 | 2 | 3 | null; minTrophies: number }[] = [
  ...FAMILIES.flatMap((f) => [
    { id: `${f.id}-3`, family: f.id, division: 3 as const, minTrophies: f.base[0] },
    { id: `${f.id}-2`, family: f.id, division: 2 as const, minTrophies: f.base[1] },
    { id: `${f.id}-1`, family: f.id, division: 1 as const, minTrophies: f.base[2] },
  ]),
  { id: TOP_FAMILY.id, family: TOP_FAMILY.id, division: null, minTrophies: TOP_FAMILY.minTrophies },
];

// ---- How trophies are earned (the server enforces these; the app explains them) ----
/** One trophy every N completed tasks. */
export const TASKS_PER_TROPHY = 2;
/** From this daily streak on, each earned task trophy comes with +1 extra. */
export const STREAK_BONUS_FROM = 7;
/** Claiming the daily reward (all dailies done). */
export const DAILY_TROPHY_BONUS = 5;
/** "Semana perfecta": every 7 consecutive days with all dailies done. */
export const WEEKLY_TROPHY_BONUS = 25;
/** Leagues from this family index on lose trophies for inactivity (see cron-worker). */
export const DECAY_FROM_FAMILY = 7;

export function currentLeague(trophies: number): string {
  let cur = LEAGUES[0];
  for (const d of LEAGUES) {
    if (trophies >= d.minTrophies) cur = d;
    else break;
  }
  return cur.id;
}

/** 1-based position of a league family (asteroide = 1 … galactica = 12); 0 when unknown. */
export function leagueFamilyIndex(id: string | null | undefined): number {
  if (!id) return 0;
  const fam = id.replace(/-\d$/, "");
  const i = [...FAMILIES.map((f) => f.id), TOP_FAMILY.id].indexOf(fam as never);
  return i < 0 ? 0 : i + 1;
}

/** "Saturno II" / "Galáctica" from a stored id. */
export function leagueName(id: string | null | undefined): string {
  const d = LEAGUES.find((l) => l.id === id);
  if (!d) return FAMILY_NAMES.asteroide;
  const roman = d.division === 1 ? "I" : d.division === 2 ? "II" : d.division === 3 ? "III" : "";
  return roman ? `${FAMILY_NAMES[d.family]} ${roman}` : FAMILY_NAMES[d.family];
}
