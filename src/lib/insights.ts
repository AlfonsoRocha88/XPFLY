import type { Stats } from "@/lib/stats";
import { SLOTS, WEEKDAYS, fmtHours } from "@/lib/stats";

export type InsightTone = "positive" | "neutral" | "attention";

export interface Insight {
  id: string;
  tone: InsightTone;
  /** Short headline with the key number, e.g. "Los martes rindes 40% más". */
  title: string;
  detail: string;
  /** Higher shows first. */
  weight: number;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/** Weekday with the highest average completions, compared with the rest of the week. */
function bestWeekday(s: Stats): Insight | null {
  const byWeekday = WEEKDAYS.map((w) => s.days.filter((d) => d.date.getDay() === w.d).map((d) => d.total));
  // Need at least two of each weekday to call a pattern.
  if (byWeekday.some((xs) => xs.length < 2)) return null;
  const avgs = byWeekday.map(mean);
  const best = avgs.indexOf(Math.max(...avgs));
  const others = mean(avgs.filter((_, i) => i !== best));
  if (avgs[best] < 1 || others <= 0 || avgs[best] / others < 1.25) return null;
  return {
    id: "best-weekday",
    tone: "positive",
    title: `Los ${WEEKDAYS[best].long} rindes ${pct(avgs[best] / others - 1)} más`,
    detail: `Completas ${avgs[best].toFixed(1)} en promedio ese día, contra ${others.toFixed(1)} el resto. Agenda ahí lo más importante.`,
    weight: 3,
  };
}

/** Time-of-day slot where most completions happen. */
function bestSlot(s: Stats): Insight | null {
  const totals = SLOTS.map((_, i) => s.heat.reduce((sum, row) => sum + row[i], 0));
  const all = totals.reduce((a, b) => a + b, 0);
  if (all < 8) return null;
  const i = totals.indexOf(Math.max(...totals));
  const share = totals[i] / all;
  if (share < 0.4) return null;
  return {
    id: "best-slot",
    tone: "neutral",
    title: `El ${pct(share)} de lo que terminas es por la ${SLOTS[i].label.toLowerCase()}`,
    detail: "Es tu franja más productiva. Protégela de reuniones y distracciones.",
    weight: 2,
  };
}

/** The habit with the lowest completion rate, if clearly behind. */
function habitAtRisk(s: Stats): Insight | null {
  const candidates = s.habits.filter((h) => h.due >= 4);
  if (!candidates.length) return null;
  const worst = candidates.reduce((a, b) => (b.rate < a.rate ? b : a));
  if (worst.rate >= 0.6) return null;
  return {
    id: "habit-risk",
    tone: "attention",
    title: `«${worst.title}» va en ${pct(worst.rate)}`,
    detail: `Lo hiciste ${worst.done} de ${worst.due} días. Prueba hacerlo más pequeño o moverlo a tu mejor franja.`,
    weight: 4,
  };
}

/** Change vs the previous period. */
function trend(s: Stats): Insight | null {
  if (s.prevCompleted < 5 || s.completed < 3) return null;
  const change = s.completed / s.prevCompleted - 1;
  if (Math.abs(change) < 0.15) return null;
  const up = change > 0;
  return {
    id: "trend",
    tone: up ? "positive" : "attention",
    title: up ? `${pct(change)} más tareas que el periodo anterior` : `${pct(-change)} menos tareas que el periodo anterior`,
    detail: up ? "Vas en buena dirección. Mantén el ritmo sin cargarte de más." : "Revisa si tus tareas son demasiado grandes o si hubo días sin plan.",
    weight: 3,
  };
}

/** Do nights with 7+ hours lead to more completions the next day? */
function sleepEffect(s: Stats): Insight | null {
  const good = s.sleepPairs.filter((p) => p.minutes >= 420).map((p) => p.total);
  const short = s.sleepPairs.filter((p) => p.minutes < 420).map((p) => p.total);
  if (good.length < 3 || short.length < 3) return null;
  const g = mean(good);
  const b = mean(short);
  if (b <= 0 || Math.abs(g / b - 1) < 0.2) return null;
  const better = g > b;
  return {
    id: "sleep-effect",
    tone: better ? "positive" : "neutral",
    title: better ? `Con 7 h o más de sueño completas ${pct(g / b - 1)} más` : "Dormir más no cambió tu productividad",
    detail: better
      ? `${g.toFixed(1)} tareas tras dormir bien contra ${b.toFixed(1)} tras dormir poco.`
      : `${g.toFixed(1)} contra ${b.toFixed(1)} tareas. Tu energía parece depender de otra cosa.`,
    weight: 5,
  };
}

/** Short sleep average. */
function sleepDebt(s: Stats): Insight | null {
  const logged = s.sleep.filter((d) => d.minutes != null).length;
  if (s.sleepAvg == null || logged < 4 || s.sleepAvg >= 420) return null;
  return {
    id: "sleep-debt",
    tone: "attention",
    title: `Duermes ${fmtHours(s.sleepAvg)} en promedio`,
    detail: "Menos de 7 horas de forma seguida reduce concentración y constancia.",
    weight: 3,
  };
}

/** Share of days with at least one completion. */
function consistency(s: Stats): Insight | null {
  if (s.days.length < 7) return null;
  const share = s.activeDays / s.days.length;
  if (share >= 0.85) {
    return { id: "consistency", tone: "positive", title: `Activo ${s.activeDays} de ${s.days.length} días`, detail: "Tu constancia es tu mayor fortaleza. Sigue así.", weight: 1 };
  }
  if (share < 0.5 && s.completed > 0) {
    return { id: "consistency", tone: "attention", title: `Solo ${s.activeDays} de ${s.days.length} días con avance`, detail: "Una tarea pequeña al día mantiene el hábito vivo.", weight: 2 };
  }
  return null;
}

const RULES = [sleepEffect, habitAtRisk, bestWeekday, trend, sleepDebt, bestSlot, consistency];

/** Up to `limit` findings, strongest first. Each rule returns null when the data can't support it. */
export function buildInsights(s: Stats, limit = 3): Insight[] {
  return RULES.map((r) => r(s))
    .filter((x): x is Insight => !!x)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
