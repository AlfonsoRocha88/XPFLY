import { Check, Flame, Gift, Trash2, Sun } from "lucide-react";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import TaskCheck from "@/components/TaskCheck";
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
  if (dailyTasks.length === 0) return null;

  const completedCount = dailyTasks.filter((t) => t.status === "done").length;
  const totalCount = dailyTasks.length;
  const progress = (completedCount / totalCount) * 100;
  const nextMilestone = STREAK_MILESTONES.find((m) => m > dailyStreak) ?? 100;
  const streakBonusXp = Math.min(50 + dailyStreak * 5, 200);

  return (
    <section className="daily-quest-panel" aria-labelledby="daily-quest-title">
      <div className="daily-quest-header">
        <div className="flex items-center gap-3">
          <div className="daily-quest-icon" aria-hidden="true">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <h2 id="daily-quest-title" className="font-serif text-lg font-medium leading-tight">Tareas diarias</h2>
            <p className="text-xs font-semibold text-muted-foreground">
              {completedCount === totalCount ? "Todas completadas" : `${completedCount} de ${totalCount} completadas`}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold",
            dailyStreak > 0 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
          )}
          title={`Racha: ${dailyStreak} días · próximo hito: ${nextMilestone}`}
          aria-label={`Racha actual: ${dailyStreak} días`}
        >
          <Flame className="h-4 w-4" /> {dailyStreak}
        </div>
      </div>

      <div className="px-4 pb-3">
        <div
          className="daily-progress-bg"
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
        >
          <div className="daily-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="space-y-1.5 px-4">
        {dailyTasks.map((task) => {
          const isDone = task.status === "done";
          return (
            <li key={task.id}>
            <SwipeToDelete onDelete={() => onDeleteTask(task.id)} className="rounded-2xl">
            <div
              className={cn("daily-quest-item group/daily cursor-pointer", isDone && "daily-quest-item-done")}
              onClick={() => onEditTask?.(task)}
            >
              <TaskCheck
                checked={isDone}
                onToggle={() => onToggleComplete(task)}
                label={isDone ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`}
              />
              <span className={cn("flex-1 text-[15px] font-medium", isDone && "text-muted-foreground line-through")}>
                {task.title}
              </span>
              <button
                type="button"
                className="rounded-full p-1.5 text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/daily:opacity-100 [@media(hover:none)]:sr-only"
                onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                aria-label={`Eliminar tarea diaria ${task.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            </SwipeToDelete>
            </li>
          );
        })}
      </ul>

      <div className="daily-quest-reward flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-xp/20 text-xp", allCompleted && !bonusClaimed && "animate-bounce")}>
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Recompensa diaria</p>
            <p className="text-xs font-semibold text-muted-foreground">+{streakBonusXp} XP y un cofre</p>
          </div>
        </div>
        {allCompleted && !bonusClaimed ? (
          <button onClick={() => { playSfx("xp"); onClaimBonus(); }} className="daily-claim-btn">
            Reclamar
          </button>
        ) : bonusClaimed && unopenedChests > 0 && onOpenChest ? (
          <button
            onClick={() => { playSfx("open"); onOpenChest(); }}
            className="relative rounded-full bg-xp px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_0_hsl(var(--xp)/0.35)] transition-transform active:scale-95"
          >
            Abrir cofre
            {unopenedChests > 1 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[10px] text-white">
                {unopenedChests}
              </span>
            )}
          </button>
        ) : bonusClaimed ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><Check className="h-3.5 w-3.5" aria-hidden /> Reclamada</span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">{totalCount - completedCount} por hacer</span>
        )}
      </div>
    </section>
  );
};

export default DailyQuestPanel;
