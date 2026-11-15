import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wheel } from "@/components/ui/wheel-picker";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playSfx } from "@/lib/sfx";
import type { Task, TaskInsert } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, edit this existing block instead of creating new ones. */
  block?: Task | null;
}

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const TO_JS_DOW = [1, 2, 3, 4, 5, 6, 0]; // our 0=Mon..6=Sun → Date.getDay()
const DAY_PRESETS: { label: string; days: number[] }[] = [
  { label: "Entre semana", days: [0, 1, 2, 3, 4] },
  { label: "Fin de semana", days: [5, 6] },
  { label: "Todos", days: [0, 1, 2, 3, 4, 5, 6] },
];
const COLORS = ["#8b7bff", "#3b82f6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899"];
const BLOCK_TAG = "tipo:horario";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const AMPM = ["AM", "PM"] as const;
const COUNTS = Array.from({ length: 52 }, (_, i) => i + 1);
const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes since midnight ⇄ 12 h wheel parts. */
const split = (mins: number) => {
  const h24 = Math.floor(mins / 60) % 24;
  return { h12: h24 % 12 === 0 ? 12 : h24 % 12, m: mins % 60, pm: h24 >= 12 };
};
const join = (h12: number, m: number, pm: boolean) => ((h12 % 12) + (pm ? 12 : 0)) * 60 + m;
const label12 = (mins: number) => {
  const { h12, m, pm } = split(mins);
  return `${h12}:${pad(m)} ${pm ? "PM" : "AM"}`;
};
const minsOf = (iso: string | null | undefined, fallback: number) => {
  if (!iso) return fallback;
  const d = new Date(iso);
  return d.getHours() * 60 + Math.round(d.getMinutes() / 5) * 5;
};
const colorOf = (t?: Task | null) => (t?.tags ?? []).find((x) => x.startsWith("color:"))?.slice(6) ?? COLORS[0];
const seriesOf = (t?: Task | null) => (t?.tags ?? []).find((x) => x.startsWith("serie:")) ?? null;

function TimeWheels({ value, onChange, label }: { value: number; onChange: (mins: number) => void; label: string }) {
  const { h12, m, pm } = split(value);
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-muted/50 px-1.5">
      <Wheel label={`${label}: hora`} items={HOURS} value={h12 - 1} onChange={(i) => onChange(join(i + 1, m, pm))} className="w-12" />
      <span className="pb-0.5 text-lg font-semibold text-muted-foreground">:</span>
      <Wheel label={`${label}: minutos`} items={MINUTES} value={m / 5} format={pad} onChange={(i) => onChange(join(h12, i * 5, pm))} className="w-12" />
      <Wheel label={`${label}: AM o PM`} items={AMPM} value={pm ? 1 : 0} onChange={(i) => onChange(join(h12, m, i === 1))} className="w-14" />
    </div>
  );
}

/** Dates (local) on which the block repeats, from today, for the chosen days and horizon. */
function occurrenceDays(days: number[], count: number, unit: "days" | "weeks") {
  const today = startOfDay(new Date());
  const end = unit === "weeks" ? addWeeks(today, count) : addDays(today, count);
  const want = new Set(days.map((d) => TO_JS_DOW[d]));
  const out: Date[] = [];
  for (let c = today; c < end; c = addDays(c, 1)) if (want.has(c.getDay())) out.push(c);
  return out;
}

const at = (day: Date, mins: number) => {
  const d = new Date(day);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d.toISOString();
};

