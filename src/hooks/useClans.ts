import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { DEFAULT_EMBLEM, normalizeEmblem, type EmblemConfig } from "@/lib/clan-emblem";
import { CLAN_ROLE_RANK, normalizeRole, type ClanRole } from "@/lib/clan-roles";

export interface ClanMemberProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  trophies: number;
  current_league_id: string;
  daily_streak: number;
  stats: any;
}

export interface ClanMember {
  id: string;
  clan_id: string;
  user_id: string;
  role: ClanRole;
  joined_at: string;
  profile: ClanMemberProfile | null;
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  color: string;
  leader_id: string;
  max_members: number;
  member_count: number;
  emblem_config: EmblemConfig;
  level: number;
  xp: number;
  join_type: "open" | "request" | "closed";
  weekly_goal: number;
  weekly_progress: number;
  weekly_reset_at: string;
  created_at: string;
  updated_at: string;
  members?: ClanMember[];
}

export interface ClanActivity {
  id: string;
  clan_id: string;
  user_id: string | null;
  type: string;
  data: any;
  created_at: string;
  profile?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
}

export interface ClanMessage {
  id: string;
  clan_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
}

export interface ClanJoinRequest {
  id: string;
  clan_id: string;
  user_id: string;
  status: string;
  requested_at: string;
  profile?: { display_name: string | null; username: string | null; level: number; avatar_url: string | null } | null;
}

function rankOf(role: ClanRole, trophies: number) {
  return CLAN_ROLE_RANK[role] * 1000000 + trophies;
}

/* ---------------------------------------------------------------- queries */

