import type { Task, TaskPriority } from "@/lib/types";
import type { Project } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskFiltersProps {
  priorityFilter: string;
  onPriorityChange: (v: string) => void;
  projectFilter: string;
  onProjectChange: (v: string) => void;
  projects: Project[];
}

const TaskFilters = ({ priorityFilter, onPriorityChange, projectFilter, onProjectChange, projects }: TaskFiltersProps) => {
  const hasFilters = priorityFilter !== "all" || projectFilter !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={priorityFilter} onValueChange={onPriorityChange}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="low">🟢 Baja</SelectItem>
          <SelectItem value="medium">🟡 Media</SelectItem>
          <SelectItem value="high">🟠 Alta</SelectItem>
          <SelectItem value="urgent">🔴 Urgente</SelectItem>
        </SelectContent>
      </Select>
      <Select value={projectFilter} onValueChange={onProjectChange}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Proyecto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="none">Sin proyecto</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { onPriorityChange("all"); onProjectChange("all"); }}>
          <X className="mr-1 h-3 w-3" /> Limpiar
        </Button>
      )}
    </div>
  );
};

export default TaskFilters;