export default function ScheduleBlockDialog({ open, onOpenChange, block }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const editing = !!block;

  const [name, setName] = useState(block?.title ?? "");
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState(minsOf(block?.start_time, 9 * 60));
  const [end, setEnd] = useState(minsOf(block?.end_time, 10 * 60));
  const [color, setColor] = useState(colorOf(block));
  const [countIdx, setCountIdx] = useState(3); // 4
  const [unit, setUnit] = useState<"days" | "weeks">("weeks");
  const [scope, setScope] = useState<"one" | "series">("one");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(block?.title ?? "");
    setDays([]);
    setStart(minsOf(block?.start_time, 9 * 60));
    setEnd(minsOf(block?.end_time, 10 * 60));
    setColor(colorOf(block));
    setCountIdx(3); setUnit("weeks"); setScope("one");
  }, [open, block]);

  const count = COUNTS[countIdx];
  const dates = useMemo(() => (editing ? [] : occurrenceDays(days, count, unit)), [editing, days, count, unit]);
  const duration = end - start;
  const durationLabel = duration > 0 ? `${Math.floor(duration / 60) ? `${Math.floor(duration / 60)} h ` : ""}${duration % 60 ? `${duration % 60} min` : ""}`.trim() : null;

  const toggleDay = (i: number) => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));
  const close = () => onOpenChange(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["all-tasks"] });

  /** Rows of the same series from this block on (legacy blocks without a series id: same title). */
  const seriesRows = async () => {
    if (!block || !user) return [];
    const tag = seriesOf(block);
    let q = supabase.from("tasks").select("id, start_time, end_time, tags").eq("user_id", user.id).contains("tags", [tag ?? BLOCK_TAG]).gte("start_time", block.start_time ?? new Date().toISOString());
    if (!tag) q = q.eq("title", block.title);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  };

  const save = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error("Ponle un nombre"); return; }
    if (duration <= 0) { toast.error("La hora de fin debe ser después del inicio"); return; }
    setSaving(true);
    try {
      const tagsWith = (tags: string[] | null) => [...(tags ?? []).filter((t) => !t.startsWith("color:")), `color:${color}`];
      if (editing && block) {
        const rows = scope === "series" ? await seriesRows() : [{ id: block.id, start_time: block.start_time, end_time: block.end_time, tags: block.tags }];
        const results = await Promise.all(rows.map((r) => {
          const day = startOfDay(new Date(r.start_time ?? Date.now()));
          return supabase.from("tasks").update({ title: name.trim(), start_time: at(day, start), end_time: at(day, end), tags: tagsWith(r.tags) }).eq("id", r.id);
        }));
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
        toast.success(rows.length > 1 ? `${rows.length} bloques actualizados` : "Bloque actualizado");
      } else {
        if (days.length === 0) { toast.error("Elige al menos un día"); setSaving(false); return; }
        if (dates.length === 0) { toast.error("No hay fechas que coincidan"); setSaving(false); return; }
        const serie = `serie:${crypto.randomUUID()}`;
        const rows: TaskInsert[] = dates.map((d) => ({
          user_id: user.id, title: name.trim(), is_daily: false, status: "todo", priority: "medium",
          start_time: at(d, start), end_time: at(d, end), tags: [`color:${color}`, BLOCK_TAG, serie],
        }));
        const { error } = await supabase.from("tasks").insert(rows);
        if (error) throw error;
        toast.success(rows.length === 1 ? "Bloque creado" : `${rows.length} bloques creados`);
      }
      playSfx("create");
      refresh();
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el horario");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!block) return;
    setSaving(true);
    try {
      const ids = scope === "series" ? (await seriesRows()).map((r) => r.id) : [block.id];
      const { error } = await supabase.from("tasks").delete().in("id", ids);
      if (error) throw error;
      toast.success(ids.length > 1 ? `${ids.length} bloques eliminados` : "Bloque eliminado");
      refresh();
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setSaving(false);
    }
  };

  const lastDate = dates.at(-1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] max-w-md gap-0 overflow-y-auto rounded-3xl p-0"
        // Don't focus the name field on open: on a phone that pops the keyboard over the wheels.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-5 p-5">
          <div className="flex items-center gap-3 pr-8">
            <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold">{editing ? "Editar bloque" : "Bloque de horario"}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {editing && block?.start_time
                  ? format(new Date(block.start_time), "EEEE d 'de' MMMM", { locale: es })
                  : "Aparece en tu calendario, sin XP"}
              </DialogDescription>
            </div>
          </div>

          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre, p. ej. Gimnasio"
            className="h-12 rounded-2xl text-base"
            maxLength={60}
          />

          {!editing && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Días</h3>
                <div className="flex gap-1">
                  {DAY_PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => setDays(p.days)} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_LABELS.map((lbl, i) => {
                  const on = days.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={on}
                      aria-label={DAY_NAMES[i]}
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "aspect-square rounded-full text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-90",
                        on ? "text-white shadow-soft" : "bg-muted/60 text-muted-foreground",
                      )}
                      style={on ? { background: color } : undefined}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Horario</h3>
              <span className="text-xs font-medium text-muted-foreground">
                {label12(start)} – {label12(end)}{durationLabel ? ` · ${durationLabel}` : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="px-1 text-xs font-medium text-muted-foreground">Empieza</p>
                <TimeWheels label="Empieza" value={start} onChange={(v) => { setStart(v); if (v >= end) setEnd(Math.min(v + 60, 23 * 60 + 55)); }} />
              </div>
              <div className="space-y-1">
                <p className="px-1 text-xs font-medium text-muted-foreground">Termina</p>
                <TimeWheels label="Termina" value={end} onChange={setEnd} />
              </div>
            </div>
            {duration <= 0 && <p className="px-1 text-xs font-medium text-destructive">La hora de fin debe ser después del inicio</p>}
          </section>

          {!editing && (
            <section className="space-y-2.5">
              <h3 className="text-sm font-semibold">Repetir durante</h3>
              <div className="flex items-center gap-3">
                <div className="w-20 rounded-2xl bg-muted/50 px-1.5">
                  <Wheel label="Repetir durante" items={COUNTS} value={countIdx} onChange={setCountIdx} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  {(["days", "weeks"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={cn(
                        "rounded-xl py-2.5 text-sm font-semibold transition-colors",
                        unit === u ? "bg-primary/15 text-primary ring-1 ring-primary/40" : "bg-muted/50 text-muted-foreground",
                      )}
                    >
                      {u === "days" ? (count === 1 ? "día" : "días") : (count === 1 ? "semana" : "semanas")}
                    </button>
                  ))}
                  <p className="px-1 text-xs text-muted-foreground">
                    {days.length === 0
                      ? "Elige los días arriba"
                      : dates.length === 0
                        ? "Ningún día cae en ese periodo"
                        : `${dates.length} ${dates.length === 1 ? "bloque" : "bloques"}, hasta el ${format(lastDate!, "d MMM", { locale: es })}`}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold">Color</h3>
            <div className="flex justify-between px-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  className={cn("h-8 w-8 rounded-full transition-transform duration-150 active:scale-90", color === c && "scale-110 ring-2 ring-foreground/80 ring-offset-2 ring-offset-background")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </section>

          {editing && (
            <div className="flex rounded-2xl bg-muted/50 p-1" role="radiogroup" aria-label="Aplicar a">
              {([["one", "Solo este"], ["series", "Este y los siguientes"]] as const).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={scope === id}
                  onClick={() => setScope(id)}
                  className={cn("flex-1 rounded-xl py-2 text-sm font-medium transition-colors", scope === id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground")}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-border/60 bg-background/90 p-4 backdrop-blur" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          {editing ? (
            <Button variant="ghost" size="icon" onClick={remove} disabled={saving} aria-label="Eliminar" className="h-12 w-12 shrink-0 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" onClick={close} className="h-12 rounded-2xl px-5">Cancelar</Button>
          )}
          <Button onClick={save} disabled={saving || duration <= 0} className="h-12 flex-1 rounded-2xl text-base font-semibold">
            {saving ? "Guardando…" : editing ? "Guardar cambios" : dates.length > 1 ? `Crear ${dates.length} bloques` : "Crear bloque"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
