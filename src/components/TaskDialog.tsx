import { useState } from "react";
import { format } from "date-fns";
import type { Task, TaskPriority, TaskStatus, Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, X, RotateCcw, Clock, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";

type RecurrenceUnit = "hour" | "day" | "week" | "month";

export interface TaskDialogData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  project_id: string | null;
  tags: string[];
  is_daily: boolean;
  start_time: string | null;
  end_time: string | null;
  recurrence_interval: number | null;
  recurrence_unit: RecurrenceUnit | null;
  recurrence_end_date: string | null;
  reminders: number[];
  daily_days: number[];
}

interface TaskDialogProps {
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

const toLocalDateInput = (iso: string | null | undefined) =>
  iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "";

const fromLocalDateInput = (val: string): string | null =>
  val ? new Date(val).toISOString() : null;

const TaskDialog = ({ open, onOpenChange, task, projects, defaultProjectId, defaultDate, onSave, onAddSubtask, subtasks = [] }: TaskDialogProps) => {
  const initialStart = task?.start_time ?? (defaultDate ? new Date(defaultDate.setHours(9, 0, 0, 0)).toISOString() : null);
  const initialEnd = task?.end_time ?? (defaultDate ? new Date(new Date(defaultDate).setHours(10, 0, 0, 0)).toISOString() : null);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [dueDate, setDueDate] = useState<Date | undefined>(task?.due_date ? new Date(task.due_date) : (defaultDate ?? undefined));
  const [projectId, setProjectId] = useState<string>(task?.project_id ?? defaultProjectId ?? "none");
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [isDaily, setIsDaily] = useState(task?.is_daily ?? false);
  const [dailyDays, setDailyDays] = useState<number[]>(((task as any)?.daily_days as number[] | undefined) ?? []);
  const [tagInput, setTagInput] = useState("");
  const [subtaskInput, setSubtaskInput] = useState("");

  // Schedule - split date and time pickers
  const parseIso = (iso: string | null) => (iso ? new Date(iso) : null);
  const initialStartDate = parseIso(initialStart);
  const initialEndDate = parseIso(initialEnd);

  const [hasSchedule, setHasSchedule] = useState(!!(task?.start_time || initialStart));
  const [startDate, setStartDate] = useState<Date | undefined>(initialStartDate ?? undefined);
  const [startTime, setStartTime] = useState<string>(initialStartDate ? format(initialStartDate, "HH:mm") : "09:00");
  const [endDate, setEndDate] = useState<Date | undefined>(initialEndDate ?? undefined);
  const [endTime, setEndTime] = useState<string>(initialEndDate ? format(initialEndDate, "HH:mm") : "10:00");

  const combineDateTime = (d: Date | undefined, t: string): string | null => {
    if (!d) return null;
    const [h, m] = t.split(":").map(Number);
    const out = new Date(d);
    out.setHours(h || 0, m || 0, 0, 0);
    return out.toISOString();
  };

  const handleStartDateChange = (d: Date | undefined) => {
    setStartDate(d);
    if (d && !endDate) setEndDate(d);
  };

  // Recurrence
  const computeInitialRecurrenceDays = (): number => {
    if (task?.recurrence_end_date) {
      const diff = Math.ceil((new Date(task.recurrence_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return Math.max(1, diff);
    }
    return 7;
  };
  const [hasRecurrence, setHasRecurrence] = useState(!!(task?.recurrence_interval && task?.recurrence_unit));
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(task?.recurrence_interval ?? 1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>((task?.recurrence_unit as RecurrenceUnit) ?? "day");
  const [recurrenceDays, setRecurrenceDays] = useState<number>(computeInitialRecurrenceDays());

  // Reminders (minutes before start_time) — Google Calendar style
  const [reminders, setReminders] = useState<number[]>(((task as any)?.reminders as number[] | undefined) ?? []);
  const [reminderInput, setReminderInput] = useState<string>("10");

  const formatReminder = (mins: number) => {
    if (mins < 60) return `${mins} min antes`;
    if (mins % 60 === 0) {
      const h = mins / 60;
      if (h < 24) return `${h} h antes`;
      const d = h / 24;
      if (d % 1 === 0) return `${d} día${d > 1 ? "s" : ""} antes`;
    }
    return `${mins} min antes`;
  };

  const addReminder = (mins: number) => {
    const v = Math.max(0, Math.floor(mins));
    if (reminders.includes(v)) return;
    setReminders([...reminders, v].sort((a, b) => a - b));
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const startIso = hasSchedule ? combineDateTime(startDate, startTime) : null;
    const endIso = hasSchedule ? combineDateTime(endDate ?? startDate, endTime) : null;
    let recurrenceEndIso: string | null = null;
    if (hasRecurrence && recurrenceDays > 0) {
      const base = startDate ?? new Date();
      const end = new Date(base);
      end.setDate(end.getDate() + recurrenceDays);
      recurrenceEndIso = end.toISOString();
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority: isDaily ? "urgent" : priority,
      status,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : (startIso ? format(new Date(startIso), "yyyy-MM-dd") : null),
      project_id: projectId === "none" ? null : projectId,
      tags,
      is_daily: isDaily,
      start_time: startIso,
      end_time: endIso,
      recurrence_interval: hasRecurrence ? recurrenceInterval : null,
      recurrence_unit: hasRecurrence ? recurrenceUnit : null,
      recurrence_end_date: recurrenceEndIso,
      reminders: hasSchedule ? reminders : [],
      daily_days: isDaily ? dailyDays : [],
    });
    onOpenChange(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    // Reserved tag used by schedule blocks — never allow from mission form
    if (t && t.toLowerCase() !== "tipo:horario" && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const handleAddSubtask = () => {
    if (subtaskInput.trim() && onAddSubtask) {
      onAddSubtask(subtaskInput.trim());
      setSubtaskInput("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar misión" : "Nueva misión"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input data-demo="task-title-input" placeholder="Título de la misión" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

          {!isDaily && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Prioridad</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Baja</SelectItem>
                  <SelectItem value="medium">🟡 Media</SelectItem>
                  <SelectItem value="high">🟠 Alta</SelectItem>
                  <SelectItem value="urgent">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Fecha límite</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          )}

          {/* Schedule */}
          {!isDaily && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <p className="text-sm font-medium">Horario en calendario</p>
              </div>
              <Switch checked={hasSchedule} onCheckedChange={setHasSchedule} />
            </div>
            {hasSchedule && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Inicio</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : "Fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={handleStartDateChange} className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: 96 }, (_, i) => {
                          const h = String(Math.floor(i / 4)).padStart(2, "0");
                          const m = String((i % 4) * 15).padStart(2, "0");
                          return `${h}:${m}`;
                        }).map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Fin</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "dd/MM/yyyy") : "Fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: 96 }, (_, i) => {
                          const h = String(Math.floor(i / 4)).padStart(2, "0");
                          const m = String((i % 4) * 15).padStart(2, "0");
                          return `${h}:${m}`;
                        }).map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Reminders */}
                <div className="rounded-md border border-border/60 bg-background/40 p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-yellow-400" />
                    <p className="text-xs font-medium">Recordatorios</p>
                  </div>
                  {reminders.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {reminders.map((m) => (
                        <Badge key={m} variant="secondary" className="gap-1">
                          {formatReminder(m)}
                          <button onClick={() => setReminders(reminders.filter((x) => x !== m))}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      value={reminderInput}
                      onChange={(e) => setReminderInput(e.target.value)}
                      className="w-20 h-8"
                    />
                    <span className="text-xs text-muted-foreground">min antes</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const v = parseInt(reminderInput || "0");
                        if (!isNaN(v)) addReminder(v);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Añadir
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[5, 10, 15, 30, 60, 1440].map((m) => (
                      <Button
                        key={m}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => addReminder(m)}
                      >
                        +{formatReminder(m)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Recurrence */}
          {!isDaily && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-sm font-medium">Repetir</p>
                  <p className="text-xs text-muted-foreground">Ej: cada 12 horas, durante 7 días</p>
                </div>
              </div>
              <Switch checked={hasRecurrence} onCheckedChange={setHasRecurrence} />
            </div>
            {hasRecurrence && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Cada</span>
                  <Input
                    type="number"
                    min={1}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value || "1")))}
                    className="w-20"
                  />
                  <Select value={recurrenceUnit} onValueChange={(v) => setRecurrenceUnit(v as RecurrenceUnit)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Horas</SelectItem>
                      <SelectItem value="day">Días</SelectItem>
                      <SelectItem value="week">Semanas</SelectItem>
                      <SelectItem value="month">Meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Repetir durante</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={recurrenceDays}
                      onChange={(e) => setRecurrenceDays(Math.max(1, parseInt(e.target.value || "1")))}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">días</span>
                  </div>
                </div>
              </>
            )}
          </div>
          )}

          {/* Daily mission toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium">Misión diaria</p>
                <p className="text-xs text-muted-foreground">Se repite cada día automáticamente</p>
              </div>
            </div>
            <Switch checked={isDaily} onCheckedChange={setIsDaily} />
          </div>

          {isDaily && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium">Días de la semana</p>
              <p className="text-xs text-muted-foreground">Vacío = todos los días</p>
              <div className="flex gap-1 flex-wrap">
                {[
                  { d: 1, l: "L" }, { d: 2, l: "M" }, { d: 3, l: "X" },
                  { d: 4, l: "J" }, { d: 5, l: "V" }, { d: 6, l: "S" }, { d: 0, l: "D" },
                ].map(({ d, l }) => {
                  const active = dailyDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDailyDays(active ? dailyDays.filter((x) => x !== d) : [...dailyDays, d].sort())}
                      className={cn(
                        "h-9 w-9 rounded-md border text-xs font-pixel transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Etiquetas</label>
            <div className="flex gap-2">
              <Input placeholder="Nueva etiqueta" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} className="flex-1" />
              <Button type="button" variant="outline" size="icon" onClick={addTag}><Plus className="h-4 w-4" /></Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Subtasks (only when editing) */}
          {task && onAddSubtask && (
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Subtareas</label>
              <div className="flex gap-2">
                <Input placeholder="Nueva subtarea" value={subtaskInput} onChange={(e) => setSubtaskInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtask())} className="flex-1" />
                <Button type="button" variant="outline" size="icon" onClick={handleAddSubtask}><Plus className="h-4 w-4" /></Button>
              </div>
              {subtasks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {subtasks.map((s) => (
                    <div key={s.id} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={cn("h-1.5 w-1.5 rounded-full", s.status === "done" ? "bg-[hsl(142,60%,50%)]" : "bg-muted-foreground")} />
                      <span className={s.status === "done" ? "line-through" : ""}>{s.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button data-demo="task-save-btn" onClick={handleSave} className="w-full">{task ? "Guardar cambios" : "Crear misión"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDialog;
