import { useMemo, useRef, useState, useEffect } from "react";
import { Shield, Trophy, Lock, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { LeagueShield } from "@/components/leagues/LeagueShield";
import {
  LEAGUES,
  getCurrentLeague,
  getNextLeague,
  getDivisionProgress,
  leagueLabel,
  type LeagueDivision,
} from "@/lib/leagues";
import { cn } from "@/lib/utils";

/** Group divisions by league family, preserving order. */
function groupByLeague(): { league: string; divisions: LeagueDivision[]; color: string; emblem: string }[] {
  const map = new Map<string, { league: string; divisions: LeagueDivision[]; color: string; emblem: string }>();
  for (const d of LEAGUES) {
    const existing = map.get(d.league);
    if (existing) existing.divisions.push(d);
    else map.set(d.league, { league: d.league, divisions: [d], color: d.color, emblem: d.emblem });
  }
  return Array.from(map.values());
}

const PROMOTION_RANK = 4; // top 4 advance — Duolingo style

type LbRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  trophies: number;
  league: string;
  isUser: boolean;
};

const GlobalRow = ({ row, rank }: { row: LbRow; rank: number }) => (
  <div
    className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
      row.isUser && "bg-primary/15 ring-1 ring-primary/40",
    )}
  >
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-pixel text-xs",
        rank === 1 && "bg-primary/25 text-primary",
        rank === 2 && "bg-primary/15 text-primary/90",
        rank === 3 && "bg-primary/10 text-primary/80",
        rank > 3 && "text-muted-foreground",
      )}
    >
      {rank}
    </div>
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-muted"
      style={{ borderColor: row.isUser ? "hsl(var(--primary))" : "hsl(var(--border))" }}
    >
      {row.avatar_url ? (
        <img src={row.avatar_url} alt={row.name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-pixel text-xs text-muted-foreground">
          {row.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn("truncate text-sm font-semibold", row.isUser && "text-primary")}>
        {row.name}
        {row.isUser && <span className="ml-1 font-pixel text-[11px] text-primary/80">(TÚ)</span>}
      </p>
      <p className="truncate font-pixel text-[11px] text-muted-foreground">
        {row.league}
      </p>
    </div>
    <div className="flex items-center gap-1 font-pixel text-xs text-primary">
      <Trophy className="h-3 w-3" />
      {row.trophies}
    </div>
  </div>
);

const Shield3D = ({
  color,
  emblem,
  size = 96,
  locked = false,
  active = false,
}: {
  color: string;
  emblem: string;
  size?: number;
  locked?: boolean;
  active?: boolean;
}) => (
  <div
    className={cn(
      "relative flex items-center justify-center transition-transform",
      active && "animate-pulse",
      locked && "grayscale opacity-40",
    )}
    style={{ width: size, height: size }}
  >
    {/* Glow */}
    <div
      className="absolute inset-0 rounded-full blur-xl"
      style={{ background: color, opacity: locked ? 0 : 0.45 }}
    />
    {/* Shield body */}
    <div
      className="relative flex items-center justify-center border-4 border-white/20"
      style={{
        width: size * 0.86,
        height: size * 0.92,
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.45), ${color} 60%, rgba(0,0,0,0.35) 100%)`,
        clipPath: "polygon(50% 0%, 100% 18%, 100% 65%, 50% 100%, 0% 65%, 0% 18%)",
        boxShadow: active ? `0 0 28px ${color}` : `0 6px 18px rgba(0,0,0,0.45)`,
      }}
    >
      <span style={{ fontSize: size * 0.42 }}>{emblem}</span>
    </div>
    {locked && (
      <Lock className="absolute h-6 w-6 text-foreground" />
    )}
  </div>
);

const Leagues = () => {
  const { profile } = useProfile();
  const trophies = profile?.trophies ?? 0;
  const userName = profile?.display_name || profile?.username || "Tú";
  const userId = profile?.user_id;

  const current = useMemo(() => getCurrentLeague(trophies), [trophies]);
  const next = useMemo(() => getNextLeague(trophies), [trophies]);
  const progress = useMemo(() => getDivisionProgress(trophies), [trophies]);
  const groups = useMemo(() => groupByLeague(), []);

  // One leaderboard fetch feeds both the league and global tabs.
  const [leaderboard, setLeaderboard] = useState<LbRow[]>([]);
  const [loadingLb, setLoadingLb] = useState(true);
  const [myGlobalRank, setMyGlobalRank] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingLb(true);
      const { data, error } = await supabase.rpc("get_leaderboard", { _limit: 100 });
      if (cancelled) return;
      const rows: LbRow[] = error || !data ? [] : data.map((p: any) => ({
        user_id: p.user_id,
        name: p.display_name || p.username || "Cazador",
        avatar_url: p.avatar_url,
        xp: p.xp ?? 0,
        trophies: p.trophies ?? 0,
        league: leagueLabel(getCurrentLeague(p.trophies ?? 0)),
        isUser: p.user_id === userId,
      }));
      setLeaderboard(rows);
      setLoadingLb(false);

      const inTopIdx = rows.findIndex((r) => r.isUser);
      if (inTopIdx >= 0) {
        setMyGlobalRank(inTopIdx + 1);
      } else if (userId) {
        const { data: rank } = await supabase.rpc("get_global_trophy_rank", { _user_id: userId });
        if (!cancelled) setMyGlobalRank(typeof rank === "number" ? rank : 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, trophies]);

  const myRank = leaderboard.findIndex((p) => p.isUser) + 1;
  const globalRows = leaderboard;
  const loadingGlobal = loadingLb;

  // Mouse drag-to-scroll for the league strip (touch works natively)
  const stripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; scrollLeft: number }>({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  // Auto-center the active shield on mount/league change
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>("[data-active='true']");
    if (active) {
      const offset = active.offsetLeft - el.clientWidth / 2 + active.clientWidth / 2;
      el.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [current.league]);

  return (
    <div>
      <div className="surface mb-4 flex items-center justify-between p-4">
        <div>
          <p className="eyebrow">Tu liga</p>
          <p className="font-serif text-xl font-medium">{leagueLabel(current)}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
          <Trophy className="h-4 w-4" /> {trophies}
        </span>
      </div>
      <div>
        <Tabs defaultValue="liga" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="liga" className="font-pixel text-xs">Liga</TabsTrigger>
            <TabsTrigger value="global" className="font-pixel text-xs">Global</TabsTrigger>
          </TabsList>
          <TabsContent value="liga">
        {/* Horizontal league shield strip — Duolingo style */}
        <div
          ref={stripRef}
          className={cn(
            "mb-6 -mx-4 overflow-x-auto overflow-y-hidden px-4 scrollbar-thin select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            const el = stripRef.current;
            if (!el) return;
            dragRef.current = { active: true, startX: e.pageX, scrollLeft: el.scrollLeft };
            setIsDragging(true);
          }}
          onMouseLeave={() => {
            dragRef.current.active = false;
            setIsDragging(false);
          }}
          onMouseUp={() => {
            dragRef.current.active = false;
            setIsDragging(false);
          }}
          onMouseMove={(e) => {
            if (!dragRef.current.active) return;
            const el = stripRef.current;
            if (!el) return;
            e.preventDefault();
            el.scrollLeft = dragRef.current.scrollLeft - (e.pageX - dragRef.current.startX);
          }}
        >
          <div className="flex items-end gap-3 w-max pb-2">
            {groups.map((g) => {
              const reached = g.divisions.some((d) => trophies >= d.minTrophies);
              const isCurrent = g.league === current.league;
              const passed = reached && !isCurrent;
              return (
                <div
                  key={g.league}
                  data-active={isCurrent}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <LeagueShield
                    league={g.league}
                    size={isCurrent ? 72 : 48}
                    locked={!reached}
                    active={isCurrent}
                  />
                  <span
                    className={cn(
                      "font-pixel text-[11px] text-center max-w-[72px] truncate",
                      isCurrent ? "" : passed ? "text-primary" : "text-muted-foreground",
                    )}
                    style={isCurrent ? { color: g.color } : undefined}
                  >
                    {g.league.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Title block */}
        <div className="mb-4 text-center">
          <h2
            className="font-display text-2xl font-medium tracking-wide md:text-3xl"
            style={{ color: "hsl(var(--primary))", textShadow: "0 0 18px hsl(var(--primary) / 0.45)" }}
          >
            Liga {leagueLabel(current)}
          </h2>
          <p className="mt-1 font-pixel text-xs text-muted-foreground">
            Los {PROMOTION_RANK} primeros ascienden a la siguiente liga
          </p>
        </div>

        {/* Horizontal progress bar to next league */}
        <Card
          className="mb-6 overflow-hidden border-2 border-primary/40 bg-card/70 p-4 backdrop-blur"
        >
          <div className="flex items-center justify-between font-pixel text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-primary" />
              <span className="text-primary">{trophies}</span>
              <span className="ml-1">trofeos</span>
            </span>
            <span className="text-right">
              {next ? `${next.minTrophies} → ${leagueLabel(next)}` : "Liga máxima"}
            </span>
          </div>
          <div className="relative mt-2 h-4 overflow-hidden rounded-full border border-border bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${progress * 100}%`,
                boxShadow: "inset 0 0 12px hsl(var(--primary) / 0.6)",
              }}
            />
          </div>
          <p className="mt-2 text-center font-pixel text-[11px] text-muted-foreground">
            +1 trofeo por misión · +5 al completar todas las diarias
          </p>
        </Card>

        {/* Leaderboard — real users from profiles */}
        <div className="rounded-xl border border-border bg-card/60 p-2 backdrop-blur">
          {loadingLb ? (
            <p className="py-8 text-center font-pixel text-xs text-muted-foreground">
              CARGANDO...
            </p>
          ) : leaderboard.length === 0 ? (
            <p className="py-8 text-center font-pixel text-xs text-muted-foreground">
              Sé el primero en aparecer aquí
            </p>
          ) : leaderboard.map((p, i) => {
            const rank = i + 1;
            const inPromo = rank <= PROMOTION_RANK;
            const showPromoDivider = rank === PROMOTION_RANK + 1;
            return (
              <div key={p.user_id}>
                {showPromoDivider && (
                  <div className="my-2 flex items-center justify-center gap-2 border-y border-primary/30 bg-primary/5 py-1.5">
                    <ChevronUp className="h-3 w-3 text-primary" />
                    <span className="font-pixel text-xs text-primary">
                      Zona de ascenso
                    </span>
                    <ChevronUp className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    p.isUser && "bg-primary/15 ring-1 ring-primary/40",
                  )}
                >
                  {/* Rank */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-pixel text-xs",
                      rank === 1 && "bg-primary/25 text-primary",
                      rank === 2 && "bg-primary/15 text-primary/90",
                      rank === 3 && "bg-primary/10 text-primary/80",
                      rank > 3 && inPromo && "text-primary",
                      rank > 3 && !inPromo && "text-muted-foreground",
                    )}
                  >
                    {rank}
                  </div>
                  {/* Avatar */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-muted"
                    style={{
                      borderColor: p.isUser ? "hsl(var(--primary))" : "hsl(var(--border))",
                    }}
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-pixel text-xs text-muted-foreground">
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Name + league */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "truncate text-sm font-semibold",
                        p.isUser && "text-primary",
                      )}
                    >
                      {p.name}
                      {p.isUser && (
                        <span className="ml-1 font-pixel text-[11px] text-primary/80">(TÚ)</span>
                      )}
                    </p>
                    <p className="truncate font-pixel text-[11px] text-muted-foreground">
                      {p.league} · {p.xp} XP
                    </p>
                  </div>
                  {/* Trophies */}
                  <div className="flex items-center gap-1 font-pixel text-xs text-primary">
                    <Trophy className="h-3 w-3" />
                    {p.trophies}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loadingLb && myRank > 0 && (
          <p className="mt-3 text-center font-pixel text-xs text-muted-foreground">
            TU POSICIÓN: #{myRank} DE {leaderboard.length}
          </p>
        )}
          </TabsContent>
          <TabsContent value="global">
            <div className="mb-4 text-center">
              <h2
                className="font-display text-2xl font-medium tracking-wide md:text-3xl"
                style={{ color: "hsl(var(--primary))", textShadow: "0 0 18px hsl(var(--primary) / 0.45)" }}
              >
                Ranking Global
              </h2>
              <p className="mt-1 font-pixel text-xs text-muted-foreground">
                Top 100 por trofeos
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-2 backdrop-blur">
              {loadingGlobal ? (
                <p className="py-8 text-center font-pixel text-xs text-muted-foreground">
                  CARGANDO...
                </p>
              ) : globalRows.length === 0 ? (
                <p className="py-8 text-center font-pixel text-xs text-muted-foreground">
                  Sé el primero en aparecer aquí
                </p>
              ) : (
                globalRows.map((p, i) => {
                  const rank = i + 1;
                  return (
                    <GlobalRow key={p.user_id} row={p} rank={rank} />
                  );
                })
              )}
            </div>

            {!loadingGlobal && userId && myGlobalRank > globalRows.length && (
              <div className="sticky bottom-2 mt-3 rounded-xl border-2 border-primary/60 bg-background/90 p-2 shadow-lg backdrop-blur">
                <p className="mb-1 text-center font-pixel text-[11px] text-primary">
                  TU POSICIÓN
                </p>
                <GlobalRow
                  row={{
                    user_id: userId,
                    name: userName,
                    avatar_url: profile?.avatar_url ?? null,
                    xp: profile?.xp ?? 0,
                    trophies,
                    league: leagueLabel(current),
                    isUser: true,
                  }}
                  rank={myGlobalRank}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leagues;