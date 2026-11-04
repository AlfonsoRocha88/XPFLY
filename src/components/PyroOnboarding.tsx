import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import PyroSprite from "./PyroSprite";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";
import { pyroSay } from "@/hooks/usePyro";
import { toast } from "sonner";
import { enablePushNotifications } from "@/lib/push";

/* ---------- Step config ---------- */

type OptionList = ReadonlyArray<{ id: string; label: string; emoji?: string }>;

const AGE_BANDS: OptionList = [
  { id: "lt18", label: "Menos de 18", emoji: "🌱" },
  { id: "18-24", label: "18 – 24", emoji: "🔥" },
  { id: "25-34", label: "25 – 34", emoji: "⚡" },
  { id: "35-44", label: "35 – 44", emoji: "🛡️" },
  { id: "45plus", label: "45 o más", emoji: "👑" },
];

const GENDERS: OptionList = [
  { id: "male", label: "Hombre", emoji: "♂" },
  { id: "female", label: "Mujer", emoji: "♀" },
  { id: "nonbinary", label: "No binario", emoji: "⚧" },
  { id: "prefer_not", label: "Prefiero no decir", emoji: "🤐" },
];

const ENEMIES: OptionList = [
  { id: "procrastination", label: "Procrastinación", emoji: "🦥" },
  { id: "distraction", label: "Distracciones (redes, TV)", emoji: "📱" },
  { id: "anxiety", label: "Ansiedad", emoji: "😵‍💫" },
  { id: "burnout", label: "Agotamiento", emoji: "🪫" },
  { id: "perfectionism", label: "Perfeccionismo", emoji: "🧊" },
  { id: "no_routine", label: "Falta de rutina", emoji: "🌀" },
];

const AREAS: OptionList = [
  { id: "work", label: "Trabajo", emoji: "💼" },
  { id: "study", label: "Estudio", emoji: "📚" },
  { id: "health", label: "Salud y deporte", emoji: "💪" },
  { id: "creative", label: "Creatividad", emoji: "🎨" },
  { id: "home", label: "Casa y vida", emoji: "🏡" },
  { id: "money", label: "Dinero", emoji: "💸" },
];

const TIME_CAPS: OptionList = [
  { id: "lt30", label: "Menos de 30 min", emoji: "⏱️" },
  { id: "30-60", label: "30 a 60 min", emoji: "⏲️" },
  { id: "1-3h", label: "1 a 3 horas", emoji: "⏳" },
  { id: "gt3h", label: "Más de 3 horas", emoji: "🕰️" },
];

const PEAK_TIMES: OptionList = [
  { id: "morning", label: "Mañana", emoji: "🌅" },
  { id: "afternoon", label: "Tarde", emoji: "☀️" },
  { id: "night", label: "Noche", emoji: "🌙" },
  { id: "depends", label: "Depende del día", emoji: "🎲" },
];

/* ---------- Component ---------- */

