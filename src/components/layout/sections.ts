import type { ComponentType } from "react";
import { CalendarNavIcon, CommunityNavIcon, ProfileNavIcon, ProgressNavIcon, TasksNavIcon } from "@/components/icons/NavIcons";
import { LeaguesNavIcon } from "@/components/icons/LeaguesNavIcon";

export type SectionId = "tasks" | "calendar" | "progress" | "leagues" | "community" | "profile";

export interface SectionDef {
  id: SectionId;
  label: string;
  /** Nav icon: our coloured glyphs (NavIcons / TrophyIcon); strokeWidth is accepted and ignored. */
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
}

export const SECTIONS: SectionDef[] = [
  { id: "tasks", label: "Tareas", icon: TasksNavIcon },
  { id: "calendar", label: "Calendario", icon: CalendarNavIcon },
  { id: "progress", label: "Progreso", icon: ProgressNavIcon },
  { id: "leagues", label: "Ligas", icon: LeaguesNavIcon },
  { id: "community", label: "Comunidad", icon: CommunityNavIcon },
  { id: "profile", label: "Perfil", icon: ProfileNavIcon },
];
