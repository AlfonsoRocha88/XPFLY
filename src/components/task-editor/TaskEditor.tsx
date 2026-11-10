import { useState } from "react";
import { ListChecks, Plus, RotateCcw, Sparkles } from "lucide-react";
import type { Project, Task } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import QuickInput from "./QuickInput";
import PriorityPills from "./PriorityPills";
import DaysPicker from "./DaysPicker";
import DetailChips from "./DetailChips";
import { useTaskForm, type TaskDialogData, type TaskKind } from "./useTaskForm";

export type { TaskDialogData };

interface TaskEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projects: Project[];
  defaultProjectId?: string | null;
  defaultDate?: Date | null;
  onSave: (data: TaskDialogData) => void;
  onAddSubtask?: (title: string) => void;
  subtasks?: Task[];
}

const KINDS: { id: TaskKind; label: string; icon: typeof ListChecks }[] = [
  { id: "task", label: "Tarea", icon: ListChecks },
  { id: "daily", label: "Diaria", icon: RotateCcw },
];

function EditorBody({ task, defaultProjectId, defaultDate, onSave, onClose, onAddSubtask, subtasks = [] }: Omit<TaskEditorProps, "open" | "onOpenChange" | "projects"> & { onClose: () => void }) {
  const form = useTaskForm(task, defaultProjectId, defaultDate);
  const [subtaskInput, setSubtaskInput] = useState("");

  const submit = () => {
    const data = form.build();
    if (!data) return;
    onSave(data);
    onClose();
  };

  const addSubtask = () => {
    if (subtaskInput.trim() && onAddSubtask) {
      onAddSubtask(subtaskInput.trim());
      setSubtaskInput("");
    }
  };

  const isDaily = form.kind === "daily";
  const cta = form.editing ? "Guardar cambios" : isDaily ? "Crear diaria" : "Crear tarea";

  return (
    <form
      className="flex max-h-[inherit] flex-col"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-4 pt-5">
        {/* Kind switch */}
        <div role="radiogroup" aria-label="Tipo" className="inline-flex rounded-full bg-muted p-1">
          {KINDS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={form.kind === id}
              onClick={() => form.setKind(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                form.kind === id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <QuickInput form={form} onSubmit={submit} />

        {isDaily ? (
          <section aria-label="Días" className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Se repite estos días y se reinicia cada mañana</p>
            <DaysPicker form={form} />
          </section>
        ) : (
          <section aria-label="Prioridad" className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Prioridad</p>
            <PriorityPills form={form} />
          </section>
        )}

        <DetailChips form={form} />

        {form.editing && onAddSubtask && (
          <section aria-label="Subtareas" className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Subtareas</p>
            {subtasks.length > 0 && (
              <ul className="space-y-1">
                {subtasks.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.status === "done" ? "bg-success" : "bg-muted-foreground")} />
                    <span className={s.status === "done" ? "line-through" : ""}>{s.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-input px-2.5">
              <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
              <input
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                placeholder="Añadir subtarea"
                aria-label="Nueva subtarea"
                className="h-9 flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </section>
        )}
      </div>

      {/* Footer: XP preview + main action */}
      <div className="flex items-center gap-3 border-t border-border/70 bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1.5 text-sm" aria-live="polite">
          <Sparkles className="h-4 w-4 text-xp" aria-hidden />
          <span key={form.xp} className="animate-xp-tick font-semibold tabular-nums text-xp">+{form.xp} XP</span>
          {isDaily && <span className="text-muted-foreground">al día</span>}
        </div>
        <Button data-demo="task-save-btn" type="submit" disabled={!form.canSave} className="ml-auto rounded-full px-5 transition-transform active:scale-95">
          {cta}
        </Button>
      </div>
    </form>
  );
}

/**
 * Task creator/editor. Bottom sheet on phones, centered dialog on larger screens.
 * The body remounts on every open (keyed by the caller), so state always starts fresh.
 */
const TaskEditor = ({ open, onOpenChange, projects: _projects, ...props }: TaskEditorProps) => {
  const isMobile = useIsMobile();
  const title = props.task ? "Editar tarea" : "Nueva tarea";
  const description = "Escribe el título; fecha, hora y detalles son opcionales.";
  const body = <EditorBody {...props} onClose={() => onOpenChange(false)} />;
  // Radix focuses the container by default; send focus to the title so the keyboard opens ready to type.
  const focusTitle = (e: Event) => {
    e.preventDefault();
    document.getElementById("task-title")?.focus();
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" onOpenAutoFocus={focusTitle} className="max-h-[88dvh] gap-0 rounded-t-3xl p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">{description}</SheetDescription>
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border" aria-hidden />
          <div className="max-h-[calc(88dvh-0.875rem)]">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={focusTitle} className="max-h-[85vh] max-w-lg gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <div className="max-h-[85vh]">{body}</div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditor;
