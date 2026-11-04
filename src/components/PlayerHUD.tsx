import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import CharacterPortrait from "@/components/CharacterPortrait";
import { getTitle } from "@/lib/titles";

const PlayerHUD = ({ className }: { className?: string }) => {
  const { profile } = useProfile();
  const navigate = useNavigate();

  const { level, xp, xpForCurrentLevel, xpForNextLevel, progress, title, titleColor, titleIcon, avatarUrl, points } = useMemo(() => {
    const totalXp = profile?.xp ?? 0;
    const lvl = profile?.level ?? 1;

    let xpCurrent = 0;
    for (let i = 1; i < lvl; i++) xpCurrent += 50 + (i - 1) * 25;
    const xpNext = xpCurrent + 50 + (lvl - 1) * 25;
    const prog = xpNext > xpCurrent ? ((totalXp - xpCurrent) / (xpNext - xpCurrent)) * 100 : 0;

    const t = getTitle((profile as any)?.equipped_title ?? null);

    return {
      level: lvl,
      xp: totalXp,
      xpForCurrentLevel: xpCurrent,
      xpForNextLevel: xpNext,
      progress: Math.min(Math.max(prog, 0), 100),
      title: t?.name ?? "Sin título",
      titleColor: t?.color ?? undefined,
      titleIcon: t?.icon ?? "",
      avatarUrl: (profile as any)?.avatar_url as string | null,
      points: profile?.stat_points_available ?? 0,
    };
  }, [profile]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/character")}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-primary/50 bg-primary/10 hover:border-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] transition-all overflow-hidden shrink-0"
          title="Personaje"
        >
          <CharacterPortrait url={avatarUrl} size={40} className="!rounded-md !border-0" />
          {points > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground animate-pulse">
              {points > 9 ? "9+" : points}
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-pixel text-[8px] text-primary">LV.{level}</span>
            <span
              className="font-pixel text-[8px] truncate"
              style={{ color: titleColor ?? "hsl(var(--muted-foreground))" }}
            >
              {titleIcon} {title}
            </span>
          </div>
          <p className="font-pixel text-[8px] text-muted-foreground truncate mt-0.5">{profile?.display_name ?? "Jugador"}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-pixel text-[8px] text-accent-foreground">
            <Zap className="h-3 w-3 text-yellow-400" /> XP
          </span>
          <span className="font-pixel text-[8px] text-muted-foreground">
            {xp - xpForCurrentLevel}/{xpForNextLevel - xpForCurrentLevel}
          </span>
        </div>
        <div className="xp-bar-bg">
          <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

export default PlayerHUD;
