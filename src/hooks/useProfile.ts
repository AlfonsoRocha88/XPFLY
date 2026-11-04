import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Profile } from "@/lib/types";
import { AvatarConfig, PlayerStats, CLASSES, CLASS_TIER_NAMES, type ClassId } from "@/lib/avatar-presets";
import { getTitle } from "@/lib/titles";
import { toast } from "sonner";
import { pyroSay } from "./usePyro";
import { getCurrentLeague, leagueLabel } from "@/lib/leagues";

const XP_REWARDS = {
  low: 10,
  medium: 20,
  high: 35,
  urgent: 50,
};

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // If the JWT is valid but the profile was deleted, sign out to prevent a broken session.
  const signedOutRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    if (profileQuery.isLoading || profileQuery.isFetching) return;
    if (profileQuery.data === null && !signedOutRef.current) {
      signedOutRef.current = true;
      supabase.auth.signOut().then(() => {
        queryClient.clear();
      });
    }
  }, [user, profileQuery.data, profileQuery.isLoading, profileQuery.isFetching, queryClient]);

  // ---------------- Streak reconciliation (Duolingo-style) ----------------
  // If the player missed days, consume freezes to keep the streak; otherwise reset.
  const reconcileStreak = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("reconcile-streak", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.action === "freeze_used") {
        toast.info(`🧊 Congelador usado (${data.gap}). Tu racha sigue: ${data.previousStreak} días`, {
          description: `Te quedan ${data.remainingFreezes} congelador${data.remainingFreezes === 1 ? "" : "es"}.`,
        });
        try {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem("pyroFreezeUsedDate", today);
          // Append to historical freeze-use log (covers the missed day = yesterday).
          // We log each consumed freeze day going back `gap` days from today (exclusive).
          const log: string[] = JSON.parse(localStorage.getItem("pyroFreezeUsedDates") || "[]");
          const gap = Number(data.gap || 1);
          const set = new Set(log);
          for (let i = 1; i <= gap; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            set.add(d.toISOString().slice(0, 10));
          }
          localStorage.setItem("pyroFreezeUsedDates", JSON.stringify(Array.from(set)));
        } catch {}
      } else if (data?.action === "reset" && data?.previousStreak) {
        toast.error(`💔 Perdiste tu racha de ${data.previousStreak} días`, {
          description: "No tenías suficientes congeladores.",
        });
      }
      return data?.profile ?? null;
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(["profile"], data);
    },
  });

  const reconciledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profileQuery.data) return;
    const uid = (profileQuery.data as any).user_id as string;
    if (reconciledRef.current === uid) return;
    reconciledRef.current = uid;
    reconcileStreak.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQuery.data?.user_id]);

  // Realtime sync — propagate profile changes from other devices
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          queryClient.setQueryData(["profile"], payload.new as any);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const buyStreakFreeze = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("buy-streak-freeze", { body: {} });
      if (error) throw error;
      if (data?.error === "max_reached") throw new Error(`Máximo ${data.max} congeladores`);
      if (data?.error === "insufficient_xp") throw new Error(`Necesitas ${data.cost} XP`);
      if (data?.error) throw new Error(data.error);
      toast.success(`🧊 Congelador comprado (-${data.cost} XP)`);
      return data.profile;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
    onError: (e: any) => toast.error(e?.message ?? "No se pudo comprar"),
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: { display_name?: string; avatar_url?: string; wallpaper?: string; outfit?: string; theme?: string; mode?: string; bg_animations?: boolean }) => {
      let payload: any = { ...updates };
      if (updates.outfit) {
        // outfit is stored inside avatar_config
        const current = queryClient.getQueryData<Profile>(["profile"]);
        const cfg = (current?.avatar_config as Partial<AvatarConfig>) ?? {};
        payload = { ...payload, avatar_config: { ...cfg, outfit: updates.outfit } as any };
        delete payload.outfit;
      }
      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const updateAvatar = useMutation({
    mutationFn: async (avatar: AvatarConfig) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_config: avatar as any })
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const allocateStat = useMutation({
    mutationFn: async (stat: keyof PlayerStats) => {
      const { data, error } = await supabase.functions.invoke("allocate-stat", { body: { stat } });
      if (error) throw error;
      if (data?.error === "no_points") throw new Error("No tienes puntos disponibles");
      if (data?.error) throw new Error(data.error);
      if (data?.levelUpClass && data?.classId) {
        const cls = CLASSES[data.classId as ClassId];
        const label = data.tier > 0 ? `${CLASS_TIER_NAMES[data.tier as 1 | 2 | 3]} ${cls?.name ?? ""}`.trim() : cls?.name ?? "";
        toast.success(`⚔ ${label} desbloqueado`, {
          description: data.outfitEquipped ? "Nuevo atuendo equipado" : "Has avanzado de tier",
        });
      }
      return data.profile;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const addXp = useMutation({
    mutationFn: async ({ taskId, priority, partyBonus = false }: { taskId: string; priority?: keyof typeof XP_REWARDS; partyBonus?: boolean }) => {
      const previous = queryClient.getQueryData<Profile>(["profile"]);
      const oldLevel = previous?.level ?? 1;
      const prevTrophies = (previous as any)?.trophies ?? 0;

      const { data, error } = await supabase.functions.invoke("award-xp", { body: { task_id: taskId, priority, partyBonus } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const updated = data.profile;
      const newLevel = updated.level ?? oldLevel;
      const newTrophies = updated.trophies ?? prevTrophies;
      const newlyUnlocked: string[] = data.newlyUnlockedTitles ?? [];

      newlyUnlocked.forEach((id: string) => {
        const t = getTitle(id);
        if (t) {
          toast.success(`🏅 Nuevo título: ${t.name}`, { description: t.description });
          pyroSay(`¡Nuevo título: ${t.name}! ${t.icon ?? "🏅"}`, "happy");
        }
      });

      const prevLeague = getCurrentLeague(prevTrophies);
      const newLeague = getCurrentLeague(newTrophies);
      if (newLeague.id !== prevLeague.id) {
        toast.success(`🛡️ ¡Ascenso de liga! ${leagueLabel(newLeague)}`, {
          description: "Sigue completando misiones para subir más.",
        });
        pyroSay(`¡Ascendiste a ${leagueLabel(newLeague)}! ${newLeague.emblem}`, "happy");
      }

      if (newLevel > oldLevel) {
        pyroSay(`¡LEVEL UP! Ahora eres nivel ${newLevel} 🔥`, "happy");
      }

      return {
        ...updated,
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        pointsGained: data.pointsGained,
        bonusTrophyAwarded: data.bonusTrophyAwarded,
        missionsCompletedTotal: data.missionsCompletedTotal,
      };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const claimDailyBonus = useMutation({
    mutationFn: async () => {
      const previous = queryClient.getQueryData<Profile>(["profile"]);
      const prevTrophies = (previous as any)?.trophies ?? 0;
      const oldLevel = previous?.level ?? 1;

      const { data, error } = await supabase.functions.invoke("claim-daily-bonus", { body: {} });
      if (error) throw error;
      if (data?.error === "already_claimed") throw new Error("Already claimed today");
      if (data?.error) throw new Error(data.error);

      const updated = data.profile;
      const newTrophies = updated.trophies ?? prevTrophies;

      toast.success(`🎁 +1 Cofre de recompensa`, {
        description: "Ábrelo en la Tienda para reclamar tu botín.",
      });
      toast.success(`🛡️ +5 trofeos por completar todas las misiones diarias`);

      const prevLeagueD = getCurrentLeague(prevTrophies);
      const newLeagueD = getCurrentLeague(newTrophies);
      if (newLeagueD.id !== prevLeagueD.id) {
        toast.success(`🛡️ ¡Ascenso de liga! ${leagueLabel(newLeagueD)}`);
      }

      if (data.earnedFreeze) {
        toast.success(`🧊 +1 Congelador de racha (${updated.streak_freezes}/${updated.streak_freeze_max})`, {
          description: "Te protege si te saltas un día.",
        });
      }

      (data.newlyUnlockedTitles ?? []).forEach((id: string) => {
        const t = getTitle(id);
        if (t) toast.success(`🏅 Nuevo título: ${t.name}`, { description: t.description });
      });

      return {
        ...updated,
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        streak: data.streak,
        pointsGained: data.pointsGained,
      };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const equipTitle = useMutation({
    mutationFn: async (titleId: string | null) => {
      const { data, error } = await supabase.functions.invoke("equip-title", { body: { titleId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.profile;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    updateProfile,
    updateAvatar,
    allocateStat,
    addXp,
    claimDailyBonus,
    equipTitle,
    buyStreakFreeze,
    reconcileStreak,
    XP_REWARDS,
  };
};
