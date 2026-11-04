import { useState, useCallback } from "react";
import type { Task } from "@/lib/types";
import type { Project } from "@/lib/types";
import TaskCard from "./TaskCard";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ListViewProps {
  tasks: Task[];
  subtasks: Task[];
  projects: Project[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (task: Task) => void;
  onReorder: (taskId: string, newPosition: number) => void;
}

const SortableTask = ({ task, ...props }: { task: Task } & Omit<React.ComponentProps<typeof TaskCard>, "task">) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} {...props} />
    </div>
  );
};

const ListView = ({ tasks, subtasks, projects, onToggleComplete, onEdit, onDelete, onToggleSubtask, onReorder }: ListViewProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const handleDelete = useCallback((id: string) => {
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => onDelete(id), 280);
  }, [onDelete]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    onReorder(active.id as string, newIndex);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border" role="status">
        <p className="text-sm text-muted-foreground">No hay tareas. ¡Crea una nueva!</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2" role="list" aria-label={`Lista de misiones, ${tasks.length} en total`}>
          {tasks.map((task) => {
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
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default ListView;
