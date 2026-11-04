import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ChevronDown, ChevronRight, Trash2, GripVertical, Zap } from "lucide-react";
import type { Task, TaskPriority } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRef } from "react";
import { stashPyroSourceRect } from "@/hooks/usePyro";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";

const XP_REWARDS: Record<TaskPriority, number> = {
  low: 10,
  medium: 20,
  high: 35,
  urgent: 50,
};

const priorityConfig: Record<TaskPriority, { label: string; class: string }> = {
  low: { label: "Fácil", class: "bg-[hsl(142,60%,50%)]/15 text-[hsl(142,60%,50%)] border-[hsl(142,60%,50%)]/30" },
  medium: { label: "Normal", class: "bg-[hsl(45,90%,55%)]/15 text-[hsl(45,90%,55%)] border-[hsl(45,90%,55%)]/30" },
  high: { label: "Difícil", class: "bg-[hsl(25,90%,55%)]/15 text-[hsl(25,90%,55%)] border-[hsl(25,90%,55%)]/30" },
  urgent: { label: "Épico", class: "bg-[hsl(0,72%,55%)]/15 text-[hsl(0,72%,55%)] border-[hsl(0,72%,55%)]/30" },
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
      onMouseEnter={() => playSfx("hover")}
      role="listitem"
      aria-label={`Misión: ${task.title}. Prioridad ${priorityConfig[task.priority].label}. Estado: ${isDone ? "completada" : "pendiente"}.`}
    >
      <div className="flex items-start gap-1">
        <div className="mt-0.5 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="relative flex items-center justify-center">
          <Checkbox
            checked={isDone}
            onCheckedChange={handleToggle}
            className="h-8 w-8"
            aria-label={isDone ? `Marcar "${task.title}" como pendiente` : `Marcar "${task.title}" como completada`}
          />
          <div className="absolute inset-0 -m-[6px]" aria-hidden="true" />
        </div>
        <div
          className="flex-1 min-w-0"
          onClick={() => onEdit(task)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(task); } }}
          aria-label={`Editar misión ${task.title}`}
        >
          <div className="flex items-center gap-2">
            {projectColor && <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: projectColor }} />}
            <p className={cn("text-sm font-medium cursor-pointer hover:text-primary transition-colors", isDone && "line-through text-muted-foreground")}>
              {task.title}
            </p>
          </div>
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityConfig[task.priority].class)}>
              {priorityConfig[task.priority].label}
            </Badge>
            {!isDone && (
              <span className="flex items-center gap-0.5 text-[10px] font-pixel text-yellow-400/70">
                <Zap className="h-3 w-3" /> +{XP_REWARDS[task.priority]}
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(task.due_date), "d MMM", { locale: es })}
              </span>
            )}
            {task.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(task.id)}
          aria-label={`Eliminar misión ${task.title}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      {subtasks.length > 0 && (
        <div className="ml-8 mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Ocultar" : "Mostrar"} subtareas de ${task.title}`}
          >
            {expanded ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : <ChevronRight className="h-3 w-3" aria-hidden="true" />}
            {subtasks.filter((s) => s.status === "done").length}/{subtasks.length} subtareas
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1.5" role="list" aria-label={`Subtareas de ${task.title}`}>
              {subtasks.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center gap-2"
                  aria-label={`Subtarea ${sub.title}: ${sub.status === "done" ? "completada" : "pendiente"}`}
                >
                  <div className="relative flex items-center justify-center">
                    <Checkbox
                      checked={sub.status === "done"}
                      onCheckedChange={() => onToggleSubtask(sub)}
                      className="h-7 w-7"
                      aria-label={sub.status === "done" ? `Marcar subtarea "${sub.title}" como pendiente` : `Marcar subtarea "${sub.title}" como completada`}
                    />
                    <div className="absolute inset-0 -m-[8px]" aria-hidden="true" />
                  </div>
                  <span className={cn("text-xs", sub.status === "done" && "line-through text-muted-foreground")}>{sub.title}</span>
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
