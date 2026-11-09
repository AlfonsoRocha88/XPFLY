import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Profile } from "@/lib/types";
import { getTitle } from "@/lib/titles";
import { toast } from "sonner";
import { getCurrentLeague, leagueLabel } from "@/lib/leagues";

const XP_REWARDS = {
  low: 10,
  medium: 20,
  high: 35,
  urgent: 50,
};

let reconciledFor: string | null = null;

let realtime: { userId: string; users: number; remove: () => void } | null = null;
function subscribeProfileChanges(userId: string, onRow: (row: unknown) => void) {
  if (realtime && realtime.userId !== userId) {
    realtime.remove();
    realtime = null;
  }
  if (!realtime) {
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        (payload) => onRow(payload.new),
      )
      .subscribe();
    realtime = { userId, users: 0, remove: () => { supabase.removeChannel(channel); } };
  }
  const entry = realtime;
  entry.users++;
  return () => {
    entry.users--;
    if (entry.users === 0 && realtime === entry) {
      entry.remove();
      realtime = null;
    }
  };
}

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
        toast.info(`Se usó un protector de racha. Tu racha sigue en ${data.previousStreak} días`, {
          description: `Te quedan ${data.remainingFreezes} protector${data.remainingFreezes === 1 ? "" : "es"}.`,
        });
        try {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem("streakFreezeUsedDate", today);
          // Append to historical freeze-use log (covers the missed day = yesterday).
          // We log each consumed freeze day going back `gap` days from today (exclusive).
          const log: string[] = JSON.parse(localStorage.getItem("streakFreezeUsedDates") || "[]");
          const gap = Number(data.gap || 1);
          const set = new Set(log);
          for (let i = 1; i <= gap; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            set.add(d.toISOString().slice(0, 10));
          }
          localStorage.setItem("streakFreezeUsedDates", JSON.stringify(Array.from(set)));
        } catch {}
      } else if (data?.action === "reset" && data?.previousStreak) {
        toast.error(`💔 Perdiste tu racha de ${data.previousStreak} días`, {
          description: "No tenías suficientes protectores.",
        });
      }
      return data?.profile ?? null;
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(["profile"], data);
    },
  });

  // Many components call useProfile(); reconcile the streak once per user per session.
  const profileUserId = profileQuery.data?.user_id;
  useEffect(() => {
    if (!profileUserId || reconciledFor === profileUserId) return;
    reconciledFor = profileUserId;
    reconcileStreak.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId]);

  // Realtime sync — one shared channel, ref-counted across hook instances.
  useEffect(() => {
    if (!user) return;
    return subscribeProfileChanges(user.id, (row) => queryClient.setQueryData(["profile"], row));
  }, [user?.id, queryClient]);

  const buyStreakFreeze = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("buy-streak-freeze", { body: {} });
      if (error) throw error;
      if (data?.error === "max_reached") throw new Error(`Máximo ${data.max} protectores`);
      if (data?.error === "insufficient_xp") throw new Error(`Necesitas ${data.cost} XP`);
      if (data?.error) throw new Error(data.error);
      toast.success(`Protector de racha comprado (−${data.cost} XP)`);
      return data.profile;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
    onError: (e: any) => toast.error(e?.message ?? "No se pudo comprar"),
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: { display_name?: string; avatar_url?: string; wallpaper?: string; theme?: string; bg_animations?: boolean }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    // Show the change immediately; the realtime channel and refetch confirm it.
    onMutate: (updates) => {
      queryClient.setQueryData<Profile | null>(["profile"], (old) => (old ? { ...old, ...updates } : old));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
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
          toast.success(`Nuevo título: ${t.name}`, { description: t.description });
          toast.success(`Nuevo título: ${t.name}`);
        }
      });

      const prevLeague = getCurrentLeague(prevTrophies);
      const newLeague = getCurrentLeague(newTrophies);
      if (newLeague.id !== prevLeague.id) {
        toast.success(`Subiste a la liga ${leagueLabel(newLeague)}`, {
          description: "Sigue completando tareas para subir más.",
        });
        toast.success(`Subiste a la liga ${leagueLabel(newLeague)}`);
      }

      if (newLevel > oldLevel) {
        
      }

      return {
        ...updated,
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
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
      toast.success(`+5 trofeos por completar todas las tareas diarias`);

      const prevLeagueD = getCurrentLeague(prevTrophies);
      const newLeagueD = getCurrentLeague(newTrophies);
      if (newLeagueD.id !== prevLeagueD.id) {
        toast.success(`Subiste a la liga ${leagueLabel(newLeagueD)}`);
      }

      if (data.earnedFreeze) {
        toast.success(`+1 protector de racha (${updated.streak_freezes} de ${updated.streak_freeze_max})`, {
          description: "Te protege si te saltas un día.",
        });
      }

      (data.newlyUnlockedTitles ?? []).forEach((id: string) => {
        const t = getTitle(id);
        if (t) toast.success(`Nuevo título: ${t.name}`, { description: t.description });
      });

      return {
        ...updated,
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        streak: data.streak,
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
    addXp,
    claimDailyBonus,
    equipTitle,
    buyStreakFreeze,
    reconcileStreak,
    XP_REWARDS,
  };
};
