import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ACHIEVEMENTS, tierReached, type AchievementDef, type Metrics } from "@shared/achievements";

export type Tier = 0 | 1 | 2 | 3;

export interface AchievementState {
  def: AchievementDef;
  value: number;
  /** Highest tier already claimed (and paid). */
  claimed: Tier;
  /** Highest tier the current data qualifies for. */
  reached: Tier;
  /** Tiers reached but not yet claimed. */
  claimable: number;
  /** Next threshold to aim for (null when gold is reached). */
  next: number | null;
  /** 0..1 progress from the previous threshold to the next one. */
  progress: number;
}

export interface ClaimResult {
  claimed: { achievement_id: string; tier: number; coins: number }[];
  coins: number;
  frames: string[];
}

const KEY = "achievements";

export function useAchievements() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const metrics = useQuery({
    queryKey: [KEY, "metrics", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_achievement_metrics");
      if (error) throw error;
      return data as unknown as Metrics;
    },
  });

  const unlocks = useQuery({
    queryKey: [KEY, "unlocks", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("achievement_unlocks").select("achievement_id, tier");
      if (error) throw error;
      return data ?? [];
    },
  });

  const states = useMemo<AchievementState[]>(() => {
    const m = metrics.data;
    if (!m) return [];
    const claimedBy = new Map<string, number>();
    for (const u of unlocks.data ?? []) claimedBy.set(u.achievement_id, Math.max(claimedBy.get(u.achievement_id) ?? 0, u.tier));
    return ACHIEVEMENTS.map((def) => {
      const value = def.value(m);
      const reached = tierReached(def, m);
      const claimed = (claimedBy.get(def.id) ?? 0) as Tier;
      const next = reached < 3 ? def.thresholds[reached as 0 | 1 | 2] : null;
      const prev = reached > 0 ? def.thresholds[reached - 1] : 0;
      const progress = next == null ? 1 : Math.max(0, Math.min(1, (value - prev) / (next - prev)));
      return { def, value, claimed, reached, claimable: Math.max(0, reached - claimed), next, progress };
    });
  }, [metrics.data, unlocks.data]);

  const claim = useMutation({
    mutationFn: async (achievementId?: string): Promise<ClaimResult> => {
      const { data, error } = await supabase.functions.invoke("claim-achievement", { body: achievementId ? { achievementId } : {} });
      if (error) throw error;
      return data as ClaimResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const claimableCount = states.reduce((s, a) => s + a.claimable, 0);
  const starsLit = states.reduce((s, a) => s + a.claimed, 0);

  return { states, metrics, unlocks, claim, claimableCount, starsLit, totalStars: ACHIEVEMENTS.length * 3, loading: metrics.isLoading || unlocks.isLoading };
}
