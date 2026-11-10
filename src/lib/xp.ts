import type { TaskPriority } from "@/lib/types";

/**
 * Base XP per priority. Must match XP_REWARDS in supabase/functions/award-xp/index.ts,
 * which is what actually pays. Streak, title and party bonuses are added on the server.
 */
export const XP_REWARDS: Record<TaskPriority, number> = {
  low: 20,
  medium: 35,
  high: 50,
  urgent: 75,
};

/** Daily tasks are always paid at the "urgent" rate. */
export const DAILY_PRIORITY: TaskPriority = "urgent";

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "Baja", color: "hsl(var(--priority-low))" },
  medium: { label: "Media", color: "hsl(var(--priority-medium))" },
  high: { label: "Alta", color: "hsl(var(--priority-high))" },
  urgent: { label: "Urgente", color: "hsl(var(--priority-urgent))" },
};

export const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
