// League tiers, mirrored from src/lib/leagues.ts — keep both in sync.
// Ids are stored in profiles.current_league_id (e.g. "plata-2"); the top tier is "elite".

const FAMILIES: Array<[id: string, base: [number, number, number]]> = [
  ["hierro", [0, 50, 100]],
  ["bronce", [200, 300, 400]],
  ["plata", [550, 700, 850]],
  ["oro", [1050, 1250, 1450]],
  ["platino", [1700, 1950, 2200]],
  ["zafiro", [2500, 2800, 3100]],
  ["esmeralda", [3500, 3900, 4300]],
  ["rubi", [4800, 5300, 5800]],
  ["amatista", [6400, 7000, 7600]],
  ["diamante", [8300, 9000, 9700]],
  ["onix", [10500, 11300, 12100]],
];

export const LEAGUES: { id: string; minTrophies: number }[] = [
  ...FAMILIES.flatMap(([id, base]) => [
    { id: `${id}-3`, minTrophies: base[0] },
    { id: `${id}-2`, minTrophies: base[1] },
    { id: `${id}-1`, minTrophies: base[2] },
  ]),
  { id: "elite", minTrophies: 13000 },
];

export function currentLeague(trophies: number): string {
  let cur = LEAGUES[0];
  for (const d of LEAGUES) {
    if (trophies >= d.minTrophies) cur = d;
    else break;
  }
  return cur.id;
}

/** 1-based position of a league family (hierro = 1 … elite = 12); 0 when unknown. */
export function leagueFamilyIndex(id: string | null | undefined): number {
  if (!id) return 0;
  const fam = id.replace(/-\d$/, "");
  const i = [...FAMILIES.map(([f]) => f), "elite"].indexOf(fam);
  return i < 0 ? 0 : i + 1;
}
