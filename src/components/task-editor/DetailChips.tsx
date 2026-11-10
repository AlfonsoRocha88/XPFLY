import { useState } from "react";
import { addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, CalendarDays, Clock, Plus, Repeat, StickyNote, Tag, X, type LucideIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { dayLabel } from "./labels";
import type { DetailKey, RecurrenceUnit, TaskForm } from "./useTaskForm";

const REMINDER_PRESETS = [5, 10, 30, 60, 1440];
const SUGGESTED_TAGS = ["ejercicio", "meditar", "nutricion", "estudio", "lectura", "finanzas", "creativo"];
const reminderLabel = (m: number) => (m < 60 ? `${m} min` : m % 1440 === 0 ? `${m / 1440} d` : m % 60 === 0 ? `${m / 60} h` : `${m} min`);

const fieldCls = "h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const optionCls = (active: boolean) =>
  cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground");

const Row = ({ icon: Icon, label, onRemove, children }: { icon: LucideIcon; label: string; onRemove: () => void; children: React.ReactNode }) => (
  <div className="animate-detail-in flex gap-3 py-2.5">
    <Icon className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    <div className="min-w-0 flex-1 space-y-2">
      <p className="sr-only">{label}</p>
      {children}
    </div>
    <button type="button" onClick={onRemove} aria-label={`Quitar ${label.toLowerCase()}`} className="mt-1.5 h-6 w-6 shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
      <X className="h-4 w-4" />
    </button>
  </div>
);

const DetailChips = ({ form }: { form: TaskForm }) => {
  const [tagInput, setTagInput] = useState("");
  const isDaily = form.kind === "daily";
  const hasTime = !!form.effectiveTime;
  const p = form.parsed;

  // The date/time rows also appear when smart typing filled them, so they can be fine-tuned.
  const shown = (k: DetailKey) =>
    form.open.has(k) || (k === "date" && !!p?.date) || (k === "time" && !!p?.time);

type Chip = { key: DetailKey; icon: LucideIcon; label: string };
  const taskOnly: Chip[] = [
    { key: "date", icon: CalendarDays, label: "Fecha" },
    { key: "time", icon: Clock, label: "Hora" },
    ...(hasTime ? [{ key: "reminder", icon: Bell, label: "Recordatorio" } as Chip] : []),
    { key: "repeat", icon: Repeat, label: "Repetir" },
  ];
  const always: Chip[] = [
    { key: "tags", icon: Tag, label: "Etiqueta" },
    { key: "note", icon: StickyNote, label: "Nota" },
  ];
  const available = [...(isDaily ? [] : taskOnly), ...always].filter((c) => !shown(c.key));

  const openTime = () => {
    form.toggleOpen("time");
    if (!form.effectiveTime) form.pickTime("09:00");
  };

  const today = new Date();
  const date = form.effectiveDate;

  return (
    <div>
      <div className="divide-y divide-border/70">
        {!isDaily && shown("date") && (
          <Row icon={CalendarDays} label="Fecha" onRemove={() => form.closeDetail("date")}>
            <div className="flex flex-wrap items-center gap-1.5">
              {[{ l: "Hoy", d: today }, { l: "Mañana", d: addDays(today, 1) }].map(({ l, d }) => (
                <button key={l} type="button" onClick={() => form.pickDate(d)} className={optionCls(!!date && isSameDay(date, d))}>
                  {l}
                </button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={optionCls(!!date && !isSameDay(date, today) && !isSameDay(date, addDays(today, 1)))}>
                    {date && !isSameDay(date, today) && !isSameDay(date, addDays(today, 1)) ? dayLabel(date) : "Otro día…"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" locale={es} selected={date ?? undefined} onSelect={(d) => form.pickDate(d ?? null)} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </Row>
        )}

        {!isDaily && shown("time") && (
          <Row icon={Clock} label="Hora" onRemove={() => form.closeDetail("time")}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="time" aria-label="Hora de inicio" value={form.effectiveTime ?? ""} onChange={(e) => form.pickTime(e.target.value || null)} className={fieldCls} />
              <span>a</span>
              <input type="time" aria-label="Hora de fin" value={form.endTime ?? ""} onChange={(e) => form.setEndTime(e.target.value || null)} className={fieldCls} />
            </div>
            {!form.endTime && <p className="text-xs text-muted-foreground">Sin hora de fin dura 1 hora en el calendario.</p>}
          </Row>
        )}

        {!isDaily && hasTime && form.open.has("reminder") && (
          <Row icon={Bell} label="Recordatorio" onRemove={() => form.closeDetail("reminder")}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Avisarme</span>
              {[...new Set([...REMINDER_PRESETS, ...form.reminders])].sort((a, b) => a - b).map((m) => {
                const on = form.reminders.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    onClick={() => form.setReminders(on ? form.reminders.filter((x) => x !== m) : [...form.reminders, m].sort((a, b) => a - b))}
                    className={optionCls(on)}
                  >
                    {reminderLabel(m)}
                  </button>
                );
              })}
              <span className="text-xs text-muted-foreground">antes</span>
            </div>
          </Row>
        )}

        {!isDaily && form.open.has("repeat") && (
          <Row icon={Repeat} label="Repetir" onRemove={() => form.closeDetail("repeat")}>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Cada</span>
              <input
                type="number" min={1} aria-label="Intervalo"
                value={form.repeatEvery ?? 1}
                onChange={(e) => form.setRepeatEvery(Math.max(1, parseInt(e.target.value || "1")))}
                className={cn(fieldCls, "w-16")}
              />
              <Select value={form.repeatUnit} onValueChange={(v) => form.setRepeatUnit(v as RecurrenceUnit)}>
                <SelectTrigger className="h-9 w-28" aria-label="Unidad"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">horas</SelectItem>
                  <SelectItem value="day">días</SelectItem>
                  <SelectItem value="week">semanas</SelectItem>
                  <SelectItem value="month">meses</SelectItem>
                </SelectContent>
              </Select>
              <span>durante</span>
              <input
                type="number" min={1} aria-label="Duración en días"
                value={form.repeatForDays}
                onChange={(e) => form.setRepeatForDays(Math.max(1, parseInt(e.target.value || "1")))}
                className={cn(fieldCls, "w-16")}
              />
              <span>días</span>
            </div>
          </Row>
        )}

        {form.open.has("tags") && (
          <Row icon={Tag} label="Etiquetas" onRemove={() => form.closeDetail("tags")}>
            <div className="flex flex-wrap items-center gap-1.5">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2.5 pr-1 text-xs font-medium">
                  {t}
                  <button type="button" onClick={() => form.setTags(form.tags.filter((x) => x !== t))} aria-label={`Quitar etiqueta ${t}`} className="rounded-full p-0.5 hover:bg-background">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    if (form.addTag(tagInput)) setTagInput("");
                  }
                }}
                onBlur={() => form.addTag(tagInput) && setTagInput("")}
                placeholder={form.tags.length ? "Otra…" : "Escribe y pulsa Enter"}
                aria-label="Nueva etiqueta"
                className="h-7 min-w-[8rem] flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
            {/* Suggested tags feed the Bienestar and Conocimiento achievements */}
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_TAGS.filter((t) => !form.tags.includes(t)).map((t) => (
                <button key={t} type="button" onClick={() => form.addTag(t)} className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground">
                  #{t}
                </button>
              ))}
            </div>
          </Row>
        )}

        {form.open.has("note") && (
          <Row icon={StickyNote} label="Nota" onRemove={() => form.closeDetail("note")}>
            <Textarea autoFocus value={form.note} onChange={(e) => form.setNote(e.target.value)} placeholder="Detalles, enlaces, pasos…" rows={2} className="resize-none" />
          </Row>
        )}
      </div>

      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {available.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => (key === "time" ? openTime() : form.toggleOpen(key))}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-solid hover:border-primary/40 hover:text-foreground active:scale-95"
            >
              <Plus className="h-3 w-3" aria-hidden />
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DetailChips;
