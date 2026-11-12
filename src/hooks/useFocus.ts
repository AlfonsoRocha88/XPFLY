import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type FocusSettings = {
  user_id: string;
  token: string;
  lock_until_dailies: boolean;
  focus_until: string | null;
  pause_until: string | null;
};

const KEY = ["focus-settings"] as const;
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/** The private link the iPhone Shortcuts automation calls. */
export const statusUrl = (token: string) => `${FUNCTIONS_URL}/focus-status?t=${token}`;

/** Ticks every second while `active`, so countdowns stay live without re-fetching. */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

/** Focus mode + app-blocking settings. The row is created on first use. */
export function useFocus() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    enabled: !!user,
    queryFn: async (): Promise<FocusSettings> => {
      const { data, error } = await supabase.from("focus_settings").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      if (data) return data;
      const { data: created, error: insErr } = await supabase
        .from("focus_settings")
        .insert({ user_id: user!.id })
        .select("*")
        .single();
      if (insErr) throw insErr;
      return created;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Omit<FocusSettings, "user_id">>) => {
      const { data, error } = await supabase
        .from("focus_settings")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("user_id", user!.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    // Instant UI: write the change into the cache first, roll back on failure.
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<FocusSettings>(KEY);
      if (prev) qc.setQueryData<FocusSettings>(KEY, { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(KEY, ctx.prev); },
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });

  const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

  return {
    settings: query.data ?? null,
    loading: query.isLoading,
    error: query.isError,
    setLockUntilDailies: (on: boolean) => update.mutate({ lock_until_dailies: on }),
    startFocus: (minutes: number) => update.mutate({ focus_until: minutesFromNow(minutes), pause_until: null }),
    endFocus: () => update.mutate({ focus_until: null }),
    pause: (minutes: number) => update.mutate({ pause_until: minutesFromNow(minutes) }),
    resume: () => update.mutate({ pause_until: null }),
    // A new token breaks the old link (if it was shared by mistake); the shortcut must be updated.
    regenerateLink: () => update.mutate({ token: crypto.randomUUID() }),
  };
}
