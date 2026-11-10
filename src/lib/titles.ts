import type { TaskPriority } from "@/lib/types";

export interface TitleDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Bonus XP multiplier (1.10 = +10%) */
  bonus: number;
  /** When the bonus applies */
  applies: "morning" | "night" | "always" | "urgent";
  /** Progress key on profile.title_progress */
  progressKey: "morning_missions" | "night_missions" | "urgent_missions" | "streak";
  /** Goal value to unlock */
  goal: number;
  /** Human-readable unlock condition */
  condition: string;
}

export const TITLES: TitleDef[] = [
  {
    id: "early_bird",
    name: "Matutino",
    description: "+10% XP en tareas antes de las 12pm",
    icon: "sun",
    color: "#fbbf24",
    bonus: 1.10,
    applies: "morning",
    progressKey: "morning_missions",
    goal: 10,
    condition: "Completa 10 tareas antes de las 12pm",
  },
  {
    id: "night_owl",
    name: "Nocturno",
    description: "+10% XP en tareas después de las 8pm",
    icon: "moon",
    color: "#818cf8",
    bonus: 1.10,
    applies: "night",
    progressKey: "night_missions",
    goal: 10,
    condition: "Completa 10 tareas después de las 8pm",
  },
  {
    id: "unstoppable",
    name: "Constante",
    description: "+5% XP en todas las tareas",
    icon: "flame",
    color: "#f97316",
    bonus: 1.05,
    applies: "always",
    progressKey: "streak",
    goal: 7,
    condition: "Mantén una racha diaria de 7 días",
  },
  {
    id: "speedster",
    name: "Ágil",
    description: "+15% XP en tareas urgentes",
    icon: "bolt",
    color: "#06b6d4",
    bonus: 1.15,
    applies: "urgent",
    progressKey: "urgent_missions",
    goal: 20,
    condition: "Completa 20 tareas urgentes",
  },
];

export function getTitle(id: string | null | undefined): TitleDef | null {
  if (!id) return null;
  return TITLES.find((t) => t.id === id) ?? null;
}

export interface TitleProgress {
  morning_missions: number;
  night_missions: number;
  urgent_missions: number;
}

export const DEFAULT_TITLE_PROGRESS: TitleProgress = {
  morning_missions: 0,
  night_missions: 0,
  urgent_missions: 0,
};

/** Returns the slot type the completion contributes to, or null. */
export function classifyCompletion(date: Date, priority: TaskPriority) {
  const hour = date.getHours();
  return {
    morning: hour < 12,
    night: hour >= 20,
    urgent: priority === "urgent",
  };
}

/** Compute XP multiplier for an equipped title given the completion context. */
export function getXpBonus(
  equippedTitleId: string | null | undefined,
  ctx: { morning: boolean; night: boolean; urgent: boolean },
): number {
  const title = getTitle(equippedTitleId);
  if (!title) return 1;
  if (title.applies === "always") return title.bonus;
  if (title.applies === "morning" && ctx.morning) return title.bonus;
  if (title.applies === "night" && ctx.night) return title.bonus;
  if (title.applies === "urgent" && ctx.urgent) return title.bonus;
  return 1;
}

/** Increment progress counters and return newly unlocked title ids. */
export function bumpProgress(
  current: TitleProgress,
  ctx: { morning: boolean; night: boolean; urgent: boolean },
  alreadyUnlocked: string[],
  streak: number,
): { next: TitleProgress; newlyUnlocked: string[] } {
  const next: TitleProgress = {
    morning_missions: current.morning_missions + (ctx.morning ? 1 : 0),
    night_missions: current.night_missions + (ctx.night ? 1 : 0),
    urgent_missions: current.urgent_missions + (ctx.urgent ? 1 : 0),
  };
  const newlyUnlocked: string[] = [];
  for (const t of TITLES) {
    if (alreadyUnlocked.includes(t.id)) continue;
    let value = 0;
    if (t.progressKey === "streak") value = streak;
    else value = next[t.progressKey];
    if (value >= t.goal) newlyUnlocked.push(t.id);
  }
  return { next, newlyUnlocked };
}