import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CONSTELLATIONS, TIER_NAMES, type ConstellationId } from "@shared/achievements";
import { useAchievements, type AchievementState } from "@/hooks/useAchievements";
import { Coin } from "@/components/icons/GameIcons";
import ConstellationSky from "./ConstellationSky";
import AchievementSheet from "./AchievementSheet";
import UnlockCelebration, { type Celebration } from "./UnlockCelebration";
import { EMBLEM_ART } from "./emblems";
import { TierMedallion } from "./emblems/TierMedallion";

/** Ring showing lit stars out of all stars. */
function StarRing({ lit, total }: { lit: number; total: number }) {
  const reduce = useReducedMotion();
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = total ? lit / total : 0;
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="38" cy="38" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <motion.circle
          cx="38" cy="38" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct) : c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-xl font-medium leading-none tabular-nums text-foreground">{lit}</span>
        <span className="text-[10px] text-muted-foreground">de {total}</span>
      </span>
    </div>
  );
}

/** Small preview of a constellation's shape for the selector chips. */
function MiniConstellation({ items }: { items: AchievementState[] }) {
  const pts = items.map((_, i, a) => [6 + (i * 28) / Math.max(1, a.length - 1), i % 2 ? 6 : 14]);
  return (
    <svg viewBox="0 0 40 20" className="h-4 w-8" aria-hidden>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeOpacity=".4" strokeWidth="1" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={items[i].claimed ? 2.2 : 1.4} fill="currentColor" fillOpacity={items[i].claimed ? 1 : 0.45} />)}
    </svg>
  );
}

const AchievementsView = () => {
  const { states, claim, claimableCount, starsLit, totalStars, loading, metrics } = useAchievements();
  const [active, setActive] = useState<ConstellationId>("ritmo");
  const [selected, setSelected] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  const byConstellation = useMemo(() => {
    const m = new Map<ConstellationId, AchievementState[]>();
    for (const s of states) m.set(s.def.constellation, [...(m.get(s.def.constellation) ?? []), s]);
    return m;
  }, [states]);

  // The unclaimed tier closest to being reached, as a motivating "next goal".
  const nextGoal = useMemo(
    () => states.filter((s) => s.next != null && s.claimable === 0 && s.value > 0).sort((a, b) => b.progress - a.progress)[0],
    [states],
  );

  const selectedState = states.find((s) => s.def.id === selected) ?? null;

  const runClaim = async (achievementId?: string) => {
    try {
      const res = await claim.mutateAsync(achievementId);
      if (!res.claimed.length) return;
      const best = [...res.claimed].sort((a, b) => b.tier - a.tier)[0];
      setSelected(null);
      setCelebration({ achievementId: best.achievement_id, tier: best.tier as 1 | 2 | 3, coins: res.coins, extra: res.claimed.length - 1, frames: res.frames });
    } catch {
      toast.error("No se pudo reclamar. Inténtalo de nuevo.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando logros" />
      </div>
    );
  }
  if (metrics.isError) {
    return <p className="surface p-5 text-sm text-muted-foreground">No se pudieron cargar tus logros. Revisa tu conexión.</p>;
  }

  const items = byConstellation.get(active) ?? [];
  const info = CONSTELLATIONS.find((c) => c.id === active)!;
  const litHere = items.reduce((s, a) => s + a.claimed, 0);

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-4 pb-8">
        {/* Summary */}
        <section className="surface flex items-center gap-4 p-4">
          <StarRing lit={starsLit} total={totalStars} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Estrellas encendidas</p>
            {nextGoal ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Próximo: <span className="font-medium text-foreground">{nextGoal.def.name}</span> {TIER_NAMES[nextGoal.reached as 0 | 1 | 2]} · te faltan{" "}
                <span className="font-semibold tabular-nums text-foreground">{(nextGoal.next ?? 0) - nextGoal.value}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">Completa tareas para encender tu primera estrella.</p>
            )}
            {claimableCount > 0 && (
              <motion.button
                type="button"
                onClick={() => runClaim()}
                disabled={claim.isPending}
                whileTap={{ scale: 0.96 }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E1B12C] to-[#F5CF5A] px-3.5 py-1.5 text-xs font-semibold text-[#3A2A00] shadow-soft disabled:opacity-70"
              >
                {claim.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Reclamar {claimableCount} {claimableCount === 1 ? "nivel" : "niveles"}
              </motion.button>
            )}
          </div>
        </section>

        {/* Constellation selector */}
        <div role="tablist" aria-label="Constelaciones" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {CONSTELLATIONS.map((c) => {
            const list = byConstellation.get(c.id) ?? [];
            const pending = list.reduce((s, a) => s + a.claimable, 0);
            const on = active === c.id;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setActive(c.id)}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                  on ? "border-transparent text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {on && <motion.span layoutId="constellation-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className="relative inline-flex items-center gap-2">
                  <MiniConstellation items={list} />
                  {c.name}
                  {pending > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#E1B12C]" aria-label={`${pending} por reclamar`} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sky */}
        <AnimatePresence mode="wait">
          <motion.section
            key={active}
            aria-label={`Constelación ${info.name}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <div className="flex items-baseline justify-between px-1">
              <div>
                <h3 className="font-serif text-xl font-medium text-foreground">{info.name}</h3>
                <p className="text-xs text-muted-foreground">{info.tagline}</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{litHere}/{items.length * 3} estrellas</span>
            </div>
            <ConstellationSky id={active} items={items} onSelect={(s) => setSelected(s.def.id)} />

            {/* Readable list of the same achievements */}
            <ul className="surface divide-y divide-border/70">
              {items.map((s) => {
                const Art = EMBLEM_ART[s.def.id];
                return (
                  <li key={s.def.id}>
                    <button type="button" onClick={() => setSelected(s.def.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                      <TierMedallion tier={s.claimed} size={40}>{Art && <Art className="h-full w-full" />}</TierMedallion>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {s.def.name}
                          {s.claimable > 0 && <span className="rounded-full bg-[#E1B12C]/15 px-2 py-0.5 text-[10px] font-semibold text-[#9A7410] dark:text-[#F5CF5A]">Listo</span>}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${s.progress * 100}%` }} />
                          </div>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {s.next == null ? "Oro" : s.def.tierLabels ? s.def.tierLabels[s.reached as 0 | 1 | 2] : `${s.value}/${s.next}`}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        </AnimatePresence>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Coin size={14} className="text-xp" /> Cada nivel da monedas. Completa una constelación en oro para ganar un marco de avatar.
        </p>
      </div>

      <AnimatePresence>
        {selectedState && (
          <AchievementSheet
            key="sheet"
            state={selectedState}
            claiming={claim.isPending}
            onClaim={() => runClaim(selectedState.def.id)}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{celebration && <UnlockCelebration key="cel" data={celebration} onDone={() => setCelebration(null)} />}</AnimatePresence>
    </LayoutGroup>
  );
};

export default AchievementsView;
