import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import CharacterPortrait from "@/components/CharacterPortrait";
import { getTitle } from "@/lib/titles";

/** XP needed to go from level `lvl` to `lvl + 1`. */
const xpStep = (lvl: number) => 50 + (lvl - 1) * 25;

const PlayerHUD = ({ className, showStreak = false }: { className?: string; showStreak?: boolean }) => {
  const { profile } = useProfile();
  const navigate = useNavigate();

  const { level, intoLevel, levelSize, progress, title, titleIcon } = useMemo(() => {
    const totalXp = profile?.xp ?? 0;
    const lvl = profile?.level ?? 1;
    let base = 0;
    for (let i = 1; i < lvl; i++) base += xpStep(i);
    const size = xpStep(lvl);
    const into = Math.max(0, totalXp - base);
    const t = getTitle(profile?.equipped_title ?? null);
    return {
      level: lvl,
      intoLevel: into,
      levelSize: size,
      progress: Math.min(100, (into / size) * 100),
      title: t?.name ?? null,
      titleIcon: t?.icon ?? "",
    };
  }, [profile]);

  const points = profile?.stat_points_available ?? 0;
  const streak = profile?.daily_streak ?? 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        onClick={() => navigate("/character")}
        className="relative shrink-0 rounded-full transition-transform active:scale-95"
        title="Ver personaje"
        aria-label="Ver personaje"
      >
        <CharacterPortrait url={profile?.avatar_url} seed={profile?.user_id} size={52} />
        {points > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {points > 9 ? "9+" : points}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[15px] font-semibold">{profile?.display_name ?? "Jugador"}</p>
          {showStreak && (
            <span className={cn("flex shrink-0 items-center gap-0.5 text-sm font-semibold", streak > 0 ? "text-warning" : "text-muted-foreground")}>
              <Flame className="h-4 w-4" /> {streak}
            </span>
          )}
        </div>
        <p className="truncate text-xs font-medium text-muted-foreground">
          <span className="text-primary">Nivel {level}</span>
          {title && <> · {titleIcon} {title}</>}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="xp-bar-bg flex-1">
            <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
            {intoLevel}/{levelSize} XP
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlayerHUD;
