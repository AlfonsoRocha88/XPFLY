import { Sparkles } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { openPyroSuggestions } from "@/hooks/usePyro";
import { PYRO_TIERS } from "@/lib/pyro-progression";
import type { HungerState } from "@/hooks/usePyroHunger";
import { playSfx } from "@/lib/sfx";

interface Props {
  hunger: HungerState;
  compact?: boolean;
}

const HUNGER_META: Record<HungerState, { label: string; color: string; glow: string }> = {
  ok:       { label: "SACIADO", color: "bg-emerald-400", glow: "shadow-[0_0_8px_hsl(var(--primary)/0.5)]" },
  alert:    { label: "HAMBRE",  color: "bg-yellow-400",  glow: "shadow-[0_0_8px_rgba(250,204,21,0.5)]" },
  dying:    { label: "DEBIL",   color: "bg-orange-500",  glow: "shadow-[0_0_10px_rgba(249,115,22,0.6)]" },
  critical: { label: "AGONIA",  color: "bg-red-500",     glow: "shadow-[0_0_12px_rgba(239,68,68,0.7)]" },
};

export default function PyroStatusWidget({ hunger, compact }: Props) {
  const { profile } = useProfile();
  const powerLevel: number = (profile as any)?.pyro_power_level ?? 0;
  const totalFed: number = (profile as any)?.missions_completed_total ?? 0;
  const lastMissionAt: string | null | undefined = (profile as any)?.last_mission_completed_at;

  // Hunger bar: 4 segments, one empties every 5h since last mission. Refills
  // fully on completion (last_mission_completed_at update). Recomputed on
  // every render (effectively real-time on app open / state change).
  const hoursSince = lastMissionAt
    ? (Date.now() - new Date(lastMissionAt).getTime()) / 36e5
    : 0;
  const filledSegments = Math.max(0, Math.min(4, 4 - Math.floor(hoursSince / 5)));

  // Compute the PWR bar directly from totalFed so it visibly advances on
  // every mission, even at the moment a tier threshold is crossed. The
  // stored `pyro_power_level` is only used for the "LV x / y" label.
  const nextTier = PYRO_TIERS.find((t) => t.threshold > totalFed) ?? null;
  const prevThreshold = [...PYRO_TIERS]
    .reverse()
    .find((t) => totalFed >= t.threshold)?.threshold ?? 0;
  const denom = nextTier ? Math.max(1, nextTier.threshold - prevThreshold) : 1;
  const num = nextTier ? Math.max(0, Math.min(denom, totalFed - prevThreshold)) : denom;
  const pct = Math.round((num / denom) * 100);

  const meta = HUNGER_META[hunger];

  return (
    <div
      className={`pointer-events-auto rounded-lg border-2 border-primary/50 bg-card/90 px-2 py-1.5 backdrop-blur-sm shadow-[0_0_10px_hsl(var(--primary)/0.3)] ${compact ? "min-w-[140px]" : "min-w-[170px]"}`}
      role="group"
      aria-label="Estado de Pyro"
    >
      {/* Power row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-pixel text-[7px] uppercase tracking-wider text-muted-foreground">PWR</span>
        <span className="font-pixel text-[8px] text-primary">
          LV {powerLevel}{nextTier ? ` / ${nextTier.level}` : " · MAX"}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full border border-primary/30 bg-background/60">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
          style={{ width: `${pct}%` }}
          aria-label={`Progreso al siguiente nivel: ${pct}%`}
        />
      </div>

      {/* Hunger row */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-pixel text-[7px] uppercase tracking-wider text-muted-foreground">HP</span>
        <span className={`font-pixel text-[8px] ${hunger === "critical" ? "text-red-400 animate-pulse" : hunger === "dying" ? "text-orange-400" : hunger === "alert" ? "text-yellow-400" : "text-emerald-400"}`}>
          {meta.label}
        </span>
      </div>
      <div className="mt-1 flex gap-1" aria-label={`Hambre: ${meta.label}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm border border-primary/30 ${i < filledSegments ? `${meta.color} ${meta.glow}` : "bg-background/40"}`}
          />
        ))}
      </div>

      {/* Action: open suggestions */}
      <button
        type="button"
        onClick={() => { playSfx("open"); openPyroSuggestions(); }}
        onMouseEnter={() => playSfx("hover")}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-primary/50 bg-primary/10 px-2 py-1 font-pixel text-[8px] uppercase text-primary transition-colors hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="Pyro propone misiones"
        aria-label="Abrir panel de misiones propuestas por Pyro"
      >
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        Pyro propone
      </button>
    </div>
  );
}