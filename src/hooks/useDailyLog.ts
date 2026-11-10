import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { browserTz, dayKey } from "@/lib/localDay";

export interface SleepLog {
  day: string;
  sleepMinutes: number;
}

const KEY = "daily_logs";

/** Sleep logs from `fromDay` (inclusive), oldest first. */
export function useSleepLogs(fromDay: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, user?.id, fromDay],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<SleepLog[]> => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("day, sleep_minutes")
        .gte("day", fromDay)
        .not("sleep_minutes", "is", null)
        .order("day");
      if (error) throw error;
      return (data ?? []).map((r) => ({ day: r.day, sleepMinutes: r.sleep_minutes! }));
    },
  });
}

/** Today's local day key and whether a sleep entry already exists for it. */
export function useTodaySleep() {
  const { profile } = useProfile();
  const today = dayKey(new Date(), profile?.timezone || browserTz());
  const q = useSleepLogs(today);
  return { today, logged: q.data?.some((l) => l.day === today) ?? false, loading: q.isLoading, minutes: q.data?.find((l) => l.day === today)?.sleepMinutes };
}

export function useSaveSleep() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ day, sleepMinutes, sleptAt, wokeAt }: { day: string; sleepMinutes: number; sleptAt?: string | null; wokeAt?: string | null }) => {
      const { error } = await supabase
        .from("daily_logs")
        .upsert(
          { user_id: user!.id, day, sleep_minutes: sleepMinutes, slept_at: sleptAt ?? null, woke_at: wokeAt ?? null },
          { onConflict: "user_id,day" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
