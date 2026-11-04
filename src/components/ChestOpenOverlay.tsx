import { useEffect, useState } from "react";
import { Gift, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChestReward } from "@/hooks/useChests";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full border border-border bg-background/80 p-2 text-foreground hover:bg-background"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center gap-6 px-6">
        {!reward ? (
          <>
            <div
              className={cn(
                "relative flex h-40 w-40 items-center justify-center rounded-3xl border-4 border-yellow-400 bg-yellow-400/10 shadow-[0_0_60px_hsl(45_90%_60%/0.7)]",
                shake && "animate-bounce"
              )}
            >
              <Gift className="h-24 w-24 text-yellow-300" />
              <Sparkles className="absolute h-44 w-44 animate-spin text-yellow-300/70" />
            </div>
            <p className="font-pixel text-[12px] tracking-wider text-yellow-300">
              ABRIENDO COFRE...
            </p>
          </>
        ) : (
          <>
            <div
              className={cn(
                "flex flex-col items-center gap-3 rounded-2xl border-4 bg-card p-8 animate-in zoom-in-50 duration-500",
                RARITY_COLORS[reward.rarity]
              )}
            >
              <div className="text-7xl animate-bounce">{reward.icon}</div>
              <p className="font-pixel text-[14px] text-foreground">{reward.label}</p>
              <p className="font-pixel text-[8px] uppercase tracking-wider text-muted-foreground">
                {reward.rarity}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border-2 border-primary bg-primary/10 px-6 py-2 font-pixel text-[10px] tracking-wider text-primary hover:bg-primary/20"
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