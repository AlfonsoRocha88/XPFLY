import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FriendProfilePreview {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  trophies: number;
  current_league_id: string;
  daily_streak: number;
  friend_code: string | null;
  wallpaper: string | null;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend_profile?: FriendProfilePreview;
}

/** Search a single profile by friend code OR exact username (case-insensitive). */
export async function searchUserByCodeOrUsername(
  query: string,
  excludeUserId?: string,
): Promise<FriendProfilePreview | null> {
  const q = query.trim();
  if (!q) return null;
  // Sanitize for PostgREST .or() — strip commas/parens that would break the filter.
  const safe = q.replace(/[,()]/g, "");
  const { data, error } = await supabase.rpc("find_profile_preview", { _query: safe });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  // The RPC returns a narrower preview row; callers only read the shared fields.
  const filtered = excludeUserId ? data.filter((p) => p.user_id !== excludeUserId) : data;
  return (filtered[0] as unknown as FriendProfilePreview | undefined) ?? null;
}

export const useFriends = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const friendsQuery = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      const { data: sent, error: e1 } = await supabase
        .from("friendships")
        .select("*")
        .eq("user_id", user!.id);
      if (e1) throw e1;

      const { data: received, error: e2 } = await supabase
        .from("friendships")
        .select("*")
        .eq("friend_id", user!.id);
      if (e2) throw e2;

      const all = [...(sent || []), ...(received || [])];
      const friendIds = all.map((f) =>
        f.user_id === user!.id ? f.friend_id : f.user_id,
      );
      if (friendIds.length === 0) return [] as Friendship[];

      const { data: profiles } = await supabase.rpc("get_profiles_public", {
        _user_ids: friendIds,
      });

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return all.map((f) => {
        const friendUserId = f.user_id === user!.id ? f.friend_id : f.user_id;
        return {
          ...f,
          friend_profile: profileMap.get(friendUserId) as FriendProfilePreview | undefined,
        };
      }) as Friendship[];
    },
    enabled: !!user,
  });

  // Realtime: refresh on friendship changes involving me (rows I sent or received), not on every
  // change in the table. Postgres Changes can't filter DELETE events, so those stay unfiltered.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["friends", userId] });
    const channel = supabase
      .channel(`friendships:${userId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `user_id=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `friend_id=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "friendships" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Stable lists between renders, so consumers' memos and effects don't re-run for nothing.
  const { acceptedFriends, pendingRequests, sentRequests } = useMemo(() => {
    const all = friendsQuery.data || [];
    return {
      acceptedFriends: all.filter((f) => f.status === "accepted"),
      pendingRequests: all.filter((f) => f.status === "pending" && f.friend_id === userId),
      sentRequests: all.filter((f) => f.status === "pending" && f.user_id === userId),
    };
  }, [friendsQuery.data, userId]);

  /** My private invite key, for the QR / WhatsApp link. */
  const inviteKeyQuery = useQuery({
    queryKey: ["friend-invite", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_friend_invite");
      if (error) throw error;
      return data as string;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  const resetInviteKey = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("reset_my_friend_invite");
      if (error) throw error;
      return data as string;
    },
    onSuccess: (key) => queryClient.setQueryData(["friend-invite", user?.id], key),
  });

  /** Open someone's invite: instant friendship, no request to accept. */
  const acceptInvite = useMutation({
    mutationFn: async ({ code, key }: { code: string; key: string }) => {
      const { data, error } = await supabase.rpc("accept_friend_invite", { _code: code, _key: key });
      if (error) throw error;
      return data as { status: "added" | "already" | "self" | "invalid"; name?: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends", user?.id] }),
  });

  /** Search by code or exact username — returns the matched profile (excluding self) or null. */
  const searchUser = async (query: string) =>
    searchUserByCodeOrUsername(query, user?.id);

  /** Send a friend request to a known user_id. */
  const sendRequest = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("No autenticado");
      if (targetUserId === user.id) throw new Error("No puedes agregarte a ti mismo");

      // Check existing relationship in either direction
      const { data: existing, error: exErr } = await supabase
        .from("friendships")
        .select("id, status, user_id, friend_id")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`,
        )
        .maybeSingle();
      if (exErr) throw exErr;
      if (existing) {
        if (existing.status === "accepted") throw new Error("Ya son amigos");
        if (existing.status === "pending") throw new Error("Solicitud ya pendiente");
      }

      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: targetUserId,
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Solicitud ya enviada");
        throw error;
      }

      // Notify receiver (best-effort; ignore failures so the request still succeeds)
      const meta = user.user_metadata as { display_name?: string; username?: string } | undefined;
      const senderName = meta?.display_name || meta?.username || "Alguien";
      await supabase
        .from("notifications")
        .insert({
          user_id: targetUserId,
          type: "friend_request",
          message: `${senderName} te envió una solicitud de amistad`,
          data: { from_user_id: user.id },
        })
        .then(() => undefined, () => undefined);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["friends", user?.id] }),
  });

  // Backwards-compat: addFriend by code/username string.
  const addFriend = useMutation({
    mutationFn: async (codeOrUsername: string) => {
      const target = await searchUser(codeOrUsername);
      if (!target) throw new Error("No user found with that code or username.");
      await sendRequest.mutateAsync(target.user_id);
    },
  });

  const respondRequest = useMutation({
    mutationFn: async ({
      friendshipId,
      accept,
    }: {
      friendshipId: string;
      accept: boolean;
    }) => {
      if (accept) {
        const { error } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", friendshipId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("friendships")
          .update({ status: "rejected" })
          .eq("id", friendshipId);
        if (error) throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["friends", user?.id] }),
  });

  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["friends", user?.id] }),
  });

  return {
    friends: acceptedFriends,
    pendingRequests,
    sentRequests,
    isLoading: friendsQuery.isLoading,
    searchUser,
    sendRequest,
    addFriend,
    respondRequest,
    removeFriend,
    inviteKey: inviteKeyQuery.data ?? null,
    resetInviteKey,
    acceptInvite,
  };
};