import { useState } from "react";
import { Coins, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChests, type ChestReward } from "@/hooks/useChests";
import { GameIcon } from "@/components/icons/GameIcons";

const RARITY_STYLES: Record<string, { label: string; className: string }> = {
  common: { label: "Común", className: "bg-muted text-muted-foreground" },
  rare: { label: "Raro", className: "bg-[hsl(210_85%_52%/0.12)] text-[hsl(210_85%_45%)]" },
  epic: { label: "Épica", className: "bg-[hsl(275_70%_58%/0.12)] text-[hsl(275_60%_50%)]" },
  legendary: { label: "Legendario", className: "bg-xp/15 text-[hsl(38_92%_40%)]" },
};

const UPCOMING_ITEMS = [
  { id: "potion", name: "Poción de XP", icon: "potion", price: 150 },
  { id: "freeze", name: "Protector de racha", icon: "frost", price: 100 },
  { id: "title-pack", name: "Pack de títulos", icon: "medal", price: 500 },
  { id: "wallpaper", name: "Fondo exclusivo", icon: "frame", price: 300 },
  { id: "outfit", name: "Atuendo raro", icon: "shirt", price: 750 },
  { id: "boost", name: "Boost x2 XP", icon: "bolt", price: 400 },
];

const Shop = () => {
  const { coins, chests, openChest } = useChests();
  const [opening, setOpening] = useState(false);
  const [reward, setReward] = useState<ChestReward | null>(null);

  const handleOpenChest = () => {
    if (chests <= 0 || opening) return;
    setOpening(true);
    setReward(null);
    setTimeout(async () => {
      try {
        setReward(await openChest.mutateAsync());
      } catch {
        // toast handled in hook
      } finally {
        setOpening(false);
      }
    }, 900);
  };

  const rarity = reward ? RARITY_STYLES[reward.rarity] ?? RARITY_STYLES.common : null;

  return (
    <div className="space-y-6">
      <section className="surface flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex w-full items-center justify-between">
          <h2 className="section-title">Cofres</h2>
          <span className="flex items-center gap-1.5 rounded-full bg-xp/15 px-3 py-1 text-sm font-semibold text-[hsl(38_92%_38%)] dark:text-xp">
            <Coins className="h-4 w-4" /> {coins}
          </span>
        </div>

        <button
          onClick={handleOpenChest}
          disabled={chests <= 0 || opening}
          className={cn(
            "relative flex h-28 w-28 items-center justify-center rounded-3xl transition-transform",
            chests > 0 ? "bg-xp/15 text-xp hover:scale-105 active:scale-95" : "cursor-not-allowed bg-muted text-muted-foreground",
            opening && "animate-[wiggle_0.25s_ease-in-out_infinite]",
          )}
          aria-label="Abrir cofre"
        >
          <Gift className="h-14 w-14" strokeWidth={1.75} />
          {chests > 0 && (
            <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-card bg-destructive px-1.5 text-xs font-semibold text-white">
              {chests}
            </span>
          )}
        </button>

        <div>
          <p className="text-[15px] font-semibold">
            {opening ? "Abriendo…" : chests > 0 ? `${chests} cofre${chests === 1 ? "" : "s"} disponible${chests === 1 ? "" : "s"}` : "Sin cofres por ahora"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {chests > 0 ? "Toca el cofre para abrirlo" : "Completa tus tareas diarias para ganar uno"}
          </p>
        </div>

        {reward && rarity && (
          <div className="flex w-full max-w-xs flex-col items-center gap-1.5 rounded-2xl border border-border p-4 animate-in zoom-in-90 duration-300">
            <GameIcon name={reward.icon} size={48} className="text-xp" />
            <p className="text-[15px] font-semibold">{reward.label}</p>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", rarity.className)}>{rarity.label}</span>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="section-title">Artículos</h2>
          <span className="text-xs font-medium text-muted-foreground">Próximamente</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {UPCOMING_ITEMS.map((item) => (
            <div key={item.id} className="surface flex flex-col items-center gap-1.5 p-4 text-center opacity-75">
              <GameIcon name={item.icon} size={32} className="text-primary" />
              <p className="text-sm font-medium leading-tight">{item.name}</p>
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Coins className="h-3.5 w-3.5" /> {item.price}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Shop;