export const useMyClan = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["my-clan", user?.id],
    queryFn: async (): Promise<Clan | null> => {
      const { data: membership, error: mErr } = await supabase
        .from("clan_members")
        .select("clan_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!membership) return null;

      const { data: clan, error } = await supabase
        .from("clans")
        .select("*")
        .eq("id", membership.clan_id)
        .maybeSingle();
      if (error) throw error;
      if (!clan) return null;

      const { data: members } = await supabase
        .from("clan_members")
        .select("*")
        .eq("clan_id", clan.id);

      const userIds = (members ?? []).map((m: any) => m.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.rpc("get_profiles_public", { _user_ids: userIds })
        : { data: [] as any[] };

      const enriched: ClanMember[] = (members ?? [])
        .map((m: any) => ({
          id: m.id,
          clan_id: m.clan_id,
          user_id: m.user_id,
          role: normalizeRole(m.role),
          joined_at: m.joined_at,
          profile: (profiles?.find((p: any) => p.user_id === m.user_id) as ClanMemberProfile | undefined) ?? null,
        }))
        .sort((a, b) => rankOf(b.role, b.profile?.trophies ?? 0) - rankOf(a.role, a.profile?.trophies ?? 0));

      return {
        ...(clan as any),
        emblem_config: normalizeEmblem(clan.emblem_config),
        join_type: (clan.join_type as Clan["join_type"]) ?? "open",
        members: enriched,
      };
    },
    enabled: !!user,
  });

  // Realtime: keep my-clan, activity, messages and join requests fresh.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`clan-root:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "clans" }, () => {
        qc.invalidateQueries({ queryKey: ["my-clan"] });
        qc.invalidateQueries({ queryKey: ["clan-search"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clan_members" }, () => {
        qc.invalidateQueries({ queryKey: ["my-clan"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clan_join_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["clan-join-requests"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clan_activity" }, () => {
        qc.invalidateQueries({ queryKey: ["clan-activity"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clan_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["clan-messages"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const myRole = useMemo<ClanRole | null>(() => {
    const me = query.data?.members?.find((m) => m.user_id === user?.id);
    return me ? me.role : null;
  }, [query.data, user]);

  return { clan: query.data ?? null, isLoading: query.isLoading, myRole };
};

export const useClanActivity = (clanId: string | undefined) => {
  return useQuery({
    queryKey: ["clan-activity", clanId],
    queryFn: async (): Promise<ClanActivity[]> => {
      if (!clanId) return [];
      const { data, error } = await supabase
        .from("clan_activity")
        .select("*")
        .eq("clan_id", clanId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean)));
      const { data: profiles } = userIds.length
        ? await supabase.rpc("get_profiles_public", { _user_ids: userIds })
        : { data: [] as any[] };
      return (data ?? []).map((r: any) => ({
        ...r,
        profile: profiles?.find((p: any) => p.user_id === r.user_id) ?? null,
      }));
    },
    enabled: !!clanId,
  });
};

export const useClanMessages = (clanId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["clan-messages", clanId],
    queryFn: async (): Promise<ClanMessage[]> => {
      if (!clanId) return [];
      const { data, error } = await supabase
        .from("clan_messages")
        .select("*")
        .eq("clan_id", clanId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []).slice().reverse();
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
      const { data: profiles } = userIds.length
        ? await supabase.rpc("get_profiles_public", { _user_ids: userIds })
        : { data: [] as any[] };
      return rows.map((r: any) => ({
        ...r,
        profile: profiles?.find((p: any) => p.user_id === r.user_id) ?? null,
      }));
    },
    enabled: !!clanId,
  });

  const send = useMutation({
    mutationFn: async (message: string) => {
      if (!clanId || !user) throw new Error("Sin sesión");
      const trimmed = message.trim().slice(0, 500);
      if (!trimmed) return;
      const { error } = await supabase.from("clan_messages").insert({
        clan_id: clanId,
        user_id: user.id,
        message: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clan-messages", clanId] }),
  });

  return { messages: query.data ?? [], isLoading: query.isLoading, send };
};

export const useClanSearch = (search: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clan-search", search],
    queryFn: async (): Promise<Clan[]> => {
      let q = supabase.from("clans").select("*").order("xp", { ascending: false }).limit(50);
      const term = search.trim();
      if (term.length >= 2) q = q.ilike("name", `%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        emblem_config: normalizeEmblem(c.emblem_config),
        join_type: (c.join_type as Clan["join_type"]) ?? "open",
      }));
    },
    enabled: !!user,
  });
};

export const useClanJoinRequests = (clanId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clan-join-requests", user?.id, clanId],
    queryFn: async () => {
      const incomingPromise = clanId
        ? supabase.from("clan_join_requests").select("*").eq("clan_id", clanId).eq("status", "pending")
        : Promise.resolve({ data: [] as any[], error: null });
      const outgoingPromise = supabase
        .from("clan_join_requests")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "pending");

      const [{ data: incoming, error: e1 }, { data: outgoing, error: e2 }] = await Promise.all([
        incomingPromise as any,
        outgoingPromise as any,
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const ids = Array.from(new Set([...(incoming ?? []), ...(outgoing ?? [])].map((r: any) => r.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.rpc("get_profiles_public", { _user_ids: ids })
        : { data: [] as any[] };

      const enrich = (r: any): ClanJoinRequest => ({
        ...r,
        profile: profiles?.find((p: any) => p.user_id === r.user_id) ?? null,
      });
      return {
        incoming: (incoming ?? []).map(enrich) as ClanJoinRequest[],
        outgoing: (outgoing ?? []).map(enrich) as ClanJoinRequest[],
      };
    },
    enabled: !!user,
  });
};

/* ----------------------------------------------------------- mutations */

export interface ClanContribution {
  user_id: string;
  count: number;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

export const useClanContributions = (clanId: string | undefined) => {
  return useQuery({
    queryKey: ["clan-contributions", clanId],
    queryFn: async (): Promise<ClanContribution[]> => {
      if (!clanId) return [];
      // Monday-aligned start of week (UTC) matches date_trunc('week', now()).
      const now = new Date();
      const day = (now.getUTCDay() + 6) % 7; // 0 = Monday
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
      const { data, error } = await supabase
        .from("clan_weekly_contributions")
        .select("user_id, count, week_start")
        .eq("clan_id", clanId)
        .gte("week_start", start.toISOString())
        .order("count", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      const { data: profiles } = userIds.length
        ? await supabase.rpc("get_profiles_public", { _user_ids: userIds })
        : { data: [] as any[] };
      return (data ?? []).map((r: any) => ({
        user_id: r.user_id,
        count: r.count,
        profile: profiles?.find((p: any) => p.user_id === r.user_id) ?? null,
      }));
    },
    enabled: !!clanId,
  });
};

export const useClanMutations = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-clan"] });
    qc.invalidateQueries({ queryKey: ["clan-search"] });
    qc.invalidateQueries({ queryKey: ["clan-join-requests"] });
  };

  const checkNameAvailable = async (name: string) => {
    const term = name.trim();
    if (term.length < 3) return false;
    const { data, error } = await supabase
      .from("clans")
      .select("id")
      .ilike("name", term)
      .limit(1);
    if (error) throw error;
    return (data ?? []).length === 0;
  };

  const createClan = useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      join_type: Clan["join_type"];
      emblem: EmblemConfig;
    }) => {
      const tag = input.name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5) || "CLAN";
      const { data, error } = await supabase
        .from("clans")
        .insert({
          name: input.name.trim(),
          tag,
          description: input.description.trim() || null,
          color: input.emblem.primary,
          leader_id: user!.id,
          emblem_config: input.emblem as any,
          join_type: input.join_type,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateClan = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Clan> & { id: string }) => {
      const { error } = await supabase.from("clans").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const requestToJoin = useMutation({
    mutationFn: async (clanId: string) => {
      const { data: existing } = await supabase
        .from("clan_members").select("id").eq("user_id", user!.id).maybeSingle();
      if (existing) throw new Error("Ya perteneces a un clan");
      const { data: clan } = await supabase.from("clans").select("join_type, leader_id, name").eq("id", clanId).maybeSingle();
      if (!clan) throw new Error("Clan no encontrado");
      if (clan.join_type === "closed") throw new Error("Este clan está cerrado");

      if (clan.join_type === "open") {
        const { error } = await supabase.from("clan_members").insert({
          clan_id: clanId, user_id: user!.id, role: "member",
        });
        if (error) throw error;
        return "joined";
      }

      const { data: dup } = await supabase
        .from("clan_join_requests").select("id")
        .eq("user_id", user!.id).eq("clan_id", clanId).eq("status", "pending").maybeSingle();
      if (dup) throw new Error("Solicitud ya pendiente");
      const { error } = await supabase.from("clan_join_requests").insert({
        clan_id: clanId, user_id: user!.id, status: "pending",
      });
      if (error) throw error;
      const senderName = (user!.user_metadata as any)?.display_name || (user!.user_metadata as any)?.username || "Un jugador";
      await supabase.from("notifications").insert({
        user_id: clan.leader_id,
        type: "clan_request",
        message: `${senderName} quiere unirse a ${clan.name}`,
        data: { clan_id: clanId, from_user_id: user!.id },
      }).then(() => undefined, () => undefined);
      return "requested";
    },
    onSuccess: invalidate,
  });

  const respondJoinRequest = useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      const { data: req, error: rErr } = await supabase
        .from("clan_join_requests").select("id, user_id, clan_id, status").eq("id", requestId).maybeSingle();
      if (rErr) throw rErr;
      if (!req) throw new Error("Solicitud no encontrada");
      if (accept) {
        const { data: already } = await supabase
          .from("clan_members").select("id").eq("user_id", req.user_id).maybeSingle();
        if (!already) {
          const { error } = await supabase.from("clan_members").insert({
            clan_id: req.clan_id, user_id: req.user_id, role: "member",
          });
          if (error) throw error;
        }
        await supabase.from("clan_join_requests").update({ status: "accepted" }).eq("id", requestId);
      } else {
        await supabase.from("clan_join_requests").update({ status: "rejected" }).eq("id", requestId);
      }
    },
    onSuccess: invalidate,
  });

  const setRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: ClanRole }) => {
      const { error } = await supabase.from("clan_members").update({ role }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      // Optimistic patch so the badge updates instantly across the UI.
      qc.setQueriesData({ queryKey: ["my-clan"] }, (old: any) => {
        if (!old || !old.members) return old;
        return {
          ...old,
          members: old.members.map((m: any) =>
            m.id === vars.memberId ? { ...m, role: vars.role } : m,
          ),
        };
      });
      invalidate();
    },
  });

  const kickMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("clan_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const leaveClan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clan_members").delete().eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const transferLeadership = useMutation({
    mutationFn: async ({ clanId, newLeaderUserId }: { clanId: string; newLeaderUserId: string }) => {
      const { error: e1 } = await supabase.from("clans").update({ leader_id: newLeaderUserId }).eq("id", clanId);
      if (e1) throw e1;
      // promote new leader, demote old
      await supabase.from("clan_members").update({ role: "leader" }).eq("clan_id", clanId).eq("user_id", newLeaderUserId);
      await supabase.from("clan_members").update({ role: "co_leader" }).eq("clan_id", clanId).eq("user_id", user!.id);
    },
    onSuccess: invalidate,
  });

  const dissolveClan = useMutation({
    mutationFn: async (clanId: string) => {
      // Delete members first (no cascade), then clan.
      await supabase.from("clan_members").delete().eq("clan_id", clanId);
      const { error } = await supabase.from("clans").delete().eq("id", clanId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const inviteByCode = useMutation({
    mutationFn: async ({ clanId, code }: { clanId: string; code: string }) => {
      const term = code.trim();
      if (!term) throw new Error("Introduce un código o usuario");
      const { data: matches } = await supabase.rpc("find_profile_preview", { _query: term });
      const profile = (matches as any[] | null)?.[0];
      if (!profile) throw new Error("Jugador no encontrado");
      const { data: existing } = await supabase
        .from("clan_members").select("id").eq("user_id", profile.user_id).maybeSingle();
      if (existing) throw new Error("Ya pertenece a un clan");
      const { data: clan } = await supabase.from("clans").select("name").eq("id", clanId).maybeSingle();
      await supabase.from("notifications").insert({
        user_id: profile.user_id,
        type: "clan_invite",
        message: `Te invitaron a unirte a ${clan?.name ?? "un clan"}`,
        data: { clan_id: clanId, from_user_id: user!.id },
      });
    },
  });

  return {
    checkNameAvailable,
    createClan,
    updateClan,
    requestToJoin,
    respondJoinRequest,
    setRole,
    kickMember,
    leaveClan,
    transferLeadership,
    dissolveClan,
    inviteByCode,
  };
};

export { DEFAULT_EMBLEM };