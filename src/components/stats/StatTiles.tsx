import { ArrowDownRight, ArrowUpRight, CheckCircle2, Flame, Moon, Repeat2, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtHours, type Stats } from "@/lib/stats";
import { useCountUp } from "./chart-utils";

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: number | null;
  prev: number | null;
  format: (v: number) => string;
  /** Change shown as points (for percentages) instead of relative %. */
  points?: boolean;
  delay: number;
}

function Delta({ value, prev, points }: { value: number; prev: number; points?: boolean }) {
  const diff = points ? (value - prev) * 100 : prev ? ((value - prev) / prev) * 100 : 0;
  if (!prev && !points) return null;
  if (Math.abs(diff) < 1) return <span className="text-xs text-muted-foreground">Igual que antes</span>;
  const up = diff > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-success" : "text-muted-foreground")}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {Math.abs(Math.round(diff))}
      {points ? " pts" : "%"}
      <span className="sr-only">{up ? "más" : "menos"} que el periodo anterior</span>
    </span>
  );
}

function Tile({ icon: Icon, label, value, prev, format, points, delay }: TileProps) {
  const shown = useCountUp(value ?? 0);
  return (
    <div className="surface flex flex-col gap-1 p-4 animate-detail-in" style={{ animationDelay: `${delay}ms` }}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
      <span className="font-serif text-3xl font-medium leading-tight tabular-nums text-foreground">
        {value == null ? "—" : format(shown)}
      </span>
      {value != null && prev != null ? <Delta value={value} prev={prev} points={points} /> : <span className="text-xs text-muted-foreground">Sin datos previos</span>}
    </div>
  );
}

const StatTiles = ({ stats, streak }: { stats: Stats; streak: number }) => (
  <div className="space-y-3">
    <div className="flex items-baseline gap-2 px-1">
      <Flame className="h-4 w-4 self-center text-warning" aria-hidden />
      <span className="font-serif text-2xl font-medium tabular-nums text-foreground">{streak}</span>
      <span className="text-sm text-muted-foreground">{streak === 1 ? "día de racha" : "días de racha"}</span>
      <span className="ml-auto text-xs text-muted-foreground">{stats.activeDays} de {stats.days.length} días activos</span>
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile icon={CheckCircle2} label="Completadas" value={stats.completed} prev={stats.prevCompleted} format={(v) => Math.round(v).toString()} delay={0} />
      <Tile icon={Repeat2} label="Hábitos cumplidos" value={stats.habitRate} prev={stats.prevHabitRate} format={(v) => `${Math.round(v * 100)}%`} points delay={60} />
      <Tile icon={Sparkles} label="XP ganado" value={stats.xp} prev={stats.prevXp} format={(v) => Math.round(v).toLocaleString("es")} delay={120} />
      <Tile icon={Moon} label="Sueño promedio" value={stats.sleepAvg} prev={stats.prevSleepAvg} format={(v) => fmtHours(v).replace(" min", "m")} delay={180} />
    </div>
  </div>
);

export default StatTiles;
