import { CalendarDays, CircleUserRound, ListChecks, Trophy, Users, type LucideIcon } from "lucide-react";

export type SectionId = "tasks" | "calendar" | "progress" | "community" | "profile";

export interface SectionDef {
  id: SectionId;
  label: string;
  icon: LucideIcon;
}

export const SECTIONS: SectionDef[] = [
  { id: "tasks", label: "Tareas", icon: ListChecks },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "progress", label: "Progreso", icon: Trophy },
  { id: "community", label: "Comunidad", icon: Users },
  { id: "profile", label: "Perfil", icon: CircleUserRound },
];
