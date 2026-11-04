import { useMemo } from "react";
import { Sword, Shield, Flame, Trophy, CheckCircle2, Trash2, Gift, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { playSfx } from "@/lib/sfx";

interface DailyQuestPanelProps {
  dailyTasks: Task[];
  onToggleComplete: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onEditTask?: (task: Task) => void;
  dailyStreak: number;
  allCompleted: boolean;
  bonusClaimed: boolean;
  onClaimBonus: () => void;
  unopenedChests?: number;
  onOpenChest?: () => void;
}

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

const DailyQuestPanel = ({
  dailyTasks,
  onToggleComplete,
  onDeleteTask,
  onEditTask,
  dailyStreak,
  allCompleted,
  bonusClaimed,
  onClaimBonus,
  unopenedChests = 0,
  onOpenChest,
}: DailyQuestPanelProps) => {
  const todayDow = new Date().getDay();
  const isScheduledToday = (t: Task) => {
    const days = ((t as any).daily_days as number[] | undefined) ?? [];
    return days.length === 0 || days.includes(todayDow);
  };
  const todayTasks = dailyTasks.filter(isScheduledToday);
  const completedCount = todayTasks.filter((t) => t.status === "done").length;
  const totalCount = todayTasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const nextMilestone = STREAK_MILESTONES.find((m) => m > dailyStreak) ?? 100;
  const streakBonusXp = Math.min(50 + dailyStreak * 5, 200);

  if (dailyTasks.length === 0) return null;

  return (
    <section
      className="daily-quest-panel mb-6"
      role="region"
      aria-labelledby="daily-quest-title"
    >
      {/* Header - Solo Leveling style */}
      <div className="daily-quest-header">
        <div className="flex items-center gap-3">
          <div className="daily-quest-icon" aria-hidden="true">
            <Sword className="h-5 w-5" />
          </div>
          <div>
            <h2 id="daily-quest-title" className="font-pixel text-[10px] tracking-wider text-primary">
              MISIONES DIARIAS
            </h2>
            <p className="font-pixel text-[7px] text-muted-foreground mt-1">
              Se reinician cada día
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2" aria-label={`Racha actual: ${dailyStreak} días`}>
          <Flame className={cn("h-4 w-4", dailyStreak > 0 ? "text-orange-400" : "text-muted-foreground")} aria-hidden="true" />
          <span className="font-pixel text-[9px] text-orange-400">{dailyStreak}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-pixel text-[7px] text-muted-foreground">PROGRESO</span>
          <span className="font-pixel text-[7px] text-primary">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div
          className="daily-progress-bg"
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label={`Progreso de misiones diarias: ${completedCount} de ${totalCount}`}
        >
          <div
            className="daily-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quest list */}
      <ul className="px-4 pb-2 space-y-1.5" role="list" aria-label="Lista de misiones diarias">
        {dailyTasks.map((task) => {
          const isDone = task.status === "done";
          const scheduledToday = isScheduledToday(task);
          return (
            <li
              key={task.id}
              className={cn(
                "daily-quest-item group/daily cursor-pointer",
                isDone && "daily-quest-item-done",
                !scheduledToday && "opacity-50"
              )}
              onClick={() => onEditTask?.(task)}
              onMouseEnter={() => playSfx("hover")}
              aria-label={`Misión diaria: ${task.title}. Estado: ${isDone ? "completada" : "pendiente"}.${scheduledToday ? "" : " No programada para hoy."}`}
            >
              <div className="relative flex items-center justify-center mt-0.5">
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => onToggleComplete(task)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8"
                  disabled={!scheduledToday}
                  aria-label={isDone ? `Marcar "${task.title}" como pendiente` : `Marcar "${task.title}" como completada`}
                />
                <div className="absolute inset-0 -m-[6px]" aria-hidden="true" />
              </div>
              <span
                className={cn(
                  "text-xs flex-1",
                  isDone
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                )}
              >
                {task.title}
                {!scheduledToday && (
                  <span className="ml-2 font-pixel text-[7px] text-muted-foreground">(otro día)</span>
                )}
              </span>
              {isDone && (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover/daily:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); playSfx("delete"); onDeleteTask(task.id); }}
                aria-label={`Eliminar misión diaria ${task.title}`}
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>

      {/* Reward section */}
      <div className="daily-quest-reward">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className={cn("h-4 w-4", allCompleted ? "text-yellow-400" : "text-muted-foreground")} />
            <div>
              <p className="font-pixel text-[8px] text-yellow-400/80">RECOMPENSA</p>
              <p className="font-pixel text-[7px] text-muted-foreground">
                +{streakBonusXp} XP bonus
              </p>
            </div>
            {/* Gift silhouette - animated when waiting, still & opened when claimed */}
            {allCompleted && !bonusClaimed ? (
              <div className="relative ml-1 animate-bounce" aria-hidden="true">
                <div className="absolute inset-0 rounded-md bg-yellow-400/30 blur-md" />
                <Gift
                  className="relative h-7 w-7 text-yellow-300 drop-shadow-[0_0_8px_hsl(45_90%_60%/0.9)]"
                  strokeWidth={2.5}
                />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-yellow-200 animate-ping" />
              </div>
            ) : bonusClaimed ? (
              <div className="relative ml-1 opacity-80" aria-hidden="true">
                <PackageOpen
                  className="relative h-7 w-7 text-blue-300/70"
                  strokeWidth={2}
                />
              </div>
            ) : null}
          </div>
          {allCompleted && !bonusClaimed ? (
            <button
              onClick={() => { playSfx("xp"); onClaimBonus(); }}
              onMouseEnter={() => playSfx("hover")}
              className="daily-claim-btn"
              aria-label={`Reclamar recompensa diaria de ${streakBonusXp} XP`}
            >
              <span className="font-pixel text-[8px]">RECLAMAR</span>
            </button>
          ) : bonusClaimed ? (
            unopenedChests > 0 && onOpenChest ? (
              <button
                onClick={() => { playSfx("open"); onOpenChest(); }}
                onMouseEnter={() => playSfx("hover")}
                className="relative flex items-center gap-2 rounded-lg border-2 border-yellow-400 bg-yellow-400/10 px-3 py-1.5 shadow-[0_0_20px_hsl(45_90%_60%/0.5)] hover:bg-yellow-400/20 hover:scale-105 transition-all animate-pulse"
                aria-label={`Abrir cofre${unopenedChests > 1 ? `, ${unopenedChests} disponibles` : ""}`}
              >
                <Gift className="h-4 w-4 text-yellow-300" aria-hidden="true" />
                <span className="font-pixel text-[8px] text-yellow-300">ABRIR</span>
                {unopenedChests > 1 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border border-background bg-destructive px-1 font-pixel text-[7px] text-destructive-foreground">
                    {unopenedChests}
                  </span>
                )}
              </button>
            ) : (
              <span className="font-pixel text-[7px] text-primary/70">RECLAMADO ✓</span>
            )
          ) : (
            <Shield className="h-4 w-4 text-muted-foreground/30" aria-hidden="true" />
          )}
        </div>
        {dailyStreak > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="font-pixel text-[6px] text-muted-foreground">
              Racha: {dailyStreak} días → próximo hito: {nextMilestone} días
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default DailyQuestPanel;
