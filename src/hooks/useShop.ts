import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { playSfx } from "@/lib/sfx";

const ERRORS: Record<string, string> = {
  insufficient: "No te alcanzan los destellos.",
  already_owned: "Ya lo tienes.",
  max_reached: "Ya tienes el máximo de protectores.",
  unknown_item: "Ese artículo ya no existe.",
  retry: "Tu saldo cambió, inténtalo de nuevo.",
};

/** Buys a shop item on the server (prices are checked there) and refreshes the profile. */
export function useShop() {
  const qc = useQueryClient();
  const buy = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.functions.invoke("shop-buy", { body: { itemId } });
      let body = data;
      if (error && !body) body = await (error as { context?: Response }).context?.json?.().catch(() => null);
      if (body?.error) throw new Error(ERRORS[body.error] ?? "No se pudo comprar.");
      if (!body?.profile) throw new Error("No se pudo comprar.");
      return body.profile;
    },
    onSuccess: (profile) => {
      playSfx("purchase");
      qc.setQueryData(["profile"], profile);
    },
    onError: () => playSfx("error"),
  });
  return { buy };
}
