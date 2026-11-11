import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAchievements } from "@/hooks/useAchievements";
import GalaxyView from "./galaxy/GalaxyView";
import AchievementSheet from "./AchievementSheet";
import UnlockCelebration, { type Celebration } from "./UnlockCelebration";

/** Logros: a galaxy of constellations, one star per achievement. */
const AchievementsView = () => {
  const { states, claim, claimableCount, starsLit, totalStars, loading, metrics } = useAchievements();
  const [selected, setSelected] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
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

  // Portaled to <body>: the galaxy and its sheets are fixed full-screen layers, and the page
  // around them animates with transforms that would otherwise trap fixed children.
  return createPortal(
    <LayoutGroup>
      <GalaxyView
        states={states}
        starsLit={starsLit}
        totalStars={totalStars}
        claimableCount={claimableCount}
        claiming={claim.isPending}
        onClaimAll={() => runClaim()}
        onClaim={(id) => runClaim(id)}
        onOpenAchievement={setSelected}
      />
      <AnimatePresence>
        {selectedState && (
          <AchievementSheet key="sheet" state={selectedState} claiming={claim.isPending} onClaim={() => runClaim(selectedState.def.id)} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>{celebration && <UnlockCelebration key="cel" data={celebration} onDone={() => setCelebration(null)} />}</AnimatePresence>
    </LayoutGroup>,
    document.body,
  );
};

export default AchievementsView;
