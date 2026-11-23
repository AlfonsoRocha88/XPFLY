import { useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { CalendarPlus, Check, Loader2, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InfoTip, InfoRow } from "@/components/ui/info-tip";
import { timeAgo } from "@/components/clan/timeAgo";
import { cn } from "@/lib/utils";
import { useCalendarFeeds, type CalendarFeed } from "@/hooks/useCalendarFeeds";
import ConnectCalendar from "./ConnectCalendar";

const SWATCHES = ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#A142F4", "#12B5CB"];

/** Settings section: the calendars imported into the calendar view. */
export default function CalendarFeedsSettings() {
  const { feeds, isLoading } = useCalendarFeeds();
  const [connectOpen, setConnectOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <section className="surface p-4">
      <h2 className="section-title mb-3 flex items-center gap-2">
        Calendarios
        <InfoTip title="Calendarios" align="start">
          <InfoRow icon="📅">Tus eventos de Google, iPhone u Outlook aparecen en el calendario.</InfoRow>
          <InfoRow icon="🔄">Se actualizan solos; toca «…» para hacerlo ya.</InfoRow>
        </InfoTip>
      </h2>

      {feeds.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          <AnimatePresence initial={false}>
            {feeds.map((f) => (
              <m.li
                key={f.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -12, transition: { duration: 0.16 } }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                <FeedRow feed={f} />
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Button variant={feeds.length ? "outline" : "default"} onClick={() => setConnectOpen(true)} disabled={isLoading} className="w-full active:scale-[0.98]">
        <CalendarPlus className="h-4 w-4" /> Agregar calendario
      </Button>

      <ConnectCalendar open={connectOpen} onOpenChange={setConnectOpen} />
    </section>
  );
}

function FeedRow({ feed }: { feed: CalendarFeed }) {
  const { syncNow, updateFeed, removeFeed } = useCalendarFeeds();
  const [syncing, setSyncing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const sync = async () => {
    setSyncing(true);
    try {
      const [r] = await syncNow(feed.id);
      if (r?.error) toast.error(r.error);
      else toast(`✓ ${r?.count ?? 0} eventos`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const recolor = (color: string) => {
    updateFeed(feed.id, { color }).catch(() => toast.error("No se pudo cambiar el color"));
  };

  const remove = () => {
    removeFeed(feed.id).catch(() => toast.error("No se pudo quitar"));
  };

  return (
    <div className="flex items-center gap-3 rounded-xl bg-foreground/[0.04] px-3 py-2.5">
      <span
        className="h-3 w-3 shrink-0 rounded-full transition-colors duration-300"
        style={{ background: feed.color, boxShadow: `0 0 8px ${feed.color}` }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{feed.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {syncing ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Sincronizando</>
          ) : feed.last_synced_at ? timeAgo(feed.last_synced_at) : "Pendiente"}
          {feed.last_error && !syncing && (
            <span className="truncate rounded-full bg-destructive/15 px-1.5 py-px text-[10px] font-semibold text-destructive" title={feed.last_error}>
              Error
            </span>
          )}
        </p>
      </div>
      <DropdownMenu onOpenChange={(o) => { if (!o) setConfirmRemove(false); }}>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-8 w-8 shrink-0 touch-manipulation select-none items-center justify-center rounded-full text-muted-foreground transition-[color,transform] duration-150 hover:text-foreground active:scale-90"
            aria-label={`Opciones de ${feed.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem disabled={syncing} onSelect={() => void sync()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Color</DropdownMenuLabel>
          <div className="flex justify-between px-2 pb-2 pt-0.5">
            {SWATCHES.map((c) => {
              const active = feed.color.toLowerCase() === c.toLowerCase();
              return (
                <DropdownMenuItem
                  key={c}
                  onSelect={(e) => { e.preventDefault(); recolor(c); }}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full p-0 transition-transform duration-150 focus:bg-transparent active:scale-90 data-[highlighted]:scale-110"
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                >
                  {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" strokeWidth={3} />}
                </DropdownMenuItem>
              );
            })}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              if (!confirmRemove) { e.preventDefault(); setConfirmRemove(true); return; }
              remove();
            }}
            className={cn("text-destructive focus:text-destructive", confirmRemove && "bg-destructive/15 font-semibold")}
          >
            <Trash2 className="mr-2 h-4 w-4" /> {confirmRemove ? "¿Quitar?" : "Quitar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