export default function PyroOnboarding() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const completed: boolean = profile?.pyro_onboarding_completed ?? true;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [ageBand, setAgeBand] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [enemies, setEnemies] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [timeCap, setTimeCap] = useState<string | null>(null);
  const [peakTime, setPeakTime] = useState<string | null>(null);
  const [goal, setGoal] = useState<string>("");

  // Welcome SFX once on open
  useEffect(() => {
    if (!completed) {
      try { playSfx("open"); } catch { /* ignore */ }
    }
  }, [completed]);

  // ---- Step definitions ----
  const steps = useMemo(() => [
    {
      kind: "intro" as const,
      mood: "happy" as const,
      title: "¡Hey! Soy Pyro 🔥",
      pyro: "Soy tu compañero de misiones. Si me alimentas con tareas hechas, vivo. Si no… me apago. Antes de empezar, cuéntame quién eres. Solo 7 preguntas, lo prometo.",
      cta: "Vamos",
      canNext: true,
    },
    {
      kind: "single" as const,
      mood: "thinking" as const,
      title: "¿Cuántos años tienes?",
      pyro: "Tranqui, esto solo me ayuda a ajustar el tono. No le digo a nadie.",
      options: AGE_BANDS,
      value: ageBand,
      onPick: setAgeBand,
      canNext: !!ageBand,
    },
    {
      kind: "single" as const,
      mood: "thinking" as const,
      title: "¿Cómo te identificas?",
      pyro: "Para hablarte bonito, no para encasillarte.",
      options: GENDERS,
      value: gender,
      onPick: setGender,
      canNext: !!gender,
    },
    {
      kind: "multi" as const,
      mood: "alert" as const,
      title: "¿Quiénes son tus enemigos?",
      pyro: "Selecciona todos los que te frenan. Yo los voy a quemar contigo.",
      options: ENEMIES,
      value: enemies,
      onPick: setEnemies,
      canNext: enemies.length > 0,
    },
    {
      kind: "multi" as const,
      mood: "thinking" as const,
      title: "¿En qué áreas vas a pelear?",
      pyro: "Dime dónde quieres mejorar. Ahí enfocaré tus misiones.",
      options: AREAS,
      value: areas,
      onPick: setAreas,
      canNext: areas.length > 0,
    },
    {
      kind: "single" as const,
      mood: "thinking" as const,
      title: "¿Cuánto tiempo me das al día?",
      pyro: "Sé honesto. Mejor poco y constante que prometer mucho.",
      options: TIME_CAPS,
      value: timeCap,
      onPick: setTimeCap,
      canNext: !!timeCap,
    },
    {
      kind: "single" as const,
      mood: "thinking" as const,
      title: "¿Cuándo rindes mejor?",
      pyro: "Voy a poner las misiones difíciles en tu mejor momento.",
      options: PEAK_TIMES,
      value: peakTime,
      onPick: setPeakTime,
      canNext: !!peakTime,
    },
    {
      kind: "text" as const,
      mood: "happy" as const,
      title: "Tu gran objetivo",
      pyro: "En una frase: ¿qué quieres lograr en los próximos 3 meses?",
      value: goal,
      onChange: setGoal,
      canNext: goal.trim().length >= 3,
    },
  ], [ageBand, gender, enemies, areas, timeCap, peakTime, goal]);

  const total = steps.length;
  const cur = steps[step];

  if (completed || !user) return null;

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let tz = "UTC";
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch {}
      const { data, error } = await supabase
        .from("profiles")
        .update({
          pyro_age_band: ageBand,
          pyro_gender: gender,
          pyro_enemies: enemies,
          pyro_areas: areas,
          pyro_time_cap: timeCap,
          pyro_peak_time: peakTime,
          pyro_goal: goal.trim(),
          pyro_onboarding_completed: true,
          timezone: tz,
        })
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      if (data) queryClient.setQueryData(["profile"], data);
      try { playSfx("levelUp"); } catch { /* ignore */ }
      toast.success("¡Pyro está listo para ti! 🔥");
      window.setTimeout(() => {
        pyroSay(`¡Vamos por ese objetivo! Cuenta conmigo, leyenda. 🔥`, "celebrating");
      }, 600);

      // Ask for push permission AFTER onboarding completes — never on first open
      window.setTimeout(() => {
        enablePushNotifications(user.id).then((ok) => {
          if (ok) toast.success("🔔 Notificaciones activadas");
        }).catch(() => { /* silent */ });
      }, 1200);
    } catch (e) {
      console.error(e);
      toast.error("No pude guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const onNext = () => {
    if (!cur.canNext) return;
    try { playSfx("nav"); } catch { /* ignore */ }
    if (step === total - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const onBack = () => {
    if (step === 0) return;
    try { playSfx("toggle"); } catch { /* ignore */ }
    setStep((s) => s - 1);
  };

  const toggleMulti = (current: string[], id: string, setter: (v: string[]) => void) => {
    if (current.includes(id)) setter(current.filter((x) => x !== id));
    else setter([...current, id]);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-background/90 backdrop-blur-md animate-fade-in p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding de Pyro"
    >
      {/* Scanlines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, hsl(var(--primary) / 0.08) 0 1px, transparent 1px 3px)",
        }}
      />

      <div className="relative w-full max-w-lg rounded-3xl bg-card p-5 md:p-7 shadow-lift animate-scale-in">
        {/* Progress */}
        <div className="mb-4 flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary shadow-lift" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Pyro + bubble */}
        <div className="flex items-start gap-3 mb-5">
          <div className="shrink-0">
            <PyroSprite size={64} mood={cur.mood} />
          </div>
          <div className="flex-1">
            <h2 className="font-pixel text-[11px] md:text-sm text-primary mb-2"
              style={{ textShadow: "0 0 8px hsl(var(--primary) / 0.6)" }}>
              {cur.title}
            </h2>
            <p className="text-sm text-foreground/90 leading-relaxed">{cur.pyro}</p>
          </div>
        </div>

        {/* Body */}
        <div className="mb-5 max-h-[40vh] overflow-y-auto pr-1">
          {cur.kind === "intro" && (
            <div className="font-pixel text-xs text-muted-foreground text-center py-3">
              [7 preguntas · ~1 minuto]
            </div>
          )}

          {cur.kind === "single" && (
            <div className="grid grid-cols-2 gap-2">
              {cur.options.map((opt) => {
                const active = cur.value === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { try { playSfx("hover"); } catch { /* ignore */ } cur.onPick(opt.id); }}
                    className={cn(
                      "rounded-lg border-2 px-3 py-3 text-left text-sm transition-all",
                      active
                        ? "border-primary bg-primary/15 text-foreground shadow-lift"
                        : "border-border bg-card/60 text-foreground/85 hover:border-primary/60"
                    )}
                  >
                    <span className="mr-2">{opt.emoji}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {cur.kind === "multi" && (
            <>
              <div className="font-pixel text-[11px] text-muted-foreground mb-2">
                [puedes elegir varios]
              </div>
              <div className="grid grid-cols-2 gap-2">
                {cur.options.map((opt) => {
                  const active = cur.value.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { try { playSfx("hover"); } catch { /* ignore */ } toggleMulti(cur.value, opt.id, cur.onPick); }}
                      className={cn(
                        "rounded-lg border-2 px-3 py-3 text-left text-sm transition-all",
                        active
                          ? "border-primary bg-primary/15 text-foreground shadow-lift"
                          : "border-border bg-card/60 text-foreground/85 hover:border-primary/60"
                      )}
                    >
                      <span className="mr-2">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {cur.kind === "text" && (
            <Input
              autoFocus
              value={cur.value}
              onChange={(e) => cur.onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && cur.canNext && !saving) onNext();
              }}
              placeholder="Ej: Lanzar mi proyecto, correr 10 km, ahorrar X..."
              className="h-11 text-sm"
              maxLength={140}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={step === 0 || saving}
            className="font-pixel text-xs"
          >
            Atrás
          </Button>
          <div className="font-pixel text-xs text-muted-foreground">
            {step + 1} / {total}
          </div>
          <Button
            size="sm"
            onClick={onNext}
            disabled={!cur.canNext || saving}
            className="font-pixel text-xs"
          >
            {saving ? "Guardando..." : step === total - 1 ? "¡Empezar!" : (cur as any).cta ?? "Siguiente"}
          </Button>
        </div>
      </div>
    </div>
  );
}