import { cn } from "@/lib/utils";
import type { TaskForm } from "./useTaskForm";

const DAYS = [
  { d: 1, l: "L", name: "lunes" }, { d: 2, l: "M", name: "martes" }, { d: 3, l: "X", name: "miércoles" },
  { d: 4, l: "J", name: "jueves" }, { d: 5, l: "V", name: "viernes" }, { d: 6, l: "S", name: "sábado" }, { d: 0, l: "D", name: "domingo" },
];
const WEEKDAYS = [1, 2, 3, 4, 5];
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Empty selection means every day (that's how daily_days is stored). */
const DaysPicker = ({ form }: { form: TaskForm }) => {
  const days = form.dailyDays;
  const everyDay = days.length === 0 || days.length === 7;
  const toggle = (d: number) => {
    const base = everyDay ? DAYS.map((x) => x.d) : days;
    const next = base.includes(d) ? base.filter((x) => x !== d) : [...base, d];
    form.setDailyDays(next.length === 7 ? [] : next.sort());
  };

  const presets = [
    { label: "Todos los días", active: everyDay, days: [] as number[] },
    { label: "Entre semana", active: same(days, WEEKDAYS), days: WEEKDAYS },
    { label: "Fin de semana", active: same(days, [0, 6]), days: [0, 6] },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between gap-1" role="group" aria-label="Días de la semana">
        {DAYS.map(({ d, l, name }) => {
          const active = everyDay || days.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={active}
              aria-label={name}
              onClick={() => toggle(d)}
              className={cn(
                "h-10 flex-1 rounded-xl border text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-95",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {l}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => form.setDailyDays(p.days)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              p.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DaysPicker;
