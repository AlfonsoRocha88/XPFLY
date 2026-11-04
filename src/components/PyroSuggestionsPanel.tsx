import { useState } from "react";
import { Sparkles, X, Plus, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import PyroSprite from "./PyroSprite";
import { usePyroMissionSuggestions, type PyroSuggestion } from "@/hooks/usePyroMissionSuggestions";
import { useTasks } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playSfx } from "@/lib/sfx";

const AREA_EMOJI: Record<string, string> = {
  work: "💼",
  study: "📚",
  health: "💪",
  creative: "🎨",
  home: "🏡",
  money: "💸",
  other: "✨",
};

const PRIORITY_LABEL: Record<PyroSuggestion["priority"], string> = {
  low: "BAJA",
  medium: "MEDIA",
  high: "ALTA",
  urgent: "URGENTE",
};

const PRIORITY_COLOR: Record<PyroSuggestion["priority"], string> = {
  low: "text-muted-foreground border-muted-foreground/40",
  medium: "text-primary border-primary/50",
  high: "text-amber-400 border-amber-400/50",
  urgent: "text-destructive border-destructive/60",
};

export default function PyroSuggestionsPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { profile } = useProfile();
  const { createTask } = useTasks();
  const { loading, suggestions, error, hunger, generate, clear, removeAt } = usePyroMissionSuggestions();
  const [hint, setHint] = useState("");
  const onboardingDone = (profile as any)?.pyro_onboarding_completed === true;

  const handleGenerate = async () => {
    try { playSfx("open"); } catch { /* ignore */ }
    const list = await generate({ count: 4, hint: hint.trim() });
    if (list.length === 0 && !error) {
      toast.error("Pyro no tiene ideas ahora. Intenta de nuevo.");
    }
  };

  const handleAccept = async (s: PyroSuggestion, idx: number) => {
    try {
      await createTask.mutateAsync({
        title: s.title,
        description: s.description ?? "",
        priority: s.priority,
        position: 0,
      } as any);
      try { playSfx("create"); } catch { /* ignore */ }
      toast.success("Misión aceptada");
      removeAt(idx);
    } catch {
      toast.error("No se pudo crear la misión");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) clear();
      }}
    >
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-pixel text-[11px]">
            <Sparkles className="h-4 w-4 text-primary" />
            Pyro propone misiones
          </DialogTitle>
        </DialogHeader>

        {/* Pyro intro */}
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-card/50 p-3">
          <PyroSprite size={48} mood={hunger === "dying" || hunger === "critical" ? "dying" : "thinking"} />
          <p className="text-sm text-foreground/90 leading-relaxed">
            {!onboardingDone
              ? "Aún no me contaste de ti, así que voy a improvisar. Completa el onboarding para que ajuste mejor."
              : hunger === "critical" || hunger === "dying"
                ? "Estoy débil. Te paso micro-misiones rápidas. ¡Aliméntame ya!"
                : "Mira lo que armé pensando en tus áreas y tu objetivo. Acepta las que te sirvan."}
          </p>
        </div>

        {/* Hint input */}
        <div className="flex gap-2">
          <Input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Pista opcional: ej. 'enfócate en estudio'"
            className="text-sm"
            maxLength={140}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleGenerate();
            }}
          />
          <Button onClick={handleGenerate} disabled={loading} size="sm" className="font-pixel text-xs">
            {loading ? (
              <><RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Pensando...</>
            ) : suggestions.length > 0 ? (
              <><RefreshCw className="mr-1 h-3 w-3" /> Otra ronda</>
            ) : (
              <><Sparkles className="mr-1 h-3 w-3" /> Generar</>
            )}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Suggestions list */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div
                key={`${s.title}-${i}`}
                className="rounded-lg border-2 border-border bg-card/70 p-3 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg shrink-0">{AREA_EMOJI[s.area] ?? "✨"}</span>
                    <h3 className="text-sm font-semibold text-foreground truncate">{s.title}</h3>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded border px-1.5 py-0.5 font-pixel text-[11px]",
                      PRIORITY_COLOR[s.priority]
                    )}
                  >
                    {PRIORITY_LABEL[s.priority]}
                  </span>
                </div>
                {s.description && (
                  <p className="text-xs text-muted-foreground mb-1.5">{s.description}</p>
                )}
                <div className="font-pixel text-[11px] text-primary/80 mb-2">
                  ~{s.estimated_minutes} MIN · {AREA_EMOJI[s.area]} {s.area.toUpperCase()}
                </div>
                <p className="text-xs italic text-foreground/70 mb-3 border-l-2 border-primary/40 pl-2">
                  Pyro: "{s.pyro_hook}"
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(s, i)}
                    disabled={createTask.isPending}
                    className="flex-1 font-pixel text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAt(i)}
                    className="font-pixel text-xs"
                  >
                    <X className="mr-1 h-3 w-3" /> Descartar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && suggestions.length === 0 && !error && (
          <div className="font-pixel text-xs text-center text-muted-foreground py-4">
            [pulsa GENERAR para que Pyro proponga misiones]
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}