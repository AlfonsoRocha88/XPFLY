// Achievement catalog shared by the app (via the `@shared` alias) and the edge functions.
// Pure TypeScript with no imports, so it runs unchanged in Vite and Deno.
// Counters come from the SQL function public.achievement_metrics(user) as a flat JSON object.

export type ConstellationId = "ritmo" | "constancia" | "enfoque" | "bienestar" | "conocimiento" | "ascenso";

export interface Metrics {
  total: number;
  habits: number;
  before9: number;
  before6: number;
  midday: number;
  after22: number;
  weekend: number;
  urgent: number;
  high: number;
  activeDays: number;
  bestStreak: number;
  fullWeeks: number;
  maxInHour: number;
  maxInDay: number;
  sleepNights: number;
  goodSleepNights: number;
  tags: Record<string, number>;
  level: number;
  highestTrophies: number;
  friends: number;
  clanMember: number;
  clanContributions: number;
}

export interface AchievementDef {
  id: string;
  constellation: ConstellationId;
  name: string;
  /** What is counted, phrased for "N …" (e.g. "tareas antes de las 9 h"). */
  unit: string;
  thresholds: [number, number, number];
  /** Optional per-tier label shown instead of the number (e.g. league names). */
  tierLabels?: [string, string, string];
  value: (m: Metrics) => number;
}

export const TIER_COINS: [number, number, number] = [20, 50, 120];
export const TIER_NAMES = ["Bronce", "Plata", "Oro"] as const;

export const CONSTELLATIONS: { id: ConstellationId; name: string; tagline: string }[] = [
  { id: "ritmo", name: "Ritmo", tagline: "Tus horarios y momentos del día" },
  { id: "constancia", name: "Constancia", tagline: "Volver cada día, aunque sea poco" },
  { id: "enfoque", name: "Enfoque", tagline: "Prioridades y días de alto rendimiento" },
  { id: "bienestar", name: "Bienestar", tagline: "Descanso, cuerpo y mente" },
  { id: "conocimiento", name: "Conocimiento", tagline: "Aprender y crear" },
  { id: "ascenso", name: "Ascenso", tagline: "Niveles, ligas y comunidad" },
];

const tag = (t: string) => (m: Metrics) => m.tags?.[t] ?? 0;

