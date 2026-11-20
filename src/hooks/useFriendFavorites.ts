import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/** Friends I starred with the heart. Private to me; they go first in my list. */
export function useFriendFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["friend-favorites", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("friend_favorites").select("friend_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.friend_id));
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ friendId, on }: { friendId: string; on: boolean }) => {
      const { error } = on
        ? await supabase.from("friend_favorites").insert({ friend_id: friendId })
        : await supabase.from("friend_favorites").delete().eq("friend_id", friendId);
      if (error && error.code !== "23505") throw error;
    },
    // Flip the heart immediately; roll back if the write fails.
    onMutate: async ({ friendId, on }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Set<string>>(key);
      const next = new Set(prev);
      if (on) next.add(friendId); else next.delete(friendId);
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { favorites: query.data ?? new Set<string>(), toggleFavorite: toggle.mutate };
}
