export type PyroTip = { id: string; message: string };

export function pickContextualTip(args: {
  pathname: string;
  taskCount: number;
  urgentCount: number;
  dueTodayCount: number;
  dailyPending: number;
  statPoints: number;
  level: number;
  streak: number;
}): PyroTip | null {
  const { pathname, taskCount, urgentCount, dueTodayCount, dailyPending, statPoints, level, streak } = args;

  if (statPoints > 0) {
    return { id: "stat-points", message: `Tienes ${statPoints} punto${statPoints > 1 ? "s" : ""} de atributo sin gastar.` };
  }

  if (pathname.startsWith("/character")) {
    return { id: "char", message: "Sube tu stat dominante al 60% para desbloquear una clase." };
  }

  if (dailyPending > 0 && new Date().getHours() >= 18) {
    return { id: "daily-late", message: `Aún quedan ${dailyPending} misión(es) diaria(s) por hoy.` };
  }

  if (urgentCount > 0) {
    return { id: "urgent", message: `Hay ${urgentCount} misión(es) urgente(s) esperando.` };
  }

  if (dueTodayCount > 0) {
    return { id: "due-today", message: `${dueTodayCount} misión(es) vencen hoy.` };
  }

  if (taskCount === 0) {
    return { id: "empty", message: "No hay misiones todavía. ¿Creamos una?" };
  }

  if (streak >= 3) {
    return { id: "streak", message: `Racha de ${streak} días. No la rompas.` };
  }

  if (level <= 2) {
    return { id: "newbie", message: "Completa misiones para ganar XP y subir de nivel." };
  }

  return null;
}

export const COMPLETION_LINES = [
  "Otra menos.",
  "Listo.",
  "Bien.",
  "Hecho.",
  "Una menos en la lista.",
  "Eso fue rápido.",
  "Siguiente.",
];

export function randomLine(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}