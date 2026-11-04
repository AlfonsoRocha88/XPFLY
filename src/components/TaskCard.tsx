import { useRef, useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronDown, Trash2 } from "lucide-react";
import type { Task, TaskPriority } from "@/lib/types";
import TaskCheck from "@/components/TaskCheck";
import { stashPyroSourceRect } from "@/hooks/usePyro";
import { cn } from "@/lib/utils";

export const XP_REWARDS: Record<TaskPriority, number> = {
  low: 10,
  medium: 20,
  high: 35,
  urgent: 50,
};

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "Fácil", color: "hsl(var(--priority-low))" },
  medium: { label: "Normal", color: "hsl(var(--priority-medium))" },
  high: { label: "Difícil", color: "hsl(var(--priority-high))" },
  urgent: { label: "Épico", color: "hsl(var(--priority-urgent))" },
};

interface TaskCardProps {
  task: Task;
  subtasks: Task[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (task: Task) => void;
  projectColor?: string;
  exiting?: boolean;
}

const TaskCard = ({ task, subtasks, onToggleComplete, onEdit, onDelete, onToggleSubtask, projectColor, exiting }: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const isDone = task.status === "done";
  const cardRef = useRef<HTMLDivElement | null>(null);
  const priority = PRIORITY_META[task.priority];
  const due = task.due_date ? new Date(task.due_date) : null;
  const overdue = !!due && !isDone && isPast(due) && !isToday(due);
  const doneSubtasks = subtasks.filter((s) => s.status === "done").length;

  const handleToggle = () => {
    if (!isDone && cardRef.current) {
      const r = cardRef.current.getBoundingClientRect();
      stashPyroSourceRect(task.id, { x: r.left, y: r.top, width: r.width, height: r.height });
    }
    onToggleComplete(task);
  };

  return (
    <div
      ref={cardRef}
      className={cn("task-card-game group task-card-enter", isDone && "completed", exiting && "task-card-exit")}
      role="listitem"
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <TaskCheck
            checked={isDone}
            onToggle={handleToggle}
            label={isDone ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`}
          />
        </div>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onEdit(task)}
          aria-label={`Editar misión ${task.title}`}
        >
          <p className={cn("text-[15px] font-medium leading-snug", isDone && "text-muted-foreground line-through")}>
            {projectColor && (
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: projectColor }} />
            )}
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{task.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
            <span className="flex items-center gap-1.5" style={{ color: priority.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: priority.color }} />
              {priority.label}
            </span>
            {!isDone && <span className="text-xp">+{XP_REWARDS[task.priority]} XP</span>}
            {due && (
              <span className={cn("flex items-center gap-1", overdue ? "text-destructive" : "text-muted-foreground")}>
                <CalendarDays className="h-3.5 w-3.5" />
                {isToday(due) ? "Hoy" : format(due, "d MMM", { locale: es })}
              </span>
            )}
            {task.tags?.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{tag}</span>
            ))}
          </div>
        </button>

        <button
          type="button"
          className="-mr-1 rounded-full p-1.5 text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
          onClick={() => onDelete(task.id)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Eliminar misión ${task.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {subtasks.length > 0 && (
        <div className="ml-10 mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !expanded && "-rotate-90")} />
            {doneSubtasks}/{subtasks.length} subtareas
          </button>
          {expanded && (
            <ul className="mt-2 space-y-2">
              {subtasks.map((sub) => (
                <li key={sub.id} className="flex items-center gap-2.5">
                  <TaskCheck
                    size="sm"
                    checked={sub.status === "done"}
                    onToggle={() => onToggleSubtask(sub)}
                    label={`Subtarea ${sub.title}`}
                  />
                  <span className={cn("text-sm", sub.status === "done" && "text-muted-foreground line-through")}>{sub.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
