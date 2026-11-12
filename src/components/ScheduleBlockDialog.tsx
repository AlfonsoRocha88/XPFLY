import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, addWeeks, startOfDay } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// Mapping our index (0=Mon..6=Sun) to JS Date.getDay() (0=Sun..6=Sat)
const TO_JS_DOW = [1, 2, 3, 4, 5, 6, 0];

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#a855f7", "#ec4899",
];

/* ---------- Scroll wheel time picker ---------- */

const ITEM_H = 36;
const VISIBLE = 5; // visible items (must be odd)
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

function Wheel({
  items,
  value,
  onChange,
  width = 64,
  format,
}: {
  items: (string | number)[];
  value: number;
  onChange: (idx: number) => void;
  width?: number;
  format?: (v: string | number) => string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: value * ITEM_H, behavior: "auto" });
  }, [value]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      if (clamped !== value) onChange(clamped);
    }, 110);
  };

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-muted/40 border border-border"
      style={{ width, height: VISIBLE * ITEM_H }}
    >
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
          {items.map((it, i) => (
            <div
              key={i}
              className={cn(
                "snap-center flex items-center justify-center font-pixel text-[11px] transition-colors",
                i === value ? "text-primary" : "text-muted-foreground/60"
              )}
              style={{ height: ITEM_H }}
            >
              {format ? format(it) : it}
            </div>
          ))}
        </div>
      </div>
      {/* center selection highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 border-y border-primary/40 bg-primary/5"
        style={{ top: PAD, height: ITEM_H }}
      />
    </div>
  );
}

function TimePicker({
  hour12, minute, ampm, onChange,
}: {
  hour12: number; // 1..12
  minute: number; // 0..59 (step 5)
  ampm: "AM" | "PM";
  onChange: (h: number, m: number, ap: "AM" | "PM") => void;
}) {
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 5), []);
  const ampms: ("AM" | "PM")[] = ["AM", "PM"];

  return (
    <div className="flex items-center gap-1.5">
      <Wheel
        items={hours}
        value={hour12 - 1}
        onChange={(i) => onChange(i + 1, minute, ampm)}
        format={(v) => String(v).padStart(2, "0")}
      />
      <span className="font-pixel text-primary text-sm">:</span>
      <Wheel
        items={minutes}
        value={Math.round(minute / 5)}
        onChange={(i) => onChange(hour12, i * 5, ampm)}
        format={(v) => String(v).padStart(2, "0")}
      />
      <Wheel
        items={ampms}
        value={ampm === "AM" ? 0 : 1}
        onChange={(i) => onChange(hour12, minute, ampms[i])}
        width={56}
      />
    </div>
  );
}

const to24h = (h12: number, ap: "AM" | "PM") => {
  if (ap === "AM") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
};

/* ---------- Main dialog ---------- */

export default function ScheduleBlockDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([]); // 0=Mon..6=Sun
  const [startH, setStartH] = useState(9);
  const [startM, setStartM] = useState(0);
  const [startAP, setStartAP] = useState<"AM" | "PM">("AM");
  const [endH, setEndH] = useState(10);
  const [endM, setEndM] = useState(0);
  const [endAP, setEndAP] = useState<"AM" | "PM">("AM");
  const [color, setColor] = useState(COLOR_PRESETS[5]);
  const [repeatCount, setRepeatCount] = useState(1);
  const [repeatUnit, setRepeatUnit] = useState<"days" | "weeks">("weeks");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName(""); setDays([]); setStartH(9); setStartM(0); setStartAP("AM");
      setEndH(10); setEndM(0); setEndAP("AM");
      setColor(COLOR_PRESETS[5]); setRepeatCount(1); setRepeatUnit("weeks");
    }
  }, [open]);

  const toggleDay = (i: number) =>
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error("Ponle un nombre"); return; }
    if (days.length === 0) { toast.error("Selecciona al menos un día"); return; }

    const startMins = to24h(startH, startAP) * 60 + startM;
    const endMins = to24h(endH, endAP) * 60 + endM;
    if (endMins <= startMins) { toast.error("La hora de fin debe ser posterior al inicio"); return; }

    // Build window of dates to scan
    const today = startOfDay(new Date());
    const horizonEnd =
      repeatUnit === "weeks"
        ? addWeeks(today, Math.max(1, repeatCount))
        : addDays(today, Math.max(1, repeatCount));

    const targetJsDows = new Set(days.map((d) => TO_JS_DOW[d]));
    const rows: any[] = [];
    let cursor = today;
    while (cursor < horizonEnd) {
      if (targetJsDows.has(cursor.getDay())) {
        const start = new Date(cursor);
        start.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
        const end = new Date(cursor);
        end.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);
        rows.push({
          user_id: user.id,
          title: name.trim(),
          is_daily: false,
          status: "todo",
          priority: "medium",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          tags: [`color:${color}`, "tipo:horario"],
        });
      }
      cursor = addDays(cursor, 1);
    }

    if (rows.length === 0) { toast.error("No hay fechas que coincidan"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} bloque(s) creado(s)`);
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al crear horario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-pixel text-xs text-primary">+ Horario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-pixel text-xs">Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Entrenamiento" />
          </div>

          <div className="space-y-1.5">
            <Label className="font-pixel text-xs">Día(s) de la semana</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((lbl, i) => {
                const active = days.includes(i);
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md font-pixel text-xs border transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-pixel text-xs">Hora inicio</Label>
              <TimePicker
                hour12={startH}
                minute={startM}
                ampm={startAP}
                onChange={(h, m, ap) => { setStartH(h); setStartM(m); setStartAP(ap); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-pixel text-xs">Hora fin</Label>
              <TimePicker
                hour12={endH}
                minute={endM}
                ampm={endAP}
                onChange={(h, m, ap) => { setEndH(h); setEndM(m); setEndAP(ap); }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-pixel text-xs">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-pixel text-xs">Repetir por</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={52}
                value={repeatCount}
                onChange={(e) => setRepeatCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="w-20"
              />
              <div className="flex rounded-md bg-muted p-1">
                {(["days", "weeks"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setRepeatUnit(u)}
                    className={cn(
                      "px-3 py-1 rounded font-pixel text-xs",
                      repeatUnit === u ? "bg-background text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {u === "days" ? "días" : "semanas"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="font-pixel text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="font-pixel text-xs">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
