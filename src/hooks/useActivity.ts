import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { browserTz, dayKey, fromKey, hourIn } from "@/lib/localDay";

export interface ActivityRow {
  awardedAt: Date;
  /** Local day the award counts for. Habits use the ledger's own day. */
  day: string;
  hour: number;
  weekday: number; // 0 = Sunday
  xp: number;
  taskId: string;
  isDaily: boolean;
  priority: string | null;
  title: string | null;
}

/**
 * Completed tasks and habits from the server-side XP ledger, from `fromDay` (inclusive) until now.
 * The ledger is the only history that survives the daily habit reset.
 */
export function useActivity(fromDay: string) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const tz = profile?.timezone || browserTz();

  return useQuery({
    queryKey: ["activity", user?.id, fromDay, tz],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<ActivityRow[]> => {
      // Pad a day on each side: the RPC filters by UTC instant, we re-bucket by local day below.
      const from = fromKey(fromDay);
      from.setDate(from.getDate() - 1);
      const to = new Date(Date.now() + 86_400_000);
      const { data, error } = await supabase.rpc("get_my_activity", { p_from: from.toISOString(), p_to: to.toISOString() });
      if (error) throw error;
      return (data ?? [])
        .map((r) => {
          const awardedAt = new Date(r.awarded_at);
          const day = r.day ?? dayKey(awardedAt, tz);
          return {
            awardedAt,
            day,
            hour: hourIn(awardedAt, tz),
            weekday: fromKey(day).getDay(),
            xp: r.xp,
            taskId: r.task_id,
            isDaily: r.is_daily,
            priority: r.priority,
            title: r.title,
          };
        })
        .filter((r) => r.day >= fromDay);
    },
  });
}
