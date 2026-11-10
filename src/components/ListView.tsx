import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DndContext, closestCenter, type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Sparkles } from "lucide-react";
import type { Project, Task } from "@/lib/types";
import TaskCard from "./TaskCard";

interface ListViewProps {
  tasks: Task[];
  subtasks: Task[];
  projects: Project[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (task: Task) => void;
  onReorder: (taskId: string, newPosition: number) => void;
  emptyMessage?: string;
}

const SortableTask = ({ task, isNew, ...props }: { task: Task; isNew: boolean } & Omit<React.ComponentProps<typeof TaskCard>, "task">) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn(isDragging && "opacity-90", isNew && "animate-task-in")}>
      <TaskCard task={task} {...props} />
    </div>
  );
};

const ListView = ({ tasks, subtasks, projects, onToggleComplete, onEdit, onDelete, onToggleSubtask, onReorder, emptyMessage }: ListViewProps) => {
  // Mouse drags after a few px; touch needs a short press so scrolling stays smooth.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
  );
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  // Tasks present on first render don't animate; ones that appear later slide in.
  const seenIds = useRef<Set<string> | null>(null);
  if (seenIds.current === null) seenIds.current = new Set(tasks.map((t) => t.id));
  const newIds = new Set(tasks.filter((t) => !seenIds.current!.has(t.id)).map((t) => t.id));
  useEffect(() => { tasks.forEach((t) => seenIds.current!.add(t.id)); }, [tasks]);

  const subtasksByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    subtasks.forEach((s) => {
      if (!s.parent_task_id) return;
      const list = map.get(s.parent_task_id) ?? [];
      list.push(s);
      map.set(s.parent_task_id, list);
    });
    return map;
  }, [subtasks]);

  const projectColors = useMemo(() => new Map(projects.map((p) => [p.id, p.color])), [projects]);

  const handleDelete = useCallback((id: string) => {
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => onDelete(id), 280);
  }, [onDelete]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(active.id as string, tasks.findIndex((t) => t.id === over.id));
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/70 px-6 py-10 text-center" role="status">
        <Sparkles className="h-6 w-6 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">{emptyMessage ?? "No tienes tareas pendientes."}</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5" role="list" aria-label={`Lista de tareas, ${tasks.length} en total`}>
          {tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              isNew={newIds.has(task.id)}
              subtasks={subtasksByParent.get(task.id) ?? []}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={handleDelete}
              onToggleSubtask={onToggleSubtask}
              projectColor={task.project_id ? projectColors.get(task.project_id) : undefined}
              exiting={exitingIds.has(task.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default ListView;
