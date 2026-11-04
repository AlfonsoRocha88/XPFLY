import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PartyMember {
  id: string;
  party_id: string;
  user_id: string;
  status: string;
  joined_at: string;
  profile?: {
    display_name: string | null;
    level: number;
    xp: number;
  };
}

export interface Party {
  id: string;
  name: string;
  leader_id: string;
  max_members: number;
  members: PartyMember[];
}

export const useParty = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const partyQuery = useQuery({
    queryKey: ["party"],
    queryFn: async () => {
      // Check if user is a member of any party
      const { data: membership } = await supabase
        .from("party_members")
        .select("party_id")
        .eq("user_id", user!.id)
        .eq("status", "accepted")
        .maybeSingle();

      // Check if user is leader of any party
      const { data: ledParty } = await supabase
        .from("parties")
        .select("*")
        .eq("leader_id", user!.id)
        .maybeSingle();

      const partyId = ledParty?.id || membership?.party_id;
      if (!partyId) return null;

      const { data: party } = await supabase
        .from("parties")
        .select("*")
        .eq("id", partyId)
        .single();

      if (!party) return null;

      // Get members
      const { data: members } = await supabase
        .from("party_members")
        .select("*")
        .eq("party_id", partyId);

      // Get profiles for members + leader
      const allUserIds = [
        party.leader_id,
        ...(members || []).map((m) => m.user_id),
      ];
      const uniqueIds = [...new Set(allUserIds)];

      const { data: profiles } = await supabase.rpc("get_profiles_public", {
        _user_ids: uniqueIds,
      });

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return {
        ...party,
        members: (members || []).map((m) => ({
          ...m,
          profile: profileMap.get(m.user_id),
        })),
        leaderProfile: profileMap.get(party.leader_id),
      } as Party & { leaderProfile?: PartyMember["profile"] };
    },
    enabled: !!user,
  });

  const partyInvites = useQuery({
    queryKey: ["party-invites"],
    queryFn: async () => {
      const { data } = await supabase
        .from("party_members")
        .select("*, parties(*)")
        .eq("user_id", user!.id)
        .eq("status", "pending");
      return data || [];
    },
    enabled: !!user,
  });

  const createParty = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("parties")
        .insert({ name, leader_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["party"] }),
  });

  const inviteToParty = useMutation({
    mutationFn: async (friendUserId: string) => {
      const party = partyQuery.data;
      if (!party) throw new Error("No tienes una party");
      if (party.leader_id !== user!.id) throw new Error("Solo el líder puede invitar");

      const { error } = await supabase.from("party_members").insert({
        party_id: party.id,
        user_id: friendUserId,
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Ya invitado");
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["party"] }),
  });

  const respondInvite = useMutation({
    mutationFn: async ({
      membershipId,
      accept,
    }: {
      membershipId: string;
      accept: boolean;
    }) => {
      if (accept) {
        const { error } = await supabase
          .from("party_members")
          .update({ status: "accepted" })
          .eq("id", membershipId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("party_members")
          .delete()
          .eq("id", membershipId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["party"] });
      queryClient.invalidateQueries({ queryKey: ["party-invites"] });
    },
  });

  const leaveParty = useMutation({
    mutationFn: async () => {
      const party = partyQuery.data;
      if (!party) return;

      if (party.leader_id === user!.id) {
        // Delete the whole party
        await supabase.from("parties").delete().eq("id", party.id);
      } else {
        await supabase
          .from("party_members")
          .delete()
          .eq("party_id", party.id)
          .eq("user_id", user!.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["party"] }),
  });

  const kickMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("party_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["party"] }),
  });

  return {
    party: partyQuery.data,
    partyInvites: partyInvites.data || [],
    isLoading: partyQuery.isLoading,
    createParty,
    inviteToParty,
    respondInvite,
    leaveParty,
    kickMember,
  };
};
