import { useRef, useState } from "react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronDown, Trash2 } from "lucide-react";
import type { Task, TaskPriority } from "@/lib/types";
import TaskCheck from "@/components/TaskCheck";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { cn } from "@/lib/utils";
import { XP_REWARDS, PRIORITY_META } from "@/lib/xp";

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
  const due = task.due_date ? parseISO(task.due_date) : null; // local date, not UTC midnight
  const overdue = !!due && !isDone && isPast(due) && !isToday(due);
  const doneSubtasks = subtasks.filter((s) => s.status === "done").length;

  const handleToggle = () => onToggleComplete(task);

  return (
    <SwipeToDelete onDelete={() => onDelete(task.id)} className="rounded-2xl">
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
          aria-label={`Editar tarea ${task.title}`}
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
          className="-mr-1 rounded-full p-1.5 text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:none)]:sr-only"
          onClick={() => onDelete(task.id)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Eliminar tarea ${task.title}`}
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
    </SwipeToDelete>
  );
};

export default TaskCard;
