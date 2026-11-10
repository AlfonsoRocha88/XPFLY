import { cn } from "@/lib/utils";
import { PRIORITIES, PRIORITY_META, XP_REWARDS } from "@/lib/xp";
import type { TaskForm } from "./useTaskForm";

const PriorityPills = ({ form }: { form: TaskForm }) => (
  <div role="radiogroup" aria-label="Prioridad" className="grid grid-cols-4 gap-1.5">
    {PRIORITIES.map((p) => {
      const meta = PRIORITY_META[p];
      const active = form.priority === p;
      return (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => form.pickPriority(p)}
          style={{ "--pill": meta.color } as React.CSSProperties}
          className={cn(
            "flex flex-col items-center rounded-xl border py-2 text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-95",
            active
              ? "border-[color:var(--pill)] bg-[color:var(--pill)] text-white"
              : "border-border bg-background text-muted-foreground hover:border-[color:var(--pill)] hover:text-foreground",
          )}
        >
          <span className="flex items-center gap-1">
            {!active && <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--pill)]" aria-hidden />}
            {meta.label}
          </span>
          <span className={cn("tabular-nums", active ? "text-white/85" : "text-muted-foreground/80")}>+{XP_REWARDS[p]}</span>
        </button>
      );
    })}
  </div>
);

export default PriorityPills;
