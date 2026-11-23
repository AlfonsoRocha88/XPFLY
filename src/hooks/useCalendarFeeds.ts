import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";

export type CalendarFeed = Tables<"calendar_feeds">;
export type CalendarProvider = "google" | "iphone" | "outlook";

/** Edge functions answer `{ error }` in the body; on non-2xx supabase-js hides it in error.context. */
async function readInvokeError(error: unknown, data: unknown): Promise<string | null> {
  const fromData = (data as { error?: unknown } | null)?.error;
  if (typeof fromData === "string") return fromData;
  if (!error) return null;
  const ctx = (error as { context?: unknown }).context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (body && typeof body.error === "string") return body.error;
    } catch { /* not JSON */ }
  }
  return error instanceof Error ? error.message : "Error";
}

export class CalendarError extends Error {}

export function useCalendarFeeds() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["calendar-feeds", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_feeds").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["calendar-feeds"] });
    qc.invalidateQueries({ queryKey: ["external-events"] });
  }, [qc]);

  const connectByLink = useCallback(async (url: string, provider: CalendarProvider) => {
    const { data, error } = await supabase.functions.invoke("sync-calendars", { body: { url, provider } });
    const msg = await readInvokeError(error, data);
    if (msg) throw new CalendarError(msg);
    invalidate();
    return data as { feed: CalendarFeed; count: number };
  }, [invalidate]);

  /** Redirects to Google consent; resolves "not_configured" when the server has no Google keys yet. */
  const connectGoogle = useCallback(async (): Promise<"redirect" | "not_configured"> => {
    const { data, error } = await supabase.functions.invoke("google-calendar-start", { body: { returnTo: window.location.origin } });
    const msg = await readInvokeError(error, data);
    if (msg === "not_configured") return "not_configured";
    if (msg) throw new CalendarError(msg);
    const url = (data as { url?: string } | null)?.url;
    if (!url) throw new CalendarError("No se pudo conectar Google");
    window.location.assign(url);
    return "redirect";
  }, []);

  const syncNow = useCallback(async (feedId?: string) => {
    const { data, error } = await supabase.functions.invoke("sync-calendars", { body: feedId ? { feedId } : {} });
    const msg = await readInvokeError(error, data);
    invalidate();
    if (msg) throw new CalendarError(msg);
    return (data as { results?: Array<{ id: string; count?: number; error?: string }> } | null)?.results ?? [];
  }, [invalidate]);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { name?: string; color?: string } }) => {
      const { error } = await supabase.from("calendar_feeds").update(patch).eq("id", id);
      if (error) throw error;
    },
    // Recolor/rename instantly; roll back if the write fails.
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<CalendarFeed[]>(key);
      qc.setQueryData<CalendarFeed[]>(key, (list) => list?.map((f) => (f.id === id ? { ...f, ...patch } : f)));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_feeds").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const { mutateAsync: updateAsync } = update;
  const { mutateAsync: removeAsync } = remove;
  const updateFeed = useCallback(
    (id: string, patch: { name?: string; color?: string }) => updateAsync({ id, patch }),
    [updateAsync],
  );
  const removeFeed = useCallback((id: string) => removeAsync(id), [removeAsync]);

  return {
    feeds: query.data ?? [],
    isLoading: query.isLoading,
    connectByLink,
    connectGoogle,
    syncNow,
    updateFeed,
    removeFeed,
  };
}
