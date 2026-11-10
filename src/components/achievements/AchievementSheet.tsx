import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Check, Loader2, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONSTELLATIONS, TIER_COINS, TIER_NAMES } from "@shared/achievements";
import type { AchievementState } from "@/hooks/useAchievements";
import { Coin } from "@/components/icons/GameIcons";
import { EMBLEM_ART } from "./emblems";
import { TierMedallion, TIER_STYLE } from "./emblems/TierMedallion";

interface Props {
  state: AchievementState;
  claiming: boolean;
  onClaim: () => void;
  onClose: () => void;
}

/** Detail view. The emblem morphs here from its star (shared layoutId) and back on close. */
const AchievementSheet = ({ state: s, claiming, onClaim, onClose }: Props) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const Art = EMBLEM_ART[s.def.id];
  const constellation = CONSTELLATIONS.find((c) => c.id === s.def.constellation);
  const shownTier = Math.max(s.claimed, 0) as 0 | 1 | 2 | 3;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const label = (i: number) => s.def.tierLabels?.[i] ?? `${s.def.thresholds[i]} ${s.def.unit}`;
  const pendingCoins = TIER_COINS.slice(s.claimed, s.reached).reduce((a, b) => a + b, 0);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-[#070A1A]/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ach-title"
        className="relative w-full max-w-md rounded-t-3xl bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lift md:rounded-3xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        <button ref={closeRef} type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Cerrar">
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <motion.div layoutId={`emblem-${s.def.id}`} className="-mt-16 mb-3">
            <TierMedallion tier={shownTier} size={120} shine={shownTier > 0}>
              {Art && <Art className="h-full w-full" />}
            </TierMedallion>
          </motion.div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{constellation?.name}</p>
          <h2 id="ach-title" className="font-serif text-2xl font-medium text-foreground">{s.def.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Llevas <span className="font-semibold tabular-nums text-foreground">{s.value}</span> {s.def.unit}
          </p>
        </div>

        <ol className="mt-5 space-y-2.5">
          {[0, 1, 2].map((i) => {
            const tier = (i + 1) as 1 | 2 | 3;
            const done = s.claimed >= tier;
            const ready = !done && s.reached >= tier;
            const current = !done && !ready && s.reached === i;
            const style = TIER_STYLE[tier];
            return (
              <li key={i} className={cn("flex items-center gap-3 rounded-2xl border p-3", ready ? "border-[#E1B12C]/60 bg-[#E1B12C]/10" : "border-border")}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: `linear-gradient(135deg, ${style.rim[0]}, ${style.rim[1]})`, color: style.ink, opacity: done || ready ? 1 : 0.45 }}>
                  {done ? <Check className="h-4 w-4" /> : ["I", "II", "III"][i]}
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{TIER_NAMES[i]}</p>
                  <p className="truncate text-xs text-muted-foreground">{label(i)}</p>
                  {current && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(s.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${s.progress * 100}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
                    </div>
                  )}
                </div>
                <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums", done ? "text-muted-foreground line-through" : "text-foreground")}>
                  {!done && !ready && !current ? <Lock className="h-3 w-3 text-muted-foreground" aria-label="Bloqueado" /> : null}
                  <Coin size={14} className="text-xp" /> {TIER_COINS[i]}
                </span>
              </li>
            );
          })}
        </ol>

        {s.claimable > 0 ? (
          <motion.button
            type="button"
            onClick={onClaim}
            disabled={claiming}
            whileTap={{ scale: 0.97 }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E1B12C] to-[#F5CF5A] py-3 text-sm font-semibold text-[#3A2A00] shadow-lift disabled:opacity-70"
          >
            {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coin size={18} />}
            Reclamar +{pendingCoins} monedas
          </motion.button>
        ) : s.reached === 3 ? (
          <p className="mt-5 text-center text-sm font-medium text-success">Completado en oro</p>
        ) : (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Te faltan <span className="font-semibold tabular-nums text-foreground">{(s.next ?? 0) - s.value}</span> para {TIER_NAMES[s.reached as 0 | 1 | 2]}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AchievementSheet;
