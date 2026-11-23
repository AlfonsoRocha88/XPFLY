import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCalendarFeeds } from "./useCalendarFeeds";

export interface ExternalEvent {
  id: string;
  feedId: string;
  title: string;
  /** Timed: real instants. All-day: local midnight of the first day / of the day after the last. */
  start: Date;
  end: Date;
  allDay: boolean;
  location: string | null;
  color: string;
  calendarName: string;
}

const DAY = 86_400_000;
/** All-day rows are stored as UTC midnights: read the date, not the instant (no shift west of UTC). */
const utcDateAsLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/** Events from connected calendars that overlap [from, to), with their calendar's colour and name. */
export function useExternalEvents(from: Date, to: Date) {
  const { user } = useAuth();
  const { feeds } = useCalendarFeeds();
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const query = useQuery({
    queryKey: ["external-events", fromIso, toIso],
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // Pad a day each side: all-day rows sit on UTC midnights, not on local ones.
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, feed_id, title, start_time, end_time, all_day, location")
        .lt("start_time", new Date(to.getTime() + DAY).toISOString())
        .gt("end_time", new Date(from.getTime() - DAY).toISOString())
        .order("start_time")
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = query.data;
  const events = useMemo<ExternalEvent[]>(() => {
    if (!rows?.length || !feeds.length) return [];
    const byId = new Map(feeds.map((f) => [f.id, f]));
    const fromMs = new Date(fromIso).getTime();
    const toMs = new Date(toIso).getTime();
    const out: ExternalEvent[] = [];
    for (const r of rows) {
      const feed = byId.get(r.feed_id);
      if (!feed) continue;
      const start = r.all_day ? utcDateAsLocal(r.start_time) : new Date(r.start_time);
      let end = r.all_day ? utcDateAsLocal(r.end_time) : new Date(r.end_time);
      if (end <= start) end = new Date(start.getTime() + (r.all_day ? DAY : 3_600_000));
      if (start.getTime() >= toMs || end.getTime() <= fromMs) continue;
      out.push({
        id: r.id, feedId: r.feed_id, title: r.title, start, end, allDay: r.all_day,
        location: r.location, color: feed.color, calendarName: feed.name,
      });
    }
    return out;
  }, [rows, feeds, fromIso, toIso]);

  return { events, isLoading: query.isLoading };
}