/** League family index reached by a trophy count (hierro = 1 … elite = 12). Mirrors _shared/leagues.ts. */
const LEAGUE_MIN = [0, 200, 550, 1050, 1700, 2500, 3500, 4800, 6400, 8300, 10500, 13000];
export const leagueFamilyFor = (trophies: number) => LEAGUE_MIN.filter((min) => trophies >= min).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  // Ritmo
  { id: "madrugador", constellation: "ritmo", name: "Madrugador", unit: "tareas antes de las 9 h", thresholds: [10, 50, 200], value: (m) => m.before9 },
  { id: "alba", constellation: "ritmo", name: "Alba", unit: "tareas antes de las 6 h", thresholds: [1, 10, 30], value: (m) => m.before6 },
  { id: "mediodia", constellation: "ritmo", name: "Mediodía", unit: "tareas entre las 12 y las 14 h", thresholds: [10, 50, 100], value: (m) => m.midday },
  { id: "nocturno", constellation: "ritmo", name: "Nocturno", unit: "tareas después de las 22 h", thresholds: [10, 50, 200], value: (m) => m.after22 },
  // Constancia
  { id: "racha", constellation: "constancia", name: "Racha", unit: "días seguidos activos", thresholds: [7, 30, 100], value: (m) => m.bestStreak },
  { id: "dias-activos", constellation: "constancia", name: "Días activos", unit: "días con al menos una tarea", thresholds: [10, 60, 200], value: (m) => m.activeDays },
  { id: "fin-de-semana", constellation: "constancia", name: "Fin de semana", unit: "tareas en sábado o domingo", thresholds: [10, 50, 150], value: (m) => m.weekend },
  { id: "habito-firme", constellation: "constancia", name: "Hábito firme", unit: "hábitos cumplidos", thresholds: [25, 150, 500], value: (m) => m.habits },
  { id: "semana-completa", constellation: "constancia", name: "Semana completa", unit: "semanas con los 7 días activos", thresholds: [1, 4, 12], value: (m) => m.fullWeeks },
  // Enfoque
  { id: "centurion", constellation: "enfoque", name: "Centurión", unit: "tareas completadas", thresholds: [10, 100, 500], value: (m) => m.total },
  { id: "urgente", constellation: "enfoque", name: "Sin demora", unit: "tareas urgentes", thresholds: [10, 50, 150], value: (m) => m.urgent },
  { id: "alto-rendimiento", constellation: "enfoque", name: "Alto rendimiento", unit: "tareas de prioridad alta", thresholds: [10, 50, 150], value: (m) => m.high },
  { id: "velocista", constellation: "enfoque", name: "Velocista", unit: "tareas en una sola hora", thresholds: [3, 5, 8], value: (m) => m.maxInHour },
  { id: "dia-productivo", constellation: "enfoque", name: "Día productivo", unit: "tareas en un solo día", thresholds: [5, 10, 15], value: (m) => m.maxInDay },
  // Bienestar
  { id: "buen-descanso", constellation: "bienestar", name: "Buen descanso", unit: "noches de 7 a 9 h", thresholds: [5, 30, 100], value: (m) => m.goodSleepNights },
  { id: "diario-sueno", constellation: "bienestar", name: "Diario de sueño", unit: "noches registradas", thresholds: [7, 30, 120], value: (m) => m.sleepNights },
  { id: "atleta", constellation: "bienestar", name: "Atleta", unit: "tareas con #ejercicio", thresholds: [5, 25, 100], value: tag("ejercicio") },
  { id: "mente-calma", constellation: "bienestar", name: "Mente en calma", unit: "tareas con #meditar", thresholds: [5, 25, 100], value: tag("meditar") },
  { id: "nutricion", constellation: "bienestar", name: "Nutrición", unit: "tareas con #nutricion", thresholds: [5, 25, 100], value: tag("nutricion") },
  // Conocimiento
  { id: "erudito", constellation: "conocimiento", name: "Erudito", unit: "tareas con #estudio", thresholds: [5, 25, 100], value: tag("estudio") },
  { id: "lector", constellation: "conocimiento", name: "Lector", unit: "tareas con #lectura", thresholds: [5, 25, 100], value: tag("lectura") },
  { id: "finanzas", constellation: "conocimiento", name: "Finanzas", unit: "tareas con #finanzas", thresholds: [5, 25, 100], value: tag("finanzas") },
  { id: "creativo", constellation: "conocimiento", name: "Creativo", unit: "tareas con #creativo", thresholds: [5, 25, 100], value: tag("creativo") },
  // Ascenso y comunidad
  { id: "ascenso", constellation: "ascenso", name: "Ascenso", unit: "niveles", thresholds: [5, 15, 30], value: (m) => m.level },
  { id: "coleccionista", constellation: "ascenso", name: "Coleccionista", unit: "trofeos (máximo)", thresholds: [50, 200, 500], value: (m) => m.highestTrophies },
  { id: "liga", constellation: "ascenso", name: "Liga", unit: "liga alcanzada", thresholds: [3, 4, 10], tierLabels: ["Liga Plata", "Liga Oro", "Liga Diamante"], value: (m) => leagueFamilyFor(m.highestTrophies) },
  { id: "amigos", constellation: "ascenso", name: "Amigos", unit: "amigos", thresholds: [1, 5, 10], value: (m) => m.friends },
  { id: "clan", constellation: "ascenso", name: "Clan", unit: "aportes a tu clan", thresholds: [1, 50, 200], tierLabels: ["Unirte a un clan", "50 aportes", "200 aportes"], value: (m) => (m.clanMember ? Math.max(1, m.clanContributions) : 0) },
  {
    id: "primer-paso", constellation: "ascenso", name: "Primer paso", unit: "primeros pasos", thresholds: [1, 2, 3],
    tierLabels: ["Tu primera tarea", "Tu primer hábito", "Tu primera noche registrada"],
    value: (m) => (m.total > 0 ? 1 : 0) + (m.total > 0 && m.habits > 0 ? 1 : 0) + (m.total > 0 && m.habits > 0 && m.sleepNights > 0 ? 1 : 0),
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Highest tier (0–3) the metrics qualify for. */
export function tierReached(def: AchievementDef, m: Metrics): 0 | 1 | 2 | 3 {
  const v = def.value(m);
  return (def.thresholds.filter((t) => v >= t).length) as 0 | 1 | 2 | 3;
}

/** Frame id unlocked by completing every achievement of a constellation in gold. */
export const frameFor = (c: ConstellationId) => c;
