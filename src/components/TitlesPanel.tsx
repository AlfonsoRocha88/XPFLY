import { useMemo } from "react";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TITLES } from "@/lib/titles";
import { cn } from "@/lib/utils";

interface TitlesPanelProps {
  unlocked: string[];
  equipped: string | null;
  progress: { morning_missions: number; night_missions: number; urgent_missions: number };
  streak: number;
  onEquip: (id: string | null) => void;
  isPending?: boolean;
}

const TitlesPanel = ({ unlocked, equipped, progress, streak, onEquip, isPending }: TitlesPanelProps) => {
  const items = useMemo(() => {
    return TITLES.map((t) => {
      const value =
        t.progressKey === "streak"
          ? streak
          : (progress as any)[t.progressKey] ?? 0;
      const isUnlocked = unlocked.includes(t.id);
      const isEquipped = equipped === t.id;
      const pct = Math.min((value / t.goal) * 100, 100);
      return { ...t, value, isUnlocked, isEquipped, pct };
    });
  }, [unlocked, equipped, progress, streak]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-system text-sm tracking-wider text-primary">TÍTULOS</h3>
        {equipped && (
          <Button size="sm" variant="ghost" onClick={() => onEquip(null)} disabled={isPending}>
            Quitar título
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Desbloquea títulos completando misiones según tu estilo. Equipa uno para activar su bonus de XP.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lg border p-3 transition-all",
              t.isEquipped
                ? "border-primary bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                : t.isUnlocked
                  ? "border-border bg-card/60"
                  : "border-border/50 bg-muted/20 opacity-70",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl" style={{ color: t.color }}>{t.icon}</span>
                <div>
                  <div className="font-system text-sm text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
              </div>
              {t.isUnlocked ? (
                <Check className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>

            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.condition}</span>
                <span className="tabular-nums">
                  {Math.min(t.value, t.goal)}/{t.goal}
                </span>
              </div>
              <Progress value={t.pct} className="h-1.5" />
            </div>

            <div className="mt-3">
              {t.isUnlocked ? (
                <Button
                  size="sm"
                  variant={t.isEquipped ? "secondary" : "default"}
                  className="w-full"
                  disabled={isPending || t.isEquipped}
                  onClick={() => onEquip(t.id)}
                >
                  {t.isEquipped ? "Equipado" : "Equipar"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="w-full" disabled>
                  Bloqueado
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TitlesPanel;