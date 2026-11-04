import { useState } from "react";
import { ArrowLeft, Gift, Sparkles, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useChests, type ChestReward } from "@/hooks/useChests";

const RARITY_COLORS: Record<string, string> = {
  common: "border-slate-400 shadow-[0_0_20px_hsl(210_20%_60%/0.5)]",
  rare: "border-blue-400 shadow-[0_0_25px_hsl(210_90%_60%/0.6)]",
  epic: "border-purple-400 shadow-[0_0_30px_hsl(280_90%_60%/0.7)]",
  legendary: "border-yellow-400 shadow-[0_0_40px_hsl(45_90%_60%/0.8)]",
};

const PLACEHOLDER_ITEMS = [
  { id: "potion", name: "Poción de XP", icon: "🧪", price: 150, desc: "Próximamente" },
  { id: "freeze", name: "Congelador 🧊", icon: "🧊", price: 100, desc: "Protege tu racha" },
  { id: "title-pack", name: "Pack de Títulos", icon: "🏅", price: 500, desc: "Próximamente" },
  { id: "wallpaper", name: "Fondo Épico", icon: "🖼️", price: 300, desc: "Próximamente" },
  { id: "outfit", name: "Atuendo Raro", icon: "👕", price: 750, desc: "Próximamente" },
  { id: "boost", name: "Boost x2 XP", icon: "⚡", price: 400, desc: "Próximamente" },
];

interface ShopProps { embedded?: boolean }

const Shop = ({ embedded = false }: ShopProps = {}) => {
  const navigate = useNavigate();
  const { coins, chests, openChest } = useChests();
  const [opening, setOpening] = useState(false);
  const [reward, setReward] = useState<ChestReward | null>(null);

  const handleOpenChest = async () => {
    if (chests <= 0 || opening) return;
    setOpening(true);
    setReward(null);
    // small suspense delay
    setTimeout(async () => {
      try {
        const r = await openChest.mutateAsync();
        setReward(r);
      } catch {
        // toast handled in hook
      } finally {
        setOpening(false);
      }
    }, 900);
  };

  return (
    <div className={embedded ? "h-full" : "min-h-screen bg-background pb-24 md:pb-6"}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          {!embedded && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h1 className="font-pixel text-[12px] tracking-wider text-primary">TIENDA</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-1.5">
          <span className="text-base">🪙</span>
          <span className="font-pixel text-[10px] text-yellow-300">{coins}</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        {/* Chest section */}
        <section className="mb-8">
          <h2 className="mb-3 font-pixel text-[10px] tracking-wider text-blue-300">
            COFRES DE RECOMPENSA
          </h2>
          <Card className="overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-background to-primary/5 p-6">
            <div className="flex flex-col items-center gap-4">
              {/* Chest visual */}
              <button
                onClick={handleOpenChest}
                disabled={chests <= 0 || opening}
                className={cn(
                  "relative flex h-32 w-32 items-center justify-center rounded-2xl border-4 transition-all",
                  chests > 0 && !opening
                    ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_40px_hsl(45_90%_60%/0.6)] hover:scale-105 cursor-pointer animate-pulse"
                    : "border-muted bg-muted/20 opacity-50 cursor-not-allowed"
                )}
              >
                <Gift className={cn("h-16 w-16", chests > 0 ? "text-yellow-300" : "text-muted-foreground")} />
                {chests > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-background bg-destructive px-1.5 font-pixel text-[9px] text-destructive-foreground">
                    {chests}
                  </span>
                )}
                {opening && (
                  <Sparkles className="absolute h-32 w-32 animate-spin text-yellow-300" />
                )}
              </button>

              <div className="text-center">
                {chests > 0 ? (
                  <>
                    <p className="font-pixel text-[10px] text-yellow-300">
                      {opening ? "ABRIENDO..." : `${chests} COFRE${chests === 1 ? "" : "S"} DISPONIBLE${chests === 1 ? "" : "S"}`}
                    </p>
                    <p className="mt-1 font-pixel text-[7px] text-muted-foreground">
                      Toca el cofre para abrirlo
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-pixel text-[9px] text-muted-foreground">
                      SIN COFRES
                    </p>
                    <p className="mt-1 font-pixel text-[7px] text-muted-foreground">
                      Completa todas tus misiones diarias para ganar uno
                    </p>
                  </>
                )}
              </div>

              {/* Reward reveal */}
              {reward && (
                <div
                  className={cn(
                    "mt-2 flex w-full max-w-xs flex-col items-center gap-2 rounded-xl border-2 bg-card p-4 animate-in zoom-in-50 duration-500",
                    RARITY_COLORS[reward.rarity]
                  )}
                >
                  <div className="text-5xl">{reward.icon}</div>
                  <p className="font-pixel text-[10px] text-foreground">{reward.label}</p>
                  <p className="font-pixel text-[7px] uppercase tracking-wider text-muted-foreground">
                    {reward.rarity}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Shop items */}
        <section>
          <h2 className="mb-3 font-pixel text-[10px] tracking-wider text-blue-300">
            ARTÍCULOS
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {PLACEHOLDER_ITEMS.map((item) => (
              <Card key={item.id} className="flex flex-col items-center gap-2 border border-border bg-card/50 p-4 opacity-70">
                <div className="text-3xl">{item.icon}</div>
                <p className="text-center font-pixel text-[8px] text-foreground">{item.name}</p>
                <p className="text-center font-pixel text-[6px] text-muted-foreground">{item.desc}</p>
                <div className="mt-1 flex items-center gap-1 rounded-md border border-yellow-400/30 bg-yellow-400/5 px-2 py-0.5">
                  <span className="text-xs">🪙</span>
                  <span className="font-pixel text-[8px] text-yellow-300">{item.price}</span>
                </div>
                <Button size="sm" variant="outline" disabled className="h-7 w-full font-pixel text-[7px]">
                  PRÓXIMAMENTE
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Shop;