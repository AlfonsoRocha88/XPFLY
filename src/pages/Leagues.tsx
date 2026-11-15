import { useEffect, useMemo, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { CalendarCheck, Hourglass, ListChecks, Sparkles } from "lucide-react";
import { InfoRow, InfoTip } from "@/components/ui/info-tip";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { LeagueEmblem } from "@/components/leagues/LeagueEmblem";
import { TrophyIcon } from "@/components/icons/TrophyIcon";
import {
  LEAGUES,
  getCurrentLeague,
  getNextLeague,
  getDivisionProgress,
  leagueById,
  leagueLabel,
  leagueFamilyIndex,
  TASKS_PER_TROPHY,
  STREAK_BONUS_FROM,
  DAILY_TROPHY_BONUS,
  WEEKLY_TROPHY_BONUS,
  DECAY_FROM_FAMILY,
  type LeagueDivision,
} from "@/lib/leagues";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatars";
import { StreakComet } from "@/components/icons/StreakComet";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type LbRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  trophies: number;
  leagueId: string;
  isUser: boolean;
};

type RpcRow = { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null; xp: number | null; trophies: number | null; current_league_id: string | null };

/** One row per family (the top tier has no divisions). */
const FAMILIES: LeagueDivision[] = LEAGUES.filter((d) => d.divisionNumber === 3 || d.divisionNumber === null);

const Row = ({ row, rank }: { row: LbRow; rank: number }) => {
  const league = leagueById(row.leagueId);
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", row.isUser && "bg-primary/10 ring-1 ring-primary/35")}>
      <span className={cn("w-6 shrink-0 text-center text-sm font-semibold tabular-nums", rank <= 3 ? "text-foreground" : "text-muted-foreground")}>{rank}</span>
      <img src={avatarSrc(row.avatar_url, row.user_id)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm font-semibold", row.isUser && "text-primary")}>
          {row.name}
          {row.isUser && <span className="ml-1 text-xs font-medium text-primary/80">(tú)</span>}
        </span>
        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <LeagueEmblem family={league.family} division={league.divisionNumber} size={16} animated={false} />
          {leagueLabel(league)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums">
        <TrophyIcon size={16} /> {row.trophies}
      </span>
    </div>
  );
};

/** Weekly goal: days of the current 7-day run with all dailies done. */
const WeekRing = ({ days }: { days: number }) => {
  const r = 20, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6 -rotate-90" aria-hidden>
      <circle cx="24" cy="24" r={r} fill="none" stroke="hsl(var(--foreground) / 0.12)" strokeWidth="6" />
      <m.circle
        cx="24" cy="24" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - days / 7) }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      />
    </svg>
  );
};

