import { useState, useCallback } from "react";
import type { Task, TaskStatus } from "@/lib/types";
import type { Project } from "@/lib/types";
import TaskCard from "./TaskCard";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface KanbanViewProps {
  tasks: Task[];
  subtasks: Task[];
  projects: Project[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (task: Task) => void;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}

const columns: { id: TaskStatus; label: string; colorClass: string }[] = [
  { id: "todo", label: "Por hacer", colorClass: "bg-[hsl(215,15%,55%)]" },
  { id: "in_progress", label: "En progreso", colorClass: "bg-[hsl(250,80%,65%)]" },
  { id: "done", label: "Hecho", colorClass: "bg-[hsl(142,60%,50%)]" },
];

const SortableTask = ({ task, ...props }: { task: Task } & Omit<React.ComponentProps<typeof TaskCard>, "task">) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} {...props} />
    </div>
  );
};

const KanbanView = ({ tasks, subtasks, projects, onToggleComplete, onEdit, onDelete, onToggleSubtask, onMoveTask }: KanbanViewProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const handleDelete = useCallback((id: string) => {
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => onDelete(id), 280);
  }, [onDelete]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    if (columns.some((c) => c.id === overId)) {
      onMoveTask(taskId, overId as TaskStatus);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 h-full" role="region" aria-label="Tablero Kanban de misiones">
        {columns.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col rounded-xl bg-muted/30 p-3" role="group" aria-labelledby={`kanban-col-${col.id}`}>
              <div className="mb-3 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${col.colorClass}`} aria-hidden="true" />
                <h3 id={`kanban-col-${col.id}`} className="text-sm font-semibold">{col.label}</h3>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{columnTasks.length}</span>
              </div>
              <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy} id={col.id}>
                <div className="flex-1 space-y-2 overflow-auto" role="list" aria-label={`Columna ${col.label}, ${columnTasks.length} misiones`}>
                  {columnTasks.map((task) => {
                    const taskSubtasks = subtasks.filter((s) => s.parent_task_id === task.id);
                    const project = projects.find((p) => p.id === task.project_id);
                    return (
                      <SortableTask
                        key={task.id}
                        task={task}
                        subtasks={taskSubtasks}
                        onToggleComplete={onToggleComplete}
                        onEdit={onEdit}
                        onDelete={handleDelete}
                        onToggleSubtask={onToggleSubtask}
                        projectColor={project?.color}
                        exiting={exitingIds.has(task.id)}
                      />
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                      Arrastra tareas aquí
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
};

export default KanbanView;
