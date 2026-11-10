import { CalendarDays, Clock, Flag, X } from "lucide-react";
import type { QuickKind } from "@/lib/quickParse";
import { PRIORITY_META } from "@/lib/xp";
import { dayLabel } from "./labels";
import type { TaskForm } from "./useTaskForm";

interface Props {
  form: TaskForm;
  onSubmit: () => void;
}

const QuickInput = ({ form, onSubmit }: Props) => {
  const p = form.parsed;

  const chips: { kind: QuickKind; icon: typeof Clock; label: string }[] = [];
  if (p?.date) chips.push({ kind: "date", icon: CalendarDays, label: dayLabel(p.date.value) });
  if (p?.time) chips.push({ kind: "time", icon: Clock, label: p.time.value });
  if (p?.priority) chips.push({ kind: "priority", icon: Flag, label: PRIORITY_META[p.priority.value].label });

  return (
    <div>
      <label htmlFor="task-title" className="sr-only">Título</label>
      <input
        id="task-title"
        data-demo="task-title-input"
        value={form.text}
        onChange={(e) => form.setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
        }}
        placeholder={form.kind === "daily" ? "Ej. Leer 20 minutos" : form.editing ? "Título" : "Ej. Gimnasio mañana 7pm"}
        autoComplete="off"
        enterKeyHint="done"
        className="w-full bg-transparent font-serif text-2xl font-medium tracking-tight text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
      />
      {/* Same height whether or not chips are present, so the form doesn't jump while typing. */}
      <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5" aria-live="polite">
        {chips.length > 0 && <span className="text-xs text-muted-foreground">Detecté</span>}
        {chips.map(({ kind, icon: Icon, label }) => (
          <span key={kind} className="animate-chip-in inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2 pr-1 text-xs font-medium text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
            <button
              type="button"
              onClick={() => form.ignore(kind)}
              className="rounded-full p-0.5 hover:bg-primary/15"
              aria-label={`Quitar ${label} y dejarlo en el título`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {chips.length > 0 && form.title && (
          <span className="w-full text-xs text-muted-foreground">
            Se guarda como <span className="font-medium text-foreground">«{form.title}»</span>
          </span>
        )}
        {!form.editing && chips.length === 0 && form.kind === "task" && (
          <span className="text-xs text-muted-foreground">Escribe la fecha u hora y la detecto: «mañana», «lunes», «7pm»</span>
        )}
      </div>
    </div>
  );
};

export default QuickInput;
