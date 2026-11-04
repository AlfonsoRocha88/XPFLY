import { Crown, Target, Timer } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClanContributions, type Clan } from "@/hooks/useClans";
import MedalIcon from "./MedalIcon";

function timeUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "reiniciando…";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h restantes`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h restantes`;
}

const ClanWeeklyChallenge = ({ clan }: { clan: Clan }) => {
  const pct = Math.min(100, Math.round((clan.weekly_progress / Math.max(1, clan.weekly_goal)) * 100));
  const done = clan.weekly_progress >= clan.weekly_goal;
  const { data: contributions, isLoading } = useClanContributions(clan.id);
  return (
    <div className="space-y-3">
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Reto semanal</h3>
        </div>
        <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Timer className="h-3 w-3" />
          {timeUntil(clan.weekly_reset_at)}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Completar <span className="font-semibold text-foreground">{clan.weekly_goal}</span> misiones esta semana
      </p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-primary to-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">{clan.weekly_progress}/{clan.weekly_goal}</span>
        <span>{pct}%</span>
      </div>
    </div>

    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-300" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Contribuciones</h3>
      </div>
      {isLoading ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Cargando…</p>
      ) : !contributions || contributions.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Aún nadie ha contribuido esta semana.</p>
      ) : (
        <ScrollArea className="max-h-[260px]">
          <ul className="space-y-1.5">
            {contributions.map((c, i) => {
              const name = c.profile?.display_name || c.profile?.username || "Jugador";
              return (
                <li key={c.user_id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-2 py-2">
                  <div className="w-6 shrink-0 text-center">
                    {i < 3 ? <MedalIcon rank={(i + 1) as 1 | 2 | 3} /> : (
                      <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                    )}
                  </div>
                  <Avatar className="h-8 w-8 ring-1 ring-border">
                    <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-sm font-bold tabular-nums text-primary ring-1 ring-primary/30">
                    {c.count}
                  </span>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
    </div>
  );
};

export default ClanWeeklyChallenge;