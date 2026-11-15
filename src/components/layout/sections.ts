import type { ComponentType } from "react";
import { CalendarDays, ChartNoAxesColumn, CircleUserRound, ListChecks, Users } from "lucide-react";
import { LeaguesNavIcon } from "@/components/icons/LeaguesNavIcon";

export type SectionId = "tasks" | "calendar" | "progress" | "leagues" | "community" | "profile";

export interface SectionDef {
  id: SectionId;
  label: string;
  /** Nav icon: lucide icons or our own (same className/strokeWidth contract). */
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
}

export const SECTIONS: SectionDef[] = [
  { id: "tasks", label: "Tareas", icon: ListChecks },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "progress", label: "Progreso", icon: ChartNoAxesColumn },
  { id: "leagues", label: "Ligas", icon: LeaguesNavIcon },
  { id: "community", label: "Comunidad", icon: Users },
  { id: "profile", label: "Perfil", icon: CircleUserRound },
];
