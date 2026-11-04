import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  startOfDay,
  subDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import PyroSprite from "@/components/PyroSprite";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

interface Props {
  tasks: Task[];
  view: "stats" | "achievements";
}

const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

// Heatmap interpolation: red -> yellow -> green based on value vs avg.
// 0 missions = red, avg = yellow, 2*avg+ = green.
function heatColor(value: number, avg: number): string {
  const safeAvg = Math.max(avg, 0.5);
  const ratio = value / safeAvg; // 0=red, 1=yellow, 2+=green
  const t = Math.max(0, Math.min(2, ratio)) / 2; // 0..1
  // Lerp red(239,68,68) -> yellow(234,179,8) -> green(34,197,94)
  const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const k = t / 0.5;
    r = lerp(239, 234, k);
    g = lerp(68, 179, k);
    b = lerp(68, 8, k);
  } else {
    const k = (t - 0.5) / 0.5;
    r = lerp(234, 34, k);
    g = lerp(179, 197, k);
    b = lerp(8, 94, k);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

const AchievementsView = ({ tasks, view: tab }: Props) => {
  const { profile } = useProfile();

  const streak = profile?.daily_streak ?? 0;

  // Frozen state: freeze used today (yesterday's miss covered) and user hasn't
  // completed the daily yet today.
  const frozen = useMemo(() => {
    try {
      const flag = localStorage.getItem("pyroFreezeUsedDate");
      if (!flag) return false;
      const today = new Date().toISOString().slice(0, 10);
      if (flag !== today) return false;
      const dc = profile?.daily_completed_at as string | null | undefined;
      if (dc && dc.slice(0, 10) === today) return false;
      return true;
    } catch {
      return false;
    }
  }, [profile]);

  // Build per-day completion counts for the last 14 days.
  const dayCounts = useMemo(() => {
    const buckets = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = startOfDay(subDays(new Date(), i));
      buckets.set(d.toISOString(), 0);
    }
    for (const t of tasks) {
      if (t.status !== "done" || !t.completed_at) continue;
      const key = startOfDay(new Date(t.completed_at)).toISOString();
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    // Return oldest -> newest
    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([iso, count]) => ({ date: new Date(iso), count }));
  }, [tasks]);

  const last7 = dayCounts.slice(-7);
  const prev7 = dayCounts.slice(0, 7);
  const sum = (arr: { count: number }[]) => arr.reduce((s, d) => s + d.count, 0);
  const avgLast = sum(last7) / 7;
  const avgPrev = sum(prev7) / 7;

  const pctChange =
    avgPrev === 0
      ? avgLast > 0
        ? 100
        : 0
      : ((avgLast - avgPrev) / avgPrev) * 100;
  const trend: "up" | "down" | "flat" =
    Math.abs(pctChange) < 0.5 ? "flat" : pctChange > 0 ? "up" : "down";

  const maxCount = Math.max(1, ...last7.map((d) => d.count));

  // Map of yyyy-mm-dd -> completion count across ALL tasks (for calendar).
  const completionByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      if (t.status !== "done" || !t.completed_at) continue;
      const key = startOfDay(new Date(t.completed_at)).toISOString().slice(0, 10);
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [tasks]);

  return (
    <div className="flex flex-col gap-4">
      {tab === "achievements" ? (
        <AchievementsErrorBoundary>
          <AchievementsGrid />
        </AchievementsErrorBoundary>
      ) : (
        <>
          {/* Streak + Pyro */}
          <div className="surface flex items-center justify-center gap-6 py-5">
            <div className="flex flex-col items-start">
              <span className="eyebrow">Racha actual</span>
              <span className="text-6xl font-black leading-none text-foreground tabular-nums">
                {streak}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {streak === 1 ? "día" : "días"}
              </span>
            </div>
            <div className={cn("relative", frozen && "pyro-frozen-wrap")}>
              <PyroSprite size={96} mood={frozen ? "sleeping" : "idle"} />
              {frozen && <FrozenIce />}
            </div>
          </div>

          {/* Daily average — Apple Screen Time style */}
          <div className="surface p-5">
            <p className="eyebrow">Promedio diario</p>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-5xl font-black leading-none tabular-nums text-foreground">
                {avgLast.toFixed(1)}
              </span>
              <span
                className={cn(
                  "mb-1 inline-flex items-center gap-0.5 text-sm font-semibold",
                  trend === "up" && "text-[hsl(142,71%,45%)]",
                  trend === "down" && "text-[hsl(0,72%,55%)]",
                  trend === "flat" && "text-muted-foreground",
                )}
              >
                {trend === "up" && <ArrowUp className="h-4 w-4" />}
                {trend === "down" && <ArrowDown className="h-4 w-4" />}
                {trend === "flat" && <Minus className="h-4 w-4" />}
                {Math.abs(pctChange).toFixed(0)}%
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Misiones/día · últimos 7 días vs. 7 anteriores
            </p>
          </div>

          {/* Weekly bar chart */}
          <div className="surface p-5">
            <p className="eyebrow mb-4">Últimos 7 días</p>
            <div className="relative h-44">
              {/* Avg dashed line */}
              {avgLast > 0 && (
                <div
                  className="absolute inset-x-0 flex items-center"
                  style={{
                    bottom: `${(avgLast / maxCount) * 100}%`,
                  }}
                >
                  <div
                    className="h-px flex-1"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, hsl(var(--primary)) 0 6px, transparent 6px 12px)",
                    }}
                  />
                  <span className="ml-2 text-xs font-bold text-primary">prom.</span>
                </div>
              )}
              <div className="flex h-full items-end gap-2">
                {last7.map((d, i) => {
                  const h = (d.count / maxCount) * 100;
                  const color = heatColor(d.count, avgLast);
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${Math.max(h, d.count > 0 ? 4 : 2)}%`,
                            background: color,
                            opacity: d.count === 0 ? 0.35 : 1,
                          }}
                          title={`${d.count} misiones`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {DAY_LABELS[d.date.getDay()]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Streak calendar */}
          <StreakCalendar completionByDay={completionByDay} />
        </>
      )}
    </div>
  );
};

// Spiky ice block around Pyro using SVG.
const FrozenIce = () => (
  <svg
    viewBox="0 0 120 120"
    className="pointer-events-none absolute inset-0 h-full w-full"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="ice-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <polygon
      points="60,4 78,18 96,12 92,34 112,42 96,58 116,72 92,80 100,104 76,96 60,116 44,96 20,104 28,80 4,72 24,58 8,42 28,34 24,12 42,18"
      fill="url(#ice-grad)"
      stroke="#e0f2fe"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export default AchievementsView;

// ---------------- Achievements Grid (Logros) ----------------

type AchLevel = 0 | 1 | 2 | 3; // 0 = locked, 1=bronze, 2=silver, 3=gold

interface Achievement {
  id: string;
  name: string;
  icon: (props: { className?: string }) => JSX.Element;
  level: AchLevel;
  progress: number;
  thresholds: [number, number, number]; // I, II, III
  descriptions: [string, string, string];
  perks: [string, string, string];
}

// Defensive fallback icon — used if an achievement references a missing icon.
const FallbackIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="32" cy="32" r="20" />
    <path d="M32 22 v12 M32 40 v2" strokeWidth={2.25} />
  </svg>
);

// Error boundary so a runtime error inside the grid never blanks the screen.
class AchievementsErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error("[AchievementsGrid] crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No se pudieron cargar los logros. Inténtalo de nuevo más tarde.
        </div>
      );
    }
    return this.props.children;
  }
}

const ICON_STROKE = "currentColor";

const svgProps = {
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: ICON_STROKE,
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = {
  // Mountain peak with half-sun rising behind it + radiating rays.
  Madrugador: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      {/* Half sun */}
      <path d="M20 36 a12 12 0 0 1 24 0" />
      {/* Rays */}
      <path d="M32 16 v-4 M16 36 h-4 M48 36 h4 M20.5 24.5 l-2.8 -2.8 M43.5 24.5 l2.8 -2.8" />
      {/* Mountain peak in front */}
      <path d="M10 50 L26 28 L38 44 L46 36 L56 50" />
      {/* Ground */}
      <path d="M8 52 H56" />
    </svg>
  ),
  // Crescent moon + 3 small 4-pointed stars.
  Nocturno: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M44 14 a20 20 0 1 0 6 32 a16 16 0 0 1 -6 -32 z" />
      {/* Star large */}
      <path d="M18 16 v6 M15 19 h6" />
      {/* Star medium */}
      <path d="M14 38 v4 M12 40 h4" />
      {/* Star small */}
      <path d="M24 50 v3 M22.5 51.5 h3" />
    </svg>
  ),
  // Single upward flame with two smaller base flames.
  Imparable: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 8 C 38 18 46 24 46 36 C 46 44 40 52 32 52 C 24 52 18 44 18 36 C 18 30 22 27 25 24 C 26 28 28 30 30 30 C 30 24 28 18 32 8 Z" />
      <path d="M18 44 c-3 1 -5 4 -5 8" />
      <path d="M46 44 c3 1 5 4 5 8" />
    </svg>
  ),
  // Roman shield with a diagonal laurel branch.
  Centurion: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M14 12 h36 v22 c0 12 -10 20 -18 22 c-8 -2 -18 -10 -18 -22 z" />
      {/* Laurel stem */}
      <path d="M18 50 L48 18" />
      {/* Leaves along stem */}
      <path d="M24 44 c-3 0 -5 -2 -5 -5 c3 0 5 2 5 5 z" />
      <path d="M30 38 c-3 0 -5 -2 -5 -5 c3 0 5 2 5 5 z" />
      <path d="M36 32 c-3 0 -5 -2 -5 -5 c3 0 5 2 5 5 z" />
      <path d="M42 26 c-3 0 -5 -2 -5 -5 c3 0 5 2 5 5 z" />
    </svg>
  ),
  // Bold checkmark inside a thin circle with 8 sun rays.
  DiaPerfecto: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="32" cy="32" r="14" />
      <path d="M25 32 l5 5 l9 -10" strokeWidth={2.25} />
      {/* 8 sun rays */}
      <path d="M32 10 v4 M32 50 v4 M10 32 h4 M50 32 h4 M16.5 16.5 l2.8 2.8 M44.7 44.7 l2.8 2.8 M16.5 47.5 l2.8 -2.8 M44.7 19.3 l2.8 -2.8" />
    </svg>
  ),
  // Single geometric lightning bolt.
  Atleta: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M36 6 L16 34 H28 L24 58 L48 28 H34 L40 6 Z" />
    </svg>
  ),
  // Open book with bookmark ribbon and subtle page lines.
  Erudito: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M8 16 h18 c3 0 6 2 6 6 v32 c0 -3 -3 -5 -6 -5 H8 z" />
      <path d="M56 16 h-18 c-3 0 -6 2 -6 6 v32 c0 -3 3 -5 6 -5 h18 z" />
      {/* Bookmark ribbon */}
      <path d="M44 16 v14 l4 -3 l4 3 v-14" />
      {/* Page lines */}
      <path d="M13 26 h11 M13 32 h11 M13 38 h9" />
      <path d="M40 38 h11 M40 32 h11" />
    </svg>
  ),
  // Flame with two small hearts floating above.
  PyroFriend: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 22 C 37 30 44 35 44 44 C 44 51 39 56 32 56 C 25 56 20 51 20 44 C 20 39 23 37 26 34 C 27 37 28 39 30 39 C 30 34 28 30 32 22 Z" />
      {/* Left heart */}
      <path d="M19 12 c-2 -2 -5 -1 -5 2 c0 3 5 6 5 6 c0 0 5 -3 5 -6 c0 -3 -3 -4 -5 -2 z" />
      {/* Right heart */}
      <path d="M45 6 c-1.5 -1.5 -4 -0.8 -4 1.5 c0 2.3 4 4.5 4 4.5 c0 0 4 -2.2 4 -4.5 c0 -2.3 -2.5 -3 -4 -1.5 z" />
    </svg>
  ),
  // Trophy cup with arrow above the opening.
  Ascenso: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      {/* Cup */}
      <path d="M20 22 h24 v8 c0 8 -5 14 -12 14 s-12 -6 -12 -14 z" />
      {/* Handles */}
      <path d="M20 24 c-5 0 -7 3 -7 6 c0 3 2 6 7 6" />
      <path d="M44 24 c5 0 7 3 7 6 c0 3 -2 6 -7 6" />
      {/* Stem + base */}
      <path d="M28 44 v6 h8 v-6" />
      <path d="M22 54 h20" />
      {/* Arrow above cup */}
      <path d="M32 18 V6 M26 12 l6 -6 l6 6" />
    </svg>
  ),
  // Hexagon containing a 6-pointed star (two overlaid triangles).
  Fundador: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <polygon points="32,6 54,18 54,42 32,54 10,42 10,18" />
      <polygon points="32,18 44,38 20,38" />
      <polygon points="32,46 20,26 44,26" />
    </svg>
  ),
  // Alarm clock with a small crescent moon beside it.
  Las3am: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="30" cy="34" r="14" />
      <path d="M30 34 v-6 M30 34 l4 4" />
      <path d="M20 18 l-3 -4 M40 18 l3 -4" />
      <path d="M48 20 a8 8 0 0 0 0 12" />
    </svg>
  ),
  // Sun at zenith with radiating rays and a horizon arc.
  Mediodia: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="32" cy="28" r="10" />
      <path d="M32 10 v-4 M32 46 v4 M10 28 h-4 M54 28 h4 M16.5 12.5 l2.8 2.8 M44.7 40.7 l2.8 2.8 M16.5 43.5 l2.8 -2.8 M44.7 15.3 l2.8 -2.8" />
      <path d="M12 50 h40" />
    </svg>
  ),
  // Clock face with a circular arrow wrapping around.
  Consistente: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="32" cy="32" r="14" />
      <path d="M32 22 v10 l6 4" />
      <path d="M18 16 a20 20 0 1 1 -4 16" />
      <path d="M12 28 l4 -4 l2 6" />
    </svg>
  ),
  // Exclamation mark centered inside a shield outline.
  SinExcusas: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M14 12 h36 v22 c0 12 -10 20 -18 22 c-8 -2 -18 -10 -18 -22 z" />
      <path d="M32 22 v12 M32 40 v2" strokeWidth={2.25} />
    </svg>
  ),
  // Stopwatch with three trailing speed lines.
  Velocista: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="30" cy="34" r="14" />
      <path d="M30 28 v6 l4 3" />
      <path d="M30 16 v-4 M24 16 h12" />
      <path d="M48 26 h8 M50 32 h6 M48 38 h8" />
    </svg>
  ),
  // Four small squares arranged in a 2x2 grid.
  Multitarea: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <rect x="14" y="14" width="14" height="14" rx="2" />
      <rect x="36" y="14" width="14" height="14" rx="2" />
      <rect x="14" y="36" width="14" height="14" rx="2" />
      <rect x="36" y="36" width="14" height="14" rx="2" />
    </svg>
  ),
  // Phoenix rising — sweeping wing curves with a flame tip.
  Resurreccionado: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 8 c6 8 14 14 14 26 c0 6 -4 10 -8 10 c-2 0 -4 -2 -6 -4 c-2 2 -4 4 -6 4 c-4 0 -8 -4 -8 -10 c0 -12 8 -18 14 -26 z" />
      <path d="M20 48 c-4 4 -4 8 0 10" />
      <path d="M44 48 c4 4 4 8 0 10" />
      <path d="M28 54 l4 6 l4 -6" />
    </svg>
  ),
  // Geometric six-pointed ice crystal / snowflake.
  CongeladorPro: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 8 v48 M8 32 h48" />
      <path d="M14 14 l36 36 M14 50 l36 -36" />
      <path d="M22 8 l10 10 l10 -10 M22 56 l10 -10 l10 10 M8 22 l10 10 l-10 10 M56 22 l-10 10 l10 10" />
    </svg>
  ),
  // Seven small filled circles in a horizontal row.
  SemanaPerfecta: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="8" cy="32" r="4" />
      <circle cx="17.3" cy="32" r="4" />
      <circle cx="26.7" cy="32" r="4" />
      <circle cx="36" cy="32" r="4" />
      <circle cx="45.3" cy="32" r="4" />
      <circle cx="54.7" cy="32" r="4" />
      <circle cx="64" cy="32" r="4" />
    </svg>
  ),
  // Infinity symbol with a small flame inside.
  ElEterno: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M18 32 c0 -8 8 -10 14 -2 c6 -8 14 -6 14 2 s-8 10 -14 2 c-6 8 -14 6 -14 -2 z" />
      <path d="M30 26 c2 2 4 4 4 6 c0 2 -2 4 -4 2 c-2 2 -4 0 -4 -2 c0 -2 2 -4 4 -6 z" />
    </svg>
  ),
  // Flame with an exclamation mark inside.
  Urgente: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 10 c6 8 12 14 12 24 c0 8 -6 14 -12 14 s-12 -6 -12 -14 c0 -10 6 -16 12 -24 z" />
      <path d="M32 28 v8 M32 40 v2" strokeWidth={2.25} />
    </svg>
  ),
  // Three vertical bars increasing in height — upward bar chart.
  AltoRendimiento: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M14 48 h8 v-20 h-8 z" />
      <path d="M28 48 h8 v-32 h-8 z" />
      <path d="M42 48 h8 v-44 h-8 z" />
    </svg>
  ),
  // Diamond outline with a centered checkmark.
  Perfeccionista: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <polygon points="32,8 54,32 32,56 10,32" />
      <path d="M24 32 l5 5 l11 -11" strokeWidth={2.25} />
    </svg>
  ),
  // Two simple figure silhouettes with a plus sign.
  Reclutador: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="20" cy="16" r="5" />
      <path d="M12 40 c0 -8 4 -12 8 -12 s8 4 8 12" />
      <circle cx="44" cy="16" r="5" />
      <path d="M36 40 c0 -8 4 -12 8 -12 s8 4 8 12" />
      <path d="M32 20 v8 M28 24 h8" strokeWidth={2.25} />
    </svg>
  ),
  // Crown sitting above a shield.
  LiderNato: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M18 10 l4 6 l4 -6 l4 6 l4 -6 l4 6 l-3 8 h-14 z" />
      <path d="M20 24 h24 v18 c0 8 -6 14 -12 14 s-12 -6 -12 -14 z" />
    </svg>
  ),
  // Three podium steps with a star centered above.
  ClanDelAno: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M12 40 h12 v12 h-12 z" />
      <path d="M26 32 h12 v20 h-12 z" />
      <path d="M40 36 h12 v16 h-12 z" />
      <polygon points="32,10 35,18 44,18 37,24 40,32 32,26 24,32 27,24 20,18 29,18" />
    </svg>
  ),
  // Heart with an upward arrow emerging from its top.
  Motivador: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 52 c-12 -8 -20 -16 -20 -24 c0 -6 4 -10 10 -10 c4 0 8 2 10 6 c2 -4 6 -6 10 -6 c6 0 10 4 10 10 c0 8 -8 16 -20 24 z" />
      <path d="M32 16 v14 M26 22 l6 -6 l6 6" />
    </svg>
  ),
  // Trophy with two crossed swords behind it.
  Competidor: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M14 16 l12 14 M50 16 l-12 14" />
      <path d="M22 22 h20 v6 c0 6 -4 10 -10 10 s-10 -4 -10 -10 z" />
      <path d="M18 22 c-4 0 -6 2 -6 5 c0 3 2 5 6 5" />
      <path d="M46 22 c4 0 6 2 6 5 c0 3 -2 5 -6 5" />
      <path d="M28 38 v6 h8 v-6" />
      <path d="M24 48 h16" />
    </svg>
  ),
  // Trophy cup with a small circular number badge.
  ColeccionistaCopas: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M20 18 h24 v8 c0 8 -5 14 -12 14 s-12 -6 -12 -14 z" />
      <path d="M20 20 c-5 0 -7 3 -7 6 c0 3 2 6 7 6" />
      <path d="M44 20 c5 0 7 3 7 6 c0 3 -2 6 -7 6" />
      <path d="M28 40 v6 h8 v-6" />
      <path d="M24 50 h20" />
      <circle cx="48" cy="14" r="6" />
      <path d="M45 14 h6 M48 11 v6" strokeWidth={1.5} />
    </svg>
  ),
  // Shield outline with a centered star.
  Invicto: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M14 12 h36 v22 c0 12 -10 20 -18 22 c-8 -2 -18 -10 -18 -22 z" />
      <polygon points="32,22 35,29 42,29 37,34 39,41 32,36 25,41 27,34 22,29 29,29" />
    </svg>
  ),
  // Flame beside a simple fork.
  ElQueAlimenta: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M18 18 c4 6 8 10 8 18 c0 6 -4 10 -8 10 s-8 -4 -8 -10 c0 -8 4 -12 8 -18 z" />
      <path d="M40 16 v14 M36 16 v10 M44 16 v10" />
      <path d="M40 32 v14 M38 46 h4" />
    </svg>
  ),
  // Flame rising from scattered ash dots.
  Resucitador: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 14 c6 8 12 14 12 24 c0 8 -6 14 -12 14 s-12 -6 -12 -14 c0 -10 6 -16 12 -24 z" />
      <circle cx="20" cy="52" r="1.5" />
      <circle cx="26" cy="56" r="1.5" />
      <circle cx="38" cy="55" r="1.5" />
      <circle cx="44" cy="51" r="1.5" />
      <circle cx="32" cy="58" r="1.5" />
    </svg>
  ),
  // Stylised lotus flower with symmetrical petals.
  Monje: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 48 c-6 -6 -10 -12 -10 -18 c0 -4 2 -6 4 -6 c3 0 6 4 6 8 c0 -4 3 -8 6 -8 c2 0 4 2 4 6 c0 6 -4 12 -10 18 z" />
      <path d="M32 48 c-8 -2 -14 -6 -18 -12 c6 2 12 2 18 0 c6 2 12 2 18 0 c-4 6 -10 10 -18 12 z" />
      <path d="M32 22 v8" />
    </svg>
  ),
  // Coin with an upward trend line.
  Financiero: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="32" cy="32" r="16" />
      <path d="M28 24 v16 M28 28 h4" strokeWidth={2} />
      <path d="M20 40 l8 -8 l6 4 l8 -10" />
    </svg>
  ),
  // Open book with a bookmark ribbon hanging down.
  Lector: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M8 16 h20 c3 0 6 2 6 6 v28 c0 -3 -3 -5 -6 -5 H8 z" />
      <path d="M56 16 h-20 c-3 0 -6 2 -6 6 v28 c0 -3 3 -5 6 -5 h20 z" />
      <path d="M36 16 v28 l4 -3 l4 3 v-28" />
      <path d="M13 26 h11 M13 32 h11 M13 38 h9" />
      <path d="M40 38 h11 M40 32 h11" />
    </svg>
  ),
  // Phone outline with an X mark on its screen.
  Minimalista: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <rect x="18" y="8" width="28" height="48" rx="4" />
      <path d="M24 24 l16 16 M24 40 l16 -16" strokeWidth={2.25} />
    </svg>
  ),
  // Apple shape with a small leaf.
  Nutricionista: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 18 c6 -2 14 2 14 12 c0 10 -8 20 -14 22 c-6 -2 -14 -12 -14 -22 c0 -10 8 -14 14 -12 z" />
      <path d="M32 18 c0 -4 2 -8 6 -10" />
      <path d="M34 16 c2 -2 4 -2 6 -1" />
    </svg>
  ),
  // Crescent moon with two small Z letters floating.
  ElQueDescansa: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M38 14 a18 18 0 1 0 6 32 a14 14 0 0 1 -6 -32 z" />
      <path d="M46 18 h4 l-4 4 h4" />
      <path d="M50 26 h3 l-3 3 h3" />
    </svg>
  ),
  // Open treasure chest with its lid raised.
  AbreCofres: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M10 36 h44 v14 c0 4 -4 8 -10 8 h-24 c-6 0 -10 -4 -10 -8 z" />
      <path d="M10 36 l8 -18 h28 l8 18" />
      <path d="M18 18 l-4 18 M46 18 l4 18" />
      <circle cx="32" cy="42" r="3" />
    </svg>
  ),
  // Treasure chest with a small ice crystal on top.
  Suertudo: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M12 32 h40 v16 c0 4 -4 8 -10 8 h-20 c-6 0 -10 -4 -10 -8 z" />
      <path d="M12 32 l6 -14 h28 l6 14" />
      <circle cx="32" cy="38" r="3" />
      <path d="M32 6 v10 M26 10 l6 6 l6 -6 M26 14 l6 -6 l6 6" />
    </svg>
  ),
  // Sun circle with a bold checkmark inside.
  DiaPerfectoTotal: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="32" cy="32" r="14" />
      <path d="M25 32 l5 5 l9 -10" strokeWidth={2.25} />
      <path d="M32 10 v4 M32 50 v4 M10 32 h4 M50 32 h4 M16.5 16.5 l2.8 2.8 M44.7 44.7 l2.8 2.8 M16.5 47.5 l2.8 -2.8 M44.7 19.3 l2.8 -2.8" />
    </svg>
  ),
  // Calendar page with a star in the center.
  MesPerfecto: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <rect x="12" y="10" width="40" height="44" rx="3" />
      <path d="M12 20 h40 M22 10 v10 M42 10 v10" />
      <path d="M18 30 h6 M18 36 h6 M18 42 h6 M18 48 h6" />
      <path d="M30 30 h6 M30 36 h6 M30 42 h6 M30 48 h6" />
      <path d="M42 30 h6 M42 36 h6 M42 42 h6 M42 48 h6" />
      <polygon points="32,24 34,29 39,29 35,32 37,37 32,34 27,37 29,32 25,29 30,29" />
    </svg>
  ),
  // Two interlocking chain links.
  Constante: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <ellipse cx="24" cy="28" rx="10" ry="14" transform="rotate(-30 24 28)" />
      <ellipse cx="40" cy="36" rx="10" ry="14" transform="rotate(30 40 36)" />
    </svg>
  ),
  // Owl face with large circular eyes and a small moon behind.
  ElInsomne: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M42 14 a16 16 0 0 0 0 28" />
      <path d="M18 22 c-4 2 -6 6 -6 10 c0 8 6 14 14 14 h8 c8 0 14 -6 14 -14 c0 -4 -2 -8 -6 -10" />
      <circle cx="24" cy="32" r="5" />
      <circle cx="40" cy="32" r="5" />
      <path d="M32 38 l-3 4 h6 z" />
      <path d="M14 18 l4 2 M14 38 l4 -2" />
    </svg>
  ),
  // Calendar page showing "M" with a lightning bolt.
  LunesDeTerror: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <rect x="14" y="8" width="36" height="48" rx="3" />
      <path d="M14 18 h36" />
      <path d="M22 8 v10 M42 8 v10" />
      <path d="M20 32 h6 M20 38 h6 M20 44 h6" />
      <path d="M34 30 l-4 10 h6 l-4 10" />
    </svg>
  ),
  // Simple running figure with three trailing motion lines.
  SpeedRun: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <circle cx="22" cy="14" r="4" />
      <path d="M22 20 l8 4 l-4 8 l-6 -2" />
      <path d="M18 28 l-6 8 M26 32 l6 6" />
      <path d="M14 18 h-6 M16 14 h-8 M12 22 h-6" />
    </svg>
  ),
  // Door slightly ajar with light rays emanating from the gap.
  ElOlvidado: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <rect x="12" y="8" width="26" height="48" rx="2" />
      <path d="M38 8 l8 4 v40 l-8 4 z" />
      <path d="M38 8 l14 -6 v48 l-14 6" />
      <circle cx="34" cy="32" r="2" />
    </svg>
  ),
  // Flame outline with a small heart centered inside.
  PyrosFavorite: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M32 10 c6 8 12 14 12 24 c0 8 -6 14 -12 14 s-12 -6 -12 -14 c0 -10 6 -16 12 -24 z" />
      <path d="M32 30 c-3 -3 -7 -2 -7 2 c0 3 7 7 7 7 c0 0 7 -4 7 -7 c0 -4 -4 -5 -7 -2 z" />
    </svg>
  ),
  // Sunrise with a small clock face showing 5 AM.
  ElTempraneroExtremo: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <path d="M12 44 h40" />
      <path d="M16 38 a16 16 0 0 1 32 0" />
      <path d="M32 16 v-4 M16 32 h-4 M48 32 h4 M20 20 l-2.8 -2.8 M44 20 l2.8 -2.8" />
      <circle cx="48" cy="16" r="7" />
      <path d="M48 13 v3 l2 2" />
    </svg>
  ),
  // Single footprint / shoe sole outline.
  PrimerPaso: ({ className }: { className?: string }) => (
    <svg {...svgProps} className={className}>
      <ellipse cx="32" cy="16" rx="8" ry="10" />
      <path d="M24 28 c-6 0 -10 4 -10 10 c0 8 8 14 18 14 s18 -6 18 -14 c0 -6 -4 -10 -10 -10 z" />
      <path d="M26 36 h4 M34 36 h4 M28 42 h4 M34 42 h4" />
    </svg>
  ),
};

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "madrugador",
    name: "Madrugador",
    icon: Icon.Madrugador,
    level: 1,
    progress: 18,
    thresholds: [10, 50, 200],
    descriptions: [
      "Completa 10 misiones antes de las 9 AM",
      "Completa 50 misiones antes de las 9 AM",
      "Completa 200 misiones antes de las 9 AM",
    ],
    perks: ["+×0.05 XP matutino", "+×0.10 XP matutino", "+×0.20 XP matutino"],
  },
  {
    id: "nocturno",
    name: "Nocturno",
    icon: Icon.Nocturno,
    level: 0,
    progress: 4,
    thresholds: [10, 50, 200],
    descriptions: [
      "Completa 10 misiones después de las 10 PM",
      "Completa 50 misiones después de las 10 PM",
      "Completa 200 misiones después de las 10 PM",
    ],
    perks: ["+×0.05 XP nocturno", "+×0.10 XP nocturno", "+×0.20 XP nocturno"],
  },
  {
    id: "imparable",
    name: "Imparable",
    icon: Icon.Imparable,
    level: 2,
    progress: 42,
    thresholds: [7, 30, 100],
    descriptions: ["Racha de 7 días", "Racha de 30 días", "Racha de 100 días"],
    perks: ["+×0.1 XP por misión", "+×0.2 XP por misión", "+×0.3 XP por misión"],
  },
  {
    id: "centurion",
    name: "Centurión",
    icon: Icon.Centurion,
    level: 3,
    progress: 312,
    thresholds: [10, 50, 100],
    descriptions: ["Completa 10 misiones", "Completa 50 misiones", "Completa 100 misiones"],
    perks: ["+10 XP bonus", "+50 XP bonus", "+150 XP bonus"],
  },
  {
    id: "dia-perfecto",
    name: "Día Perfecto",
    icon: Icon.DiaPerfecto,
    level: 1,
    progress: 3,
    thresholds: [1, 7, 30],
    descriptions: [
      "Completa todas tus misiones en 1 día",
      "7 días perfectos",
      "30 días perfectos",
    ],
    perks: ["+×0.05 XP diario", "+×0.10 XP diario", "+×0.25 XP diario"],
  },
  {
    id: "atleta",
    name: "Atleta",
    icon: Icon.Atleta,
    level: 0,
    progress: 2,
    thresholds: [5, 25, 100],
    descriptions: [
      "Completa 5 misiones de ejercicio",
      "Completa 25 misiones de ejercicio",
      "Completa 100 misiones de ejercicio",
    ],
    perks: ["+×0.05 XP físico", "+×0.10 XP físico", "+×0.20 XP físico"],
  },
  {
    id: "erudito",
    name: "Erudito",
    icon: Icon.Erudito,
    level: 2,
    progress: 31,
    thresholds: [5, 25, 100],
    descriptions: [
      "Completa 5 misiones de estudio",
      "Completa 25 misiones de estudio",
      "Completa 100 misiones de estudio",
    ],
    perks: ["+×0.05 XP mental", "+×0.10 XP mental", "+×0.20 XP mental"],
  },
  {
    id: "pyro-friend",
    name: "Mejor Amigo de Pyro",
    icon: Icon.PyroFriend,
    level: 1,
    progress: 12,
    thresholds: [10, 50, 200],
    descriptions: [
      "Alimenta a Pyro 10 veces",
      "Alimenta a Pyro 50 veces",
      "Alimenta a Pyro 200 veces",
    ],
    perks: ["+1 hambre máx.", "+2 hambre máx.", "Pyro nunca tiene hambre"],
  },
  {
    id: "ascenso",
    name: "Ascenso",
    icon: Icon.Ascenso,
    level: 0,
    progress: 1,
    thresholds: [5, 15, 30],
    descriptions: ["Sube al nivel 5", "Sube al nivel 15", "Sube al nivel 30"],
    perks: ["+1 punto de stat", "+3 puntos de stat", "+10 puntos de stat"],
  },
  {
    id: "fundador",
    name: "Fundador",
    icon: Icon.Fundador,
    level: 3,
    progress: 1,
    thresholds: [1, 1, 1],
    descriptions: [
      "Únete a la beta",
      "Apoya el desarrollo",
      "Miembro fundador permanente",
    ],
    perks: ["Título Fundador", "Emblema dorado", "Acceso vitalicio"],
  },
  {
    id: "las-3am",
    name: "El de las 3am",
    icon: Icon.Las3am,
    level: 0,
    progress: 0,
    thresholds: [1, 3, 5],
    descriptions: [
      "Completa 1 misión entre las 2–4 AM",
      "Completa 3 misiones entre las 2–4 AM",
      "Completa 5 misiones entre las 2–4 AM",
    ],
    perks: ["+×0.05 XP nocturno", "+×0.10 XP nocturno", "+×0.20 XP nocturno"],
  },
  {
    id: "mediodia",
    name: "Mediodía",
    icon: Icon.Mediodia,
    level: 0,
    progress: 0,
    thresholds: [10, 50, 100],
    descriptions: [
      "Completa 10 misiones entre las 12–2 PM",
      "Completa 50 misiones entre las 12–2 PM",
      "Completa 100 misiones entre las 12–2 PM",
    ],
    perks: ["+×0.05 XP diurno", "+×0.10 XP diurno", "+×0.20 XP diurno"],
  },
  {
    id: "consistente",
    name: "Consistente",
    icon: Icon.Consistente,
    level: 0,
    progress: 0,
    thresholds: [1, 3, 5],
    descriptions: [
      "Completa misiones a la misma hora 7 días",
      "Completa misiones a la misma hora 14 días",
      "Completa misiones a la misma hora 30 días",
    ],
    perks: ["+×0.05 XP regularidad", "+×0.10 XP regularidad", "+×0.20 XP regularidad"],
  },
  {
    id: "sin-excusas",
    name: "Sin Excusas",
    icon: Icon.SinExcusas,
    level: 0,
    progress: 0,
    thresholds: [5, 20, 50],
    descriptions: [
      "Completa 5 misiones urgentes el mismo día",
      "Completa 20 misiones urgentes el mismo día",
      "Completa 50 misiones urgentes el mismo día",
    ],
    perks: ["+5 XP urgente", "+10 XP urgente", "+20 XP urgente"],
  },
  {
    id: "velocista",
    name: "Velocista",
    icon: Icon.Velocista,
    level: 0,
    progress: 0,
    thresholds: [1, 10, 25],
    descriptions: [
      "Completa 3 misiones en menos de 1 hora",
      "Completa 10 ráfagas de 3 misiones en 1 hora",
      "Completa 25 ráfagas de 3 misiones en 1 hora",
    ],
    perks: ["+×0.05 XP velocidad", "+×0.10 XP velocidad", "+×0.20 XP velocidad"],
  },
  {
    id: "multitarea",
    name: "Multitarea",
    icon: Icon.Multitarea,
    level: 0,
    progress: 0,
    thresholds: [1, 10, 30],
    descriptions: [
      "4 categorías distintas completadas en 1 día",
      "10 días con 4+ categorías completadas",
      "30 días con 4+ categorías completadas",
    ],
    perks: ["+5 XP variedad", "+10 XP variedad", "+20 XP variedad"],
  },
  {
    id: "resurreccionado",
    name: "Resurreccionado",
    icon: Icon.Resurreccionado,
    level: 0,
    progress: 0,
    thresholds: [1, 3, 5],
    descriptions: [
      "Recupera tu racha en 24 horas tras perderla",
      "Recupera tu racha 3 veces",
      "Recupera tu racha 5 veces",
    ],
    perks: ["+10 XP recuperación", "+20 XP recuperación", "+50 XP recuperación"],
  },
  {
    id: "congelador-pro",
    name: "Congelador Pro",
    icon: Icon.CongeladorPro,
    level: 0,
    progress: 0,
    thresholds: [1, 5, 10],
    descriptions: [
      "Usa 1 congelador de racha",
      "Usa 5 congeladores de racha",
      "Usa 10 congeladores de racha",
    ],
    perks: ["+1 congelador extra", "+2 congeladores extra", "+5 congeladores extra"],
  },
  {
    id: "semana-perfecta",
    name: "Semana Perfecta",
    icon: Icon.SemanaPerfecta,
    level: 0,
    progress: 0,
    thresholds: [1, 4, 12],
    descriptions: [
      "7 días seguidos sin usar congelador",
      "4 semanas perfectas",
      "12 semanas perfectas",
    ],
    perks: ["+×0.05 XP racha", "+×0.10 XP racha", "+×0.20 XP racha"],
  },
  {
    id: "el-eterno",
    name: "El Eterno",
    icon: Icon.ElEterno,
    level: 0,
    progress: 0,
    thresholds: [30, 100, 365],
    descriptions: [
      "Racha de 30 días",
      "Racha de 100 días",
      "Racha de 365 días",
    ],
    perks: ["+×0.10 XP eterno", "+×0.20 XP eterno", "+×0.50 XP eterno"],
  },
  {
    id: "urgente",
    name: "Urgente",
    icon: Icon.Urgente,
    level: 0,
    progress: 0,
    thresholds: [10, 50, 150],
    descriptions: [
      "Completa 10 misiones urgentes",
      "Completa 50 misiones urgentes",
      "Completa 150 misiones urgentes",
    ],
    perks: ["+×0.05 XP urgente", "+×0.10 XP urgente", "+×0.20 XP urgente"],
  },
  {
    id: "alto-rendimiento",
    name: "Alto Rendimiento",
    icon: Icon.AltoRendimiento,
    level: 0,
    progress: 0,
    thresholds: [10, 50, 150],
    descriptions: [
      "Completa 10 misiones de alta prioridad",
      "Completa 50 misiones de alta prioridad",
      "Completa 150 misiones de alta prioridad",
    ],
    perks: ["+×0.05 XP prioridad", "+×0.10 XP prioridad", "+×0.20 XP prioridad"],
  },
  {
    id: "perfeccionista",
    name: "Perfeccionista",
    icon: Icon.Perfeccionista,
    level: 0,
    progress: 0,
    thresholds: [5, 20, 50],
    descriptions: [
      "Completa todas las urgentes+altas en 1 día",
      "20 días con todas las urgentes+altas hechas",
      "50 días con todas las urgentes+altas hechas",
    ],
    perks: ["+10 XP perfección", "+25 XP perfección", "+50 XP perfección"],
  },
  {
    id: "reclutador",
    name: "Reclutador",
    icon: Icon.Reclutador,
    level: 0,
    progress: 0,
    thresholds: [1, 5, 10],
    descriptions: [
      "Añade 1 amigo",
      "Añade 5 amigos",
      "Añade 10 amigos",
    ],
    perks: ["+1 slot de amigo", "+3 slots de amigo", "+5 slots de amigo"],
  },
  {
    id: "lider-nato",
    name: "Líder Nato",
    icon: Icon.LiderNato,
    level: 0,
    progress: 0,
    thresholds: [1, 1, 1],
    descriptions: [
      "Crea tu primer clan",
      "Lidera un clan",
      "Fundador de clan permanente",
    ],
    perks: ["Título Líder", "Emblema de clan", "Acceso a clan privado"],
  },
  {
    id: "clan-del-ano",
    name: "Clan del Año",
    icon: Icon.ClanDelAno,
    level: 0,
    progress: 0,
    thresholds: [1, 5, 15],
    descriptions: [
      "Tu clan queda en top 3 semanal",
      "5 veces en top 3 semanal",
      "15 veces en top 3 semanal",
    ],
    perks: ["+×0.05 XP de clan", "+×0.10 XP de clan", "+×0.20 XP de clan"],
  },
  {
    id: "motivador",
    name: "Motivador",
    icon: Icon.Motivador,
    level: 0,
    progress: 0,
    thresholds: [1, 10, 50],
    descriptions: [
      "Envía 1 motivación a un amigo",
      "Envía 10 motivaciones",
      "Envía 50 motivaciones",
    ],
    perks: ["+5 XP social", "+10 XP social", "+20 XP social"],
  },
  {
    id: "competidor",
    name: "Competidor",
    icon: Icon.Competidor,
    level: 0,
    progress: 0,
    thresholds: [1, 1, 1],
    descriptions: [
      "Alcanza la liga 7",
      "Alcanza la liga 7",
      "Alcanza la liga 7",
    ],
    perks: ["Título Competidor", "Emblema de liga", "Recompensa de liga"],
  },
  {
    id: "coleccionista-copas",
    name: "Coleccionista de Copas",
    icon: Icon.ColeccionistaCopas,
    level: 0,
    progress: 0,
    thresholds: [50, 200, 500],
    descriptions: [
      "Acumula 50 trofeos",
      "Acumula 200 trofeos",
      "Acumula 500 trofeos",
    ],
    perks: ["+10 XP trofeo", "+25 XP trofeo", "+50 XP trofeo"],
  },
  {
    id: "invicto",
    name: "Invicto",
    icon: Icon.Invicto,
    level: 0,
    progress: 0,
    thresholds: [1, 4, 12],
    descriptions: [
      "1 semana sin perder trofeos",
      "4 semanas sin perder trofeos",
      "12 semanas sin perder trofeos",
    ],
    perks: ["+×0.05 XP competitivo", "+×0.10 XP competitivo", "+×0.20 XP competitivo"],
  },
  {
    id: "el-que-alimenta",
    name: "El que Alimenta",
    icon: Icon.ElQueAlimenta,
    level: 0,
    progress: 0,
    thresholds: [3, 7, 14],
    descriptions: [
      "3 días seguidos completando misiones",
      "7 días seguidos completando misiones",
      "14 días seguidos completando misiones",
    ],
    perks: ["+×0.05 XP constancia", "+×0.10 XP constancia", "+×0.20 XP constancia"],
  },
  {
    id: "resucitador",
    name: "Resucitador",
    icon: Icon.Resucitador,
    level: 0,
    progress: 0,
    thresholds: [1, 5, 10],
    descriptions: [
      "Completa una misión con Pyro en agonía",
      "5 veces salvando a Pyro",
      "10 veces salvando a Pyro",
    ],
    perks: ["+10 XP rescate", "+20 XP rescate", "+50 XP rescate"],
  },
  {
    id: "monje",
    name: "Monje",
    icon: Icon.Monje,
    level: 0,
    progress: 0,
    thresholds: [10, 50, 150],
    descriptions: [
      "Completa 10 misiones de salud mental",
      "Completa 50 misiones de salud mental",
      "Completa 150 misiones de salud mental",
    ],
    perks: ["+×0.05 XP mental", "+×0.10 XP mental", "+×0.20 XP mental"],
  },
  {
    id: "financiero",
    name: "Financiero",
    icon: Icon.Financiero,
    level: 0,
    progress: 0,
    thresholds: [10, 50, 150],
    descriptions: [
      "Completa 10 misiones de finanzas",
      "Completa 50 misiones de finanzas",
      "Completa 150 misiones de finanzas",
    ],
    perks: ["+×0.05 XP finanzas", "+×0.10 XP finanzas", "+×0.20 XP finanzas"],
  },
  {
    id: "lector",
    name: "Lector",
    icon: Icon.Lector,
    level: 0,
    progress: 0,
    thresholds: [10, 50, 150],
    descriptions: [
      "Completa 10 misiones de lectura",
      "Completa 50 misiones de lectura",
      "Completa 150 misiones de lectura",
    ],
    perks: ["+×0.05 XP lectura", "+×0.10 XP lectura", "+×0.20 XP lectura"],
  },
  {
    id: "minimalista",
    name: "Minimalista",
    icon: Icon.Minimalista,
    level: 0,
    progress: 0,
    thresholds: [10, 50, 150],
    descriptions: [
      "Completa 10 misiones de reducción de redes",
      "Completa 50 misiones de reducción de redes",
      "Completa 150 misiones de reducción de redes",
    ],
    perks: ["+×0.05 XP enfoque", "+×0.10 XP enfoque", "+×0.20 XP enfoque"],
  },
  {
    id: "nutricionista",
    name: "Nutricionista",
    icon: Icon.Nutricionista,
    level: 0,
    progress: 0,
    thresholds: [10, 50, 150],
    descriptions: [
      "Completa 10 misiones de nutrición",
      "Completa 50 misiones de nutrición",
      "Completa 150 misiones de nutrición",
    ],
    perks: ["+×0.05 XP nutrición", "+×0.10 XP nutrición", "+×0.20 XP nutrición"],
  },
  {
    id: "el-que-descansa",
    name: "El que Descansa",
    icon: Icon.ElQueDescansa,
    level: 0,
    progress: 0,
    thresholds: [10, 50, 150],
    descriptions: [
      "Completa 10 misiones de sueño",
      "Completa 50 misiones de sueño",
      "Completa 150 misiones de sueño",
    ],
    perks: ["+×0.05 XP descanso", "+×0.10 XP descanso", "+×0.20 XP descanso"],
  },
  {
    id: "abre-cofres",
    name: "Abre Cofres",
    icon: Icon.AbreCofres,
    level: 0,
    progress: 0,
    thresholds: [1, 10, 50],
    descriptions: [
      "Abre 1 cofre",
      "Abre 10 cofres",
      "Abre 50 cofres",
    ],
    perks: ["+1 cofre gratis", "+5 cofres gratis", "+10 cofres gratis"],
  },
  {
    id: "suertudo",
    name: "Suertudo",
    icon: Icon.Suertudo,
    level: 0,
    progress: 0,
    thresholds: [1, 3, 5],
    descriptions: [
      "Obtén 1 congelador de un cofre",
      "Obtén 3 congeladores de cofres",
      "Obtén 5 congeladores de cofres",
    ],
    perks: ["+1% suerte cofre", "+3% suerte cofre", "+5% suerte cofre"],
  },
  {
    id: "dia-perfecto-total",
    name: "Día Perfecto",
    icon: Icon.DiaPerfectoTotal,
    level: 0,
    progress: 0,
    thresholds: [1, 10, 30],
    descriptions: [
      "1 día con todas las misiones diarias hechas",
      "10 días perfectos",
      "30 días perfectos",
    ],
    perks: ["+×0.05 XP diario", "+×0.10 XP diario", "+×0.25 XP diario"],
  },
  {
    id: "mes-perfecto",
    name: "Mes Perfecto",
    icon: Icon.MesPerfecto,
    level: 0,
    progress: 0,
    thresholds: [1, 3, 6],
    descriptions: [
      "1 mes con todas las misiones diarias hechas",
      "3 meses perfectos",
      "6 meses perfectos",
    ],
    perks: ["+×0.10 XP mensual", "+×0.20 XP mensual", "+×0.50 XP mensual"],
  },
  {
    id: "constante",
    name: "Constante",
    icon: Icon.Constante,
    level: 0,
    progress: 0,
    thresholds: [7, 30, 100],
    descriptions: [
      "7 días seguidos con 1+ misión",
      "30 días seguidos con 1+ misión",
      "100 días seguidos con 1+ misión",
    ],
    perks: ["+×0.05 XP cadena", "+×0.10 XP cadena", "+×0.20 XP cadena"],
  },
  {
    id: "el-insomne",
    name: "El Insomne",
    icon: Icon.ElInsomne,
    level: 0,
    progress: 0,
    thresholds: [1, 5, 10],
    descriptions: [
      "Completa 1 misión entre las 2–5 AM",
      "Completa 5 misiones entre las 2–5 AM",
      "Completa 10 misiones entre las 2–5 AM",
    ],
    perks: ["+×0.05 XP insomne", "+×0.10 XP insomne", "+×0.20 XP insomne"],
  },
  {
    id: "lunes-de-terror",
    name: "Lunes de Terror",
    icon: Icon.LunesDeTerror,
    level: 0,
    progress: 0,
    thresholds: [1, 8, 20],
    descriptions: [
      "Todas las diarias hechas en un lunes",
      "8 lunes con todas las diarias",
      "20 lunes con todas las diarias",
    ],
    perks: ["+×0.05 XP lunes", "+×0.10 XP lunes", "+×0.20 XP lunes"],
  },
  {
    id: "speed-run",
    name: "Speed Run",
    icon: Icon.SpeedRun,
    level: 0,
    progress: 0,
    thresholds: [1, 5, 10],
    descriptions: [
      "5 misiones en menos de 30 minutos",
      "5 veces la proeza Speed Run",
      "10 veces la proeza Speed Run",
    ],
    perks: ["+×0.05 XP rapidez", "+×0.10 XP rapidez", "+×0.20 XP rapidez"],
  },
  {
    id: "el-olvidado",
    name: "El Olvidado",
    icon: Icon.ElOlvidado,
    level: 0,
    progress: 0,
    thresholds: [1, 1, 1],
    descriptions: [
      "Regresa tras 7+ días de inactividad",
      "Regresa tras 7+ días de inactividad",
      "Regresa tras 7+ días de inactividad",
    ],
    perks: ["+50 XP regreso", "+100 XP regreso", "+200 XP regreso"],
  },
  {
    id: "pyros-favorite",
    name: "Pyro's Favorite",
    icon: Icon.PyrosFavorite,
    level: 0,
    progress: 0,
    thresholds: [1, 1, 1],
    descriptions: [
      "30 días de racha sin usar congelador",
      "30 días de racha sin usar congelador",
      "30 días de racha sin usar congelador",
    ],
    perks: ["Título Favorito", "Emblema de Pyro", "+×0.20 XP Pyro"],
  },
  {
    id: "el-tempranero-extremo",
    name: "El Tempranero Extremo",
    icon: Icon.ElTempraneroExtremo,
    level: 0,
    progress: 0,
    thresholds: [1, 5, 15],
    descriptions: [
      "Completa 1 misión antes de las 6 AM",
      "Completa 5 misiones antes de las 6 AM",
      "Completa 15 misiones antes de las 6 AM",
    ],
    perks: ["+×0.05 XP madrugador", "+×0.10 XP madrugador", "+×0.20 XP madrugador"],
  },
  {
    id: "primer-paso",
    name: "Primer Paso",
    icon: Icon.PrimerPaso,
    level: 0,
    progress: 0,
    thresholds: [1, 10, 50],
    descriptions: [
      "Completa tu primera misión",
      "Completa 10 misiones",
      "Completa 50 misiones",
    ],
    perks: ["+10 XP bienvenida", "+25 XP progreso", "+50 XP veterano"],
  },
];

const ROMAN = ["", "I", "II", "III"];

// Minimum 10 mock achievements used as a fallback so the screen is never blank.
const FALLBACK_ACHIEVEMENTS: Achievement[] = Array.from({ length: 10 }).map(
  (_, idx) => ({
    id: `placeholder-${idx}`,
    name: `Logro ${idx + 1}`,
    icon: FallbackIcon,
    level: 0 as AchLevel,
    progress: 0,
    thresholds: [1, 10, 50],
    descriptions: ["Bloqueado", "Bloqueado", "Bloqueado"],
    perks: ["—", "—", "—"],
  }),
);

// Detect real hover-capable device (desktop). Mobile/touch returns false,
// so we never wire hover handlers there → single tap flips correctly.
const CAN_HOVER =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const HEX_CLIP =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

// Pointy-top hex: height = width * 2 / sqrt(3) ≈ 1.1547
const HEX_RATIO = 1.1547;

function AchievementsGrid() {
  const GAP = 4; // px between hexagons
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => setContainerWidth(node.clientWidth);
    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Defensive: always render with whatever data we have; never blank the tab.
  const list: Achievement[] =
    Array.isArray(ACHIEVEMENTS) && ACHIEVEMENTS.length > 0
      ? ACHIEVEMENTS
      : FALLBACK_ACHIEVEMENTS;

  // Chunk into alternating rows of 4 and 3 (true honeycomb, larger hexes).
  const rows: Achievement[][] = [];
  let i = 0;
  let size: 4 | 3 = 4;
  while (i < list.length) {
    rows.push(list.slice(i, i + size));
    i += size;
    size = size === 4 ? 3 : 4;
  }

  const hexW = Math.max(72, containerWidth > 0 ? (containerWidth - 3 * GAP) / 4 : 96);
  const hexH = hexW * HEX_RATIO;

  return (
    <div
      ref={containerRef}
      className="min-h-[60vh] w-full pb-6"
    >
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="flex justify-center"
          style={{
            gap: `${GAP}px`,
            // Pull each row up so points interlock: overlap 25% of hex height.
            marginTop:
              ri === 0
                ? 0
                : `${hexH * -0.25 + GAP * 0.5}px`,
          }}
        >
          {row.map((a) => (
            <div
              key={a.id}
              style={{ width: `${hexW}px`, height: `${hexH}px` }}
            >
              <HexAchievement
                ach={a}
                hexW={hexW}
                flipped={activeId === a.id}
                onToggle={() =>
                  setActiveId((cur) => (cur === a.id ? null : a.id))
                }
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function HexAchievement({
  ach,
  hexW,
  flipped,
  onToggle,
}: {
  ach: Achievement;
  hexW: number;
  flipped: boolean;
  onToggle: () => void;
}) {
  const locked = ach.level === 0;
  const IconComp = (typeof ach.icon === "function" ? ach.icon : FallbackIcon);

  // Gloss + tier styling
  const tier = ach.level as 1 | 2 | 3;
  const tierBg = locked
    ? null
    : tier === 1
      ? "linear-gradient(135deg, #B8733A 0%, #F4A460 50%, #CD7F32 100%)"
      : tier === 2
        ? "linear-gradient(135deg, #7A8A96 0%, #E8EDF2 50%, #A0B0BC 100%)"
        : "linear-gradient(135deg, #B8960C 0%, #FFE566 50%, #D4A017 100%)";
  const borderColor = locked
    ? undefined
    : tier === 1
      ? "#E8A050"
      : tier === 2
        ? "#D0D8E0"
        : "#FFD700";
  const glossOpacity = locked ? 0 : tier === 1 ? 0.25 : tier === 2 ? 0.3 : 0.35;
  const goldGlow = !locked && tier === 3
    ? "drop-shadow(0 0 10px rgba(255, 215, 0, 0.45))"
    : undefined;

  return (
    <div
      className="group relative h-full w-full cursor-pointer select-none"
      style={{ perspective: "800px", filter: goldGlow }}
      onClick={onToggle}
    >
      <div
        className="relative h-full w-full transition-transform duration-[400ms]"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Border layer (clipped hex in border color) */}
          <div
            className={cn(
              "absolute inset-0",
              locked && "bg-[#CCCCDD] dark:bg-[#3A3A5E]",
            )}
            style={{
              clipPath: HEX_CLIP,
              background: !locked ? borderColor : undefined,
            }}
          />
          {/* Inner hex (inset by border thickness) */}
          <div
            className={cn(
              "absolute inset-[2px] flex flex-col items-center justify-center",
              locked &&
                "bg-[radial-gradient(circle_at_30%_30%,#F5F5FA,#E8E8F0)] text-foreground/70 dark:bg-[radial-gradient(circle_at_30%_30%,#2A2A3E,#1E1E2E)] dark:text-foreground/60",
              !locked && "text-black/80",
            )}
            style={{
              clipPath: HEX_CLIP,
              background: tierBg ?? undefined,
            }}
          >
            {/* Gloss highlight on top portion */}
            {!locked && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  clipPath: HEX_CLIP,
                  background: `linear-gradient(180deg, rgba(255,255,255,${glossOpacity}) 0%, rgba(255,255,255,${glossOpacity * 0.4}) 30%, rgba(255,255,255,0) 55%)`,
                }}
              />
            )}
            <div className="relative flex h-[55%] w-[55%] items-center justify-center">
              <IconComp className="h-full w-full" />
            </div>
            {!locked && (
              <span className="relative mt-0.5 text-xs font-black drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">
                {ROMAN[ach.level]}
              </span>
            )}
          </div>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Border layer */}
          <div
            className="absolute inset-0 bg-border"
            style={{ clipPath: HEX_CLIP }}
          />
          <div
            className="absolute inset-[2px]"
            style={{ clipPath: HEX_CLIP }}
          >
            <HexBack ach={ach} hexW={hexW} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HexBack({ ach, hexW }: { ach: Achievement; hexW: number }) {
  const locked = ach.level === 0;
  const currentIdx = locked ? 0 : Math.min(ach.level - 1, 2);
  const nextIdx = locked ? 0 : Math.min(ach.level, 2);
  const isMaxed = ach.level === 3;

  const currentThreshold = ach.thresholds[currentIdx];
  const nextThreshold = ach.thresholds[nextIdx];
  const descIdx = locked ? 0 : Math.min(ach.level, 2);
  const desc = ach.descriptions[descIdx];
  const perk = ach.perks[Math.max(0, ach.level - 1)] ?? ach.perks[0];

  const pct = isMaxed
    ? 100
    : Math.max(
        0,
        Math.min(
          100,
          ((ach.progress - (locked ? 0 : currentThreshold)) /
            Math.max(1, nextThreshold - (locked ? 0 : currentThreshold))) *
            100,
        ),
      );

  const DESIGN_W = 120;
  const DESIGN_H = 138;
  // Scale to fit content inside the hex's narrow interior (not bounding box).
  // Extra shrink factor keeps text away from the angled top/bottom points.
  const scale = (hexW / DESIGN_W) * 0.82;
  return (
    <div
      className="bg-card"
      style={{
        width: "100%",
        height: "100%",
        clipPath: HEX_CLIP,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        className="text-foreground"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 2,
          padding: "10px 12px",
          boxSizing: "border-box",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      >
      <p
        className="font-bold leading-tight text-foreground"
        style={{ fontSize: "13px", fontWeight: 700, lineHeight: 1.2, wordBreak: "break-word", overflowWrap: "break-word" }}
      >
        {ach.name}
      </p>
      <p
        className="leading-tight text-muted-foreground"
        style={{ fontSize: "10px", lineHeight: 1.25, wordBreak: "break-word", overflowWrap: "break-word" }}
      >
        {desc}
      </p>
      <p
        className="font-semibold leading-tight text-accent"
        style={{ fontSize: "10px", lineHeight: 1.25, wordBreak: "break-word", overflowWrap: "break-word" }}
      >
        {perk}
      </p>
      {isMaxed ? (
        <p
          className="font-bold text-[hsl(142,71%,45%)]"
          style={{ fontSize: "10px" }}
        >
          ✓ Completado
        </p>
      ) : (
        <div className="flex w-full flex-col items-center" style={{ gap: "3px" }}>
          <div
            className="flex w-[70%] items-center justify-between font-semibold text-muted-foreground tabular-nums"
            style={{ fontSize: "9px" }}
          >
            <span>
              {ROMAN[Math.max(1, locked ? 1 : ach.level) as 1 | 2 | 3]}—
              {locked ? 0 : currentThreshold}
            </span>
            <span>
              {ROMAN[(locked ? 1 : ach.level + 1) as 1 | 2 | 3]}—{nextThreshold}
            </span>
          </div>
          <div
            className="relative w-[70%] overflow-hidden rounded-full bg-muted"
            style={{ height: "5px" }}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className="font-bold tabular-nums text-foreground"
            style={{ fontSize: "9px" }}
          >
            {ach.progress}
          </span>
        </div>
      )}
      </div>
    </div>
  );
}

// ---------------- Streak Calendar ----------------

const WEEKDAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

function loadFreezeDates(): Set<string> {
  try {
    const raw = localStorage.getItem("pyroFreezeUsedDates");
    if (raw) return new Set(JSON.parse(raw));
    const single = localStorage.getItem("pyroFreezeUsedDate");
    return single ? new Set([single]) : new Set();
  } catch {
    return new Set();
  }
}

interface StreakCalendarProps {
  completionByDay: Map<string, number>;
}

function StreakCalendar({ completionByDay }: StreakCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const today = startOfDay(new Date());
  const freezeDates = useMemo(() => loadFreezeDates(), []);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const key = (d: Date) => d.toISOString().slice(0, 10);
  const isCompletedDay = (d: Date) => (completionByDay.get(key(d)) ?? 0) > 0;
  const isFreezeDay = (d: Date) => freezeDates.has(key(d));
  const isFuture = (d: Date) => isAfter(d, today);

  // Stats for the visible month.
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const completedThisMonth = monthDays.filter(isCompletedDay).length;
  const freezesThisMonth = monthDays.filter(isFreezeDay).length;

  // Pre-compute weekly rows for perfect-week detection.
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const dayClass = (d: Date, idxInWeek: number, week: Date[]) => {
    const inMonth = isSameMonth(d, cursor);
    const future = isFuture(d);
    const completed = isCompletedDay(d);
    const freeze = isFreezeDay(d);
    const today_ = isSameDay(d, today);
    const prev = idxInWeek > 0 ? week[idxInWeek - 1] : null;
    const next = idxInWeek < 6 ? week[idxInWeek + 1] : null;
    const isActive = completed || freeze;
    const prevActive = prev ? isCompletedDay(prev) || isFreezeDay(prev) : false;
    const nextActive = next ? isCompletedDay(next) || isFreezeDay(next) : false;

    // Perfect week: 7 consecutive completed days in this row with no freeze.
    const perfect =
      week.every((dd) => isCompletedDay(dd) && !isFreezeDay(dd));

    return { inMonth, future, completed, freeze, today_, isActive, prevActive, nextActive, perfect };
  };

  return (
    <div className="surface p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold capitalize text-foreground">
          {format(cursor, "MMMM yyyy", { locale: es })}
        </span>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Stat chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          🔥 {completedThisMonth} días
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#93C5FD]/40 bg-[#93C5FD]/15 px-3 py-1 text-xs font-semibold text-[#60A5FA]">
          🧊 {freezesThisMonth} congeladores
        </div>
      </div>

      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium tracking-wide text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0">
            {week.map((d, di) => {
              const s = dayClass(d, di, week);
              const showStrong = s.perfect && s.isActive;
              const bg = s.freeze
                ? "#93C5FD"
                : s.isActive
                  ? "hsl(var(--primary))"
                  : "transparent";
              const roundL = !s.prevActive;
              const roundR = !s.nextActive;
              return (
                <div key={di} className="relative aspect-square p-0.5">
                  {s.isActive && (
                    <div
                      className={cn(
                        "absolute inset-y-0.5",
                        roundL ? "left-0.5 rounded-l-full" : "left-0",
                        roundR ? "right-0.5 rounded-r-full" : "right-0",
                        showStrong && "ring-2 ring-primary/70",
                      )}
                      style={{ background: bg, opacity: s.inMonth ? 1 : 0.35 }}
                    />
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-full w-full items-center justify-center rounded-full text-xs",
                      !s.inMonth || s.future
                        ? "text-muted-foreground/50"
                        : s.isActive
                          ? s.freeze
                            ? "text-[#0c4a6e] font-semibold"
                            : "text-primary-foreground font-semibold"
                          : "text-muted-foreground",
                      s.today_ && "ring-1 ring-foreground/60",
                    )}
                  >
                    {s.freeze && s.inMonth ? (
                      <span className="text-[11px]">🧊</span>
                    ) : (
                      format(d, "d")
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}