const Leagues = () => {
  const { profile } = useProfile();
  const reduce = useReducedMotion();
  const trophies = profile?.trophies ?? 0;
  const streak = profile?.daily_streak ?? 0;
  const userId = profile?.user_id;

  const current = useMemo(() => getCurrentLeague(trophies), [trophies]);
  const next = useMemo(() => getNextLeague(trophies), [trophies]);
  const progress = useMemo(() => getDivisionProgress(trophies), [trophies]);
  const familyIdx = leagueFamilyIndex(current.id);

  const [tab, setTab] = useState<"rivals" | "global">("rivals");
  const [rows, setRows] = useState<{ rivals: LbRow[]; global: LbRow[] }>({ rivals: [], global: [] });
  const [loading, setLoading] = useState(true);
  const [myGlobalRank, setMyGlobalRank] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const toRows = (data: RpcRow[] | null): LbRow[] =>
      (data ?? []).map((p) => ({
        user_id: p.user_id,
        name: p.display_name || p.username || "Usuario",
        avatar_url: p.avatar_url,
        xp: p.xp ?? 0,
        trophies: p.trophies ?? 0,
        leagueId: p.current_league_id ?? getCurrentLeague(p.trophies ?? 0).id,
        isUser: p.user_id === userId,
      }));
    (async () => {
      setLoading(true);
      const [rivals, global] = await Promise.all([
        supabase.rpc("get_league_rivals", { _limit: 50 }),
        supabase.rpc("get_leaderboard", { _limit: 100 }),
      ]);
      if (cancelled) return;
      const g = toRows(global.data as RpcRow[] | null);
      setRows({ rivals: toRows(rivals.data as RpcRow[] | null), global: g });
      setLoading(false);
      const idx = g.findIndex((r) => r.isUser);
      if (idx >= 0) setMyGlobalRank(idx + 1);
      else if (userId) {
        const { data: rank } = await supabase.rpc("get_global_trophy_rank", { _user_id: userId });
        if (!cancelled) setMyGlobalRank(typeof rank === "number" ? rank : 0);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, trophies]);

  // Strip: center the current league (native scroll + snap; no scrollbar, no mouse-drag code).
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current;
    const active = el?.querySelector<HTMLElement>("[data-active='true']");
    if (el && active) el.scrollTo({ left: active.offsetLeft - el.clientWidth / 2 + active.clientWidth / 2, behavior: reduce ? "auto" : "smooth" });
  }, [current.family, reduce]);

  const list = rows[tab];
  const meInList = list.some((r) => r.isUser);
  const missing = next ? next.minTrophies - trophies : 0;
  const weekDays = streak % 7;

  return (
    <div className="space-y-5">
      {/* Hero: no card, so the emblem floats on the glass background */}
      <section className="relative pt-2 text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-52 w-52 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: current.color }}
          aria-hidden
        />
        <m.div
          key={current.id}
          className="relative mx-auto w-fit"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <LeagueEmblem family={current.family} division={current.divisionNumber} size={140} />
        </m.div>
        <h2 className="relative mt-2 font-serif text-3xl font-medium" style={{ color: current.color }}>{leagueLabel(current)}</h2>
        <div className="relative mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold tabular-nums">
          <TrophyIcon size={18} /> {trophies} trofeos
          <InfoTip title="Cómo ganar trofeos" className="ml-1">
            <InfoRow icon={<ListChecks className="h-4 w-4 text-primary" />}>{TASKS_PER_TROPHY} tareas completadas = 1 trofeo</InfoRow>
            <InfoRow icon={<Sparkles className="h-4 w-4 text-primary" />}>+{DAILY_TROPHY_BONUS} al completar todas tus diarias</InfoRow>
            <InfoRow icon={<StreakComet streak={Math.max(streak, STREAK_BONUS_FROM)} size={16} />}>
              Racha de {STREAK_BONUS_FROM}+ días: trofeos dobles{streak >= STREAK_BONUS_FROM ? <span className="font-semibold text-warning"> (activo)</span> : null}
            </InfoRow>
            <InfoRow icon={<CalendarCheck className="h-4 w-4 text-primary" />}>Semana perfecta: +{WEEKLY_TROPHY_BONUS} cada 7 días seguidos con todas tus diarias</InfoRow>
            <InfoRow icon={<Hourglass className="h-4 w-4" />}>
              Desde Neptuno, si pasas más de un día sin completar tareas o dejas urgentes vencidas, pierdes algunos trofeos.
            </InfoRow>
          </InfoTip>
        </div>
        <div className="relative mx-auto mt-5 max-w-sm">
          <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
            <m.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${current.color}, ${next?.color ?? current.color})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {next ? <>Faltan <span className="text-foreground">{missing}</span> para {leagueLabel(next)}</> : "Llegaste a la liga más alta"}
          </p>
        </div>
        {/* Weekly goal: one quiet line instead of a box */}
        <div className="relative mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
          <WeekRing days={weekDays} />
          <span>Semana perfecta <span className="tabular-nums text-foreground">{weekDays}/7</span> · +{WEEKLY_TROPHY_BONUS}</span>
          {familyIdx >= DECAY_FROM_FAMILY && <Hourglass className="h-3.5 w-3.5" aria-label="Tu liga pierde trofeos por inactividad" />}
        </div>
      </section>

      {/* Ladder: every league, swipe sideways */}
      <div
        ref={stripRef}
        data-no-swipe
        className="-mx-4 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-[calc(50%-36px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Todas las ligas"
      >
        <div className="flex w-max items-end gap-4 py-2">
          {FAMILIES.map((f) => {
            const isCurrent = f.family === current.family;
            const reached = trophies >= f.minTrophies;
            return (
              <div key={f.family} data-active={isCurrent} className="flex w-[72px] shrink-0 snap-center flex-col items-center gap-1.5">
                <LeagueEmblem family={f.family} division={isCurrent ? current.divisionNumber : null} size={isCurrent ? 72 : 52} locked={!reached} animated={isCurrent} />
                <span className={cn("truncate text-[11px] font-semibold", isCurrent ? "" : reached ? "text-foreground/80" : "text-muted-foreground")} style={isCurrent ? { color: f.color } : undefined}>
                  {f.league}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">{f.minTrophies}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rivals in your league / global ranking */}
      <section>
        <div className="glass flex rounded-full p-1" role="tablist">
          {([["rivals", "Rivales"], ["global", "Global"]] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn("relative flex-1 rounded-full py-1.5 text-sm font-medium transition-colors", tab === id ? "text-foreground" : "text-muted-foreground")}
            >
              {tab === id && <m.span layoutId="leagues-tab" className="absolute inset-0 rounded-full bg-card shadow-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          {tab === "rivals" ? `Jugadores en ${current.league}, ordenados por trofeos` : "Top 100 por trofeos"}
        </p>
        <m.div
          key={tab}
          className="surface mt-2 p-1.5"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay nadie aquí</p>
          ) : (
            list.map((r, i) => <Row key={r.user_id} row={r} rank={i + 1} />)
          )}
        </m.div>
        {!loading && tab === "global" && userId && !meInList && myGlobalRank > 0 && (
          <div className="glass sticky bottom-24 mt-2 rounded-2xl p-1.5">
            <Row row={{ user_id: userId, name: profile?.display_name || profile?.username || "Tú", avatar_url: profile?.avatar_url ?? null, xp: profile?.xp ?? 0, trophies, leagueId: current.id, isUser: true }} rank={myGlobalRank} />
          </div>
        )}
      </section>
    </div>
  );
};

export default Leagues;
