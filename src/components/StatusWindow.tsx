import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerStats, STAT_INFO } from "@/lib/avatar-presets";
import { cn } from "@/lib/utils";

interface StatusWindowProps {
  stats: PlayerStats;
  pointsAvailable: number;
  level: number;
  title?: string;
  displayName?: string;
  onAllocate?: (stat: keyof PlayerStats) => void;
  className?: string;
}

const StatusWindow = ({ stats, pointsAvailable, level, title, displayName, onAllocate, className }: StatusWindowProps) => {
  const editable = !!onAllocate;

  return (
    <div className={cn("status-window", className)}>
      {/* Header */}
      <div className="status-window-header">
        <span className="text-base font-semibold">Atributos</span>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">Nivel {level}</span>
      </div>

      {/* Player info */}
      {(displayName || title) && (
        <div className="border-b border-border px-4 py-2">
          {displayName && <div className="font-system text-sm text-foreground">{displayName}</div>}
          {title && <div className="font-system text-xs text-primary/80">{title}</div>}
        </div>
      )}

      {/* Stats list */}
      <div className="space-y-3 p-4">
        {(Object.keys(STAT_INFO) as Array<keyof PlayerStats>).map((key) => {
          const info = STAT_INFO[key];
          const value = stats[key] ?? 10;
          const max = key === "hp" || key === "mp" ? 200 : 100;
          const pct = Math.min((value / max) * 100, 100);

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <span style={{ color: info.color }}>{info.icon}</span> {info.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="min-w-[2rem] text-right text-sm font-semibold tabular-nums">{value}</span>
                  {editable && pointsAvailable > 0 && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 rounded-full border-primary/40 hover:bg-primary/10"
                      onClick={() => onAllocate?.(key)}
                    >
                      <Plus className="h-3 w-3 text-primary" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="stat-bar-bg">
                <div
                  className="stat-bar-fill"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${info.color}, ${info.color}cc)` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — points available */}
      {editable && (
        <div className="flex items-center justify-between border-t border-border bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">Puntos disponibles</span>
          <span className={cn("text-lg font-semibold tabular-nums", pointsAvailable > 0 ? "text-primary" : "text-muted-foreground")}>
            {pointsAvailable}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatusWindow;
