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
        <div className="flex items-center gap-2">
          <span className="font-system text-[10px] text-primary tracking-widest">[ STATUS ]</span>
        </div>
        <div className="text-right">
          <div className="font-system text-[9px] text-muted-foreground">LV.</div>
          <div className="font-system text-lg text-primary leading-none">{level}</div>
        </div>
      </div>

      {/* Player info */}
      {(displayName || title) && (
        <div className="px-4 py-2 border-b border-primary/20">
          {displayName && <div className="font-system text-sm text-foreground">{displayName}</div>}
          {title && <div className="font-system text-[10px] text-primary/80 tracking-wider">{title}</div>}
        </div>
      )}

      {/* Stats list */}
      <div className="p-4 space-y-2.5">
        {(Object.keys(STAT_INFO) as Array<keyof PlayerStats>).map((key) => {
          const info = STAT_INFO[key];
          const value = stats[key] ?? 10;
          const max = key === "hp" || key === "mp" ? 200 : 100;
          const pct = Math.min((value / max) * 100, 100);

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-system text-[10px] text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <span style={{ color: info.color }}>{info.icon}</span> {info.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-system text-sm text-foreground tabular-nums min-w-[2rem] text-right">{value}</span>
                  {editable && pointsAvailable > 0 && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6 border-primary/50 hover:border-primary hover:bg-primary/10"
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
        <div className="px-4 py-3 border-t border-primary/20 bg-primary/5 flex items-center justify-between">
          <span className="font-system text-[10px] text-muted-foreground tracking-wider">PUNTOS DISPONIBLES</span>
          <span className={cn("font-system text-base tabular-nums", pointsAvailable > 0 ? "text-primary animate-pulse" : "text-muted-foreground")}>
            {pointsAvailable}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatusWindow;
