import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useActivity } from "@/hooks/useActivity";
import { useSleepLogs } from "@/hooks/useDailyLog";
import { browserTz, lastDays } from "@/lib/localDay";
import { computeStats, type RangeDays } from "@/lib/stats";
import { buildInsights } from "@/lib/insights";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import SleepLogger from "@/components/SleepLogger";
import StatTiles from "./StatTiles";
import ActivityChart from "./ActivityChart";
import HabitConsistency from "./HabitConsistency";
import RhythmHeatmap from "./RhythmHeatmap";
import { SleepChart, SleepVsTasks } from "./SleepCharts";
import InsightCards from "./InsightCards";
import StreakCalendar from "./StreakCalendar";

const RANGES: { id: RangeDays; label: string }[] = [
  { id: 7, label: "Semana" },
  { id: 30, label: "Mes" },
  { id: 90, label: "3 meses" },
];

/** Longest window ever needed: 90 days plus the previous 90 to compare. One fetch serves every range. */
const WINDOW = 180;

const StatsView = ({ habits }: { habits: Task[] }) => {
  const { profile } = useProfile();
  const tz = profile?.timezone || browserTz();
  const [range, setRange] = useState<RangeDays>(7);
  const [logOpen, setLogOpen] = useState(false);

  const keys = useMemo(() => lastDays(WINDOW, tz), [tz]);
  const from = keys[0];
  const today = keys[keys.length - 1];
  const activity = useActivity(from);
  const sleep = useSleepLogs(from);

  const stats = useMemo(
    () => computeStats(range, activity.data ?? [], sleep.data ?? [], habits, tz),
    [range, activity.data, sleep.data, habits, tz],
  );
  const insights = useMemo(() => buildInsights(stats), [stats]);
  const countsByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of activity.data ?? []) m.set(r.day, (m.get(r.day) ?? 0) + 1);
    return m;
  }, [activity.data]);
  const todaySleep = sleep.data?.find((l) => l.day === today)?.sleepMinutes;

  if (activity.isLoading || sleep.isLoading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando estadísticas" />
      </div>
    );
  }
  if (activity.isError) {
    return <p className="surface p-5 text-sm text-muted-foreground">No se pudieron cargar tus estadísticas. Revisa tu conexión e inténtalo de nuevo.</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div role="radiogroup" aria-label="Periodo" className="flex self-start rounded-full bg-muted p-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={range === r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
              range === r.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* key={range} replays the entrance animations when the period changes */}
      <div key={range} className="flex flex-col gap-4">
        <StatTiles stats={stats} streak={profile?.daily_streak ?? 0} />
        <InsightCards insights={insights} enoughData={stats.activeDays >= 5} />
        <ActivityChart days={stats.days} range={range} />
        <div className="grid gap-4 md:grid-cols-2">
          <HabitConsistency habits={stats.habits} />
          <RhythmHeatmap heat={stats.heat} />
        </div>
        <SleepChart stats={stats} range={range} onLog={() => setLogOpen(true)} />
        <SleepVsTasks pairs={stats.sleepPairs} />
      </div>
      <StreakCalendar countsByDay={countsByDay} todayKey={today} />

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="font-serif text-lg font-medium">¿Cuánto dormiste anoche?</DialogTitle>
          <DialogDescription className="text-xs">Se guarda para hoy. Puedes cambiarlo cuando quieras.</DialogDescription>
          <SleepLogger day={today} initialMinutes={todaySleep} onDone={() => setLogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatsView;
