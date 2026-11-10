import { useEffect, useState } from "react";
import { Gift, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChestReward } from "@/hooks/useChests";
import { GameIcon } from "@/components/icons/GameIcons";

const RARITY_COLORS: Record<string, string> = {
  common: "border-slate-400 shadow-[0_0_30px_hsl(210_20%_60%/0.6)]",
  rare: "border-blue-400 shadow-[0_0_35px_hsl(210_90%_60%/0.7)]",
  epic: "border-purple-400 shadow-[0_0_40px_hsl(280_90%_60%/0.8)]",
  legendary: "border-yellow-400 shadow-[0_0_50px_hsl(45_90%_60%/0.9)]",
};

interface Props {
  open: boolean;
  reward: ChestReward | null;
  opening: boolean;
  onClose: () => void;
}

const ChestOpenOverlay = ({ open, reward, opening, onClose }: Props) => {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (open && opening) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 1200);
      return () => clearTimeout(t);
    }
  }, [open, opening]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] rounded-full bg-card p-2 text-foreground shadow-soft"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center gap-6 px-6">
        {!reward ? (
          <>
            <div
              className={cn(
                "relative flex h-40 w-40 items-center justify-center rounded-[2rem] bg-card text-xp shadow-lift",
                shake && "animate-bounce"
              )}
            >
              <Gift className="h-24 w-24" strokeWidth={1.5} />
              <Sparkles className="absolute h-48 w-48 animate-spin text-xp/50 [animation-duration:3s]" />
            </div>
            <p className="text-lg font-semibold text-white">
              Abriendo cofre...
            </p>
          </>
        ) : (
          <>
            <div
              className={cn(
                "flex flex-col items-center gap-3 rounded-3xl border-4 bg-card p-8 animate-in zoom-in-50 duration-500",
                RARITY_COLORS[reward.rarity]
              )}
            >
              <GameIcon name={reward.icon} size={72} className="animate-bounce text-xp" />
              <p className="text-xl font-semibold">{reward.label}</p>
              <p className="text-sm font-medium capitalize text-muted-foreground">
                {reward.rarity}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lift transition-transform active:scale-95"
            >
              GENIAL
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChestOpenOverlay;