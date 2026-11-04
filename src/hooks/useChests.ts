import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export type ChestRewardType = "coins" | "coins_big" | "xp" | "freeze";

export interface ChestReward {
  type: ChestRewardType;
  amount: number;
  label: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const useChests = () => {
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const openChest = useMutation({
    mutationFn: async (): Promise<ChestReward> => {
      const { data, error } = await supabase.functions.invoke("open-chest", { body: {} });
      if (error) throw new Error(error.message ?? "No se pudo abrir el cofre");
      if (data?.error) throw new Error(data.error === "no_chests" ? "No tienes cofres por abrir" : data.error);
      if (data?.profile) queryClient.setQueryData(["profile"], data.profile);
      return data.reward as ChestReward;
    },
    onSuccess: (reward) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(`${reward.icon} ¡Obtuviste ${reward.label}!`);
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo abrir el cofre"),
  });

  return {
    coins: profile?.coins ?? 0,
    chests: profile?.unopened_chests ?? 0,
    openChest,
  };
};