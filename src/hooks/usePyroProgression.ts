import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import {
  getTierForLevel,
  unlockedFeaturesAt,
  type FeatureKey,
  type PyroTier,
} from "@/lib/pyro-progression";

/* ---------- Cutscene event bus ---------- */
type CutsceneListener = (tier: PyroTier) => void;
const cutsceneListeners = new Set<CutsceneListener>();
function emitCutscene(tier: PyroTier) {
  cutsceneListeners.forEach((l) => l(tier));
}
export function usePyroCutsceneBus(handler: CutsceneListener) {
  useEffect(() => {
    cutsceneListeners.add(handler);
    return () => {
      cutsceneListeners.delete(handler);
    };
  }, [handler]);
}

/**
 * Phase 4 — Tracks total missions fed in localStorage (incremented per feed),
 * computes the new power level, persists it on the profile, and fires a cutscene
 * when a tier is crossed.
 */
export function usePyroProgression() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const prevPowerLevelRef = useRef<number | null>(null);

  const powerLevel: number = (profile as any)?.pyro_power_level ?? 0;
  const [unlocked, setUnlocked] = useState<Set<FeatureKey>>(() => unlockedFeaturesAt(powerLevel));

  useEffect(() => {
    setUnlocked(unlockedFeaturesAt(powerLevel));
  }, [powerLevel]);

  /**
   * pyro_power_level is bumped server-side by the award-xp edge function.
   * Detect transitions client-side by comparing against the previously seen
   * value and fire a cutscene for each tier crossed.
   */
  const missionsTotal: number = (profile as any)?.missions_completed_total ?? 0;
  useEffect(() => {
    if (!user || !profile) return;
    const prev = prevPowerLevelRef.current;
    if (prev === null) {
      // First profile load — just seed the ref, don't replay old cutscenes.
      prevPowerLevelRef.current = powerLevel;
      return;
    }
    if (powerLevel <= prev) {
      prevPowerLevelRef.current = powerLevel;
      return;
    }
    for (let lvl = prev + 1; lvl <= powerLevel; lvl++) {
      const tier = getTierForLevel(lvl);
      if (tier) {
        const delay = (lvl - prev - 1) * 4500;
        window.setTimeout(() => emitCutscene(tier), delay);
      }
    }
    prevPowerLevelRef.current = powerLevel;
  }, [user, profile, powerLevel]);

  // Feature locks fully removed — every feature is permanently unlocked.
  const isUnlocked = useCallback((_key: FeatureKey) => true, []);

  return { powerLevel, unlocked, isUnlocked, missionsTotal };
}