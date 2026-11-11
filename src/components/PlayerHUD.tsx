import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { ChevronRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import CharacterPortrait from "@/components/CharacterPortrait";
import { getTitle } from "@/lib/titles";
import { GameIcon } from "@/components/icons/GameIcons";

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

  const streak = profile?.daily_streak ?? 0;

  return (
    // The whole card is the way into the character screen, so it needs no separate button.
    <button
      type="button"
      onClick={() => navigate("/character")}
      className={cn("flex w-full items-center gap-3 rounded-2xl text-left", className)}
      aria-label="Ver personaje y atributos"
    >
      <span className="relative shrink-0 rounded-full">
        <CharacterPortrait url={profile?.avatar_url} seed={profile?.user_id} frame={profile?.equipped_frame} size={52} />
      </span>

      <span className="block min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="block truncate text-[15px] font-semibold">{profile?.display_name ?? "Usuario"}</span>
          {showStreak && (
            <span className={cn("flex shrink-0 items-center gap-0.5 text-sm font-semibold", streak > 0 ? "text-warning" : "text-muted-foreground")}>
              <Flame className="h-4 w-4" /> {streak}
            </span>
          )}
        </span>
        <span className="block truncate text-xs font-medium text-muted-foreground">
          <span className="text-primary">Nivel {level}</span>
          {title && <> · <GameIcon name={titleIcon} size={12} className="inline -mt-0.5" /> {title}</>}
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <span className="block xp-bar-bg flex-1">
            <span className="block xp-bar-fill" style={{ width: `${progress}%` }} />
          </span>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
            {intoLevel}/{levelSize} XP
          </span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </button>
  );
};

export default PlayerHUD;
