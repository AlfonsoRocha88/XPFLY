import { useState } from "react";
import { m } from "motion/react";
import { Check, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useChests, type ChestReward } from "@/hooks/useChests";
import { useShop } from "@/hooks/useShop";
import { SHOP_ITEMS, type ShopItem } from "@shared/shop";
import { WALLPAPERS } from "@/lib/wallpapers";
import { Destello, DestellosAmount } from "@/components/currency/Destello";
import { Orb } from "@/components/orb/Orb";
import OrbOpenOverlay from "@/components/orb/OrbOpenOverlay";
import CharacterPortrait from "@/components/CharacterPortrait";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const SECTIONS: { kind: ShopItem["kind"]; title: string; hint: string }[] = [
  { kind: "background", title: "Fondos vivos", hint: "Escenas animadas que reaccionan a lo que haces." },
  { kind: "frame", title: "Marcos", hint: "Para tu foto de perfil." },
  { kind: "consumable", title: "Mejoras", hint: "" },
];

/** Shop: spend Destellos on living backgrounds, frames and streak protectors; open your orbs. */
const Shop = () => {
  const { profile, updateProfile } = useProfile();
  const { coins, chests, openChest } = useChests();
  const { buy } = useShop();
  const [selected, setSelected] = useState<ShopItem | null>(null);
  const [orb, setOrb] = useState<{ open: boolean; reward: ChestReward | null }>({ open: false, reward: null });

  const owned = new Set(profile?.owned_items ?? []);
  const freezes = profile?.streak_freezes ?? 0;
  const freezeMax = profile?.streak_freeze_max ?? 3;
  const isOwned = (i: ShopItem) => (i.kind === "consumable" ? freezes >= freezeMax : owned.has(i.id));

  const openOrb = async () => {
    if (chests <= 0) return;
    setOrb({ open: true, reward: null });
    try {
      setOrb({ open: true, reward: await openChest.mutateAsync() });
    } catch {
      setOrb({ open: false, reward: null });
    }
  };

  const purchase = async (item: ShopItem) => {
    try {
      await buy.mutateAsync(item.id);
      setSelected(null);
      if (item.kind === "background") {
        toast.success(`${item.name} es tuyo`, { action: { label: "Usar ahora", onClick: () => updateProfile.mutate({ wallpaper: item.id }) } });
      } else if (item.kind === "frame") {
        toast.success(`Marco ${item.name} desbloqueado`, { description: "Equípalo en Perfil → Estilo → Marcos." });
      } else {
        toast.success("Protector de racha añadido");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance + orbs */}
      <section className="surface relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(185,164,255,0.35),transparent_70%)]" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tus destellos</p>
        <div className="mt-1 flex items-center gap-2">
          <Destello size={30} twinkle />
          <span className="font-serif text-4xl font-medium tabular-nums">{coins.toLocaleString("es-MX")}</span>
        </div>
        <button
          type="button"
          onClick={openOrb}
          disabled={chests <= 0 || openChest.isPending}
          className={cn("mt-4 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors", chests > 0 ? "bg-primary/10 hover:bg-primary/15" : "bg-foreground/[0.04]")}
        >
          <Orb size={44} still={chests <= 0} className={chests <= 0 ? "opacity-50 grayscale" : ""} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{chests > 0 ? `${chests} ${chests === 1 ? "orbe" : "orbes"} por abrir` : "Sin orbes por ahora"}</span>
            <span className="block text-xs text-muted-foreground">{chests > 0 ? "Toca para abrir" : "Ganas uno al completar tus diarias"}</span>
          </span>
        </button>
      </section>

      {SECTIONS.map((sec) => (
        <section key={sec.kind}>
          <div className="mb-3">
            <h2 className="section-title">{sec.title}</h2>
            {sec.hint && <p className="text-xs text-muted-foreground">{sec.hint}</p>}
          </div>
          <div className={cn("grid gap-3", sec.kind === "consumable" ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3")}>
            {SHOP_ITEMS.filter((i) => i.kind === sec.kind).map((item, idx) => {
              const have = isOwned(item);
              const wp = WALLPAPERS.find((w) => w.id === item.id);
              return (
                <m.button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: idx * 0.05 }}
                  className={cn("surface flex text-left", sec.kind === "consumable" ? "items-center gap-3 p-3" : "flex-col")}
                >
                  {item.kind === "background" && (
                    <span className="block aspect-[4/3] w-full rounded-t-2xl" style={{ background: wp?.preview }} aria-hidden />
                  )}
                  {item.kind === "frame" && (
                    <span className="flex aspect-[4/3] w-full items-center justify-center rounded-t-2xl bg-foreground/[0.03]">
                      <CharacterPortrait url={profile?.avatar_url} seed={profile?.user_id} size={60} frame={item.id} />
                    </span>
                  )}
                  {item.kind === "consumable" && (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-500"><Shield className="h-5 w-5" /></span>
                  )}
                  <span className={cn("flex min-w-0 flex-1 items-center justify-between gap-2", sec.kind === "consumable" ? "" : "p-3")}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.name}</span>
                      {item.kind === "consumable" && <span className="block text-xs text-muted-foreground">{freezes} de {freezeMax}</span>}
                    </span>
                    {have && item.kind !== "consumable" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-success"><Check className="h-3.5 w-3.5" /> Tuyo</span>
                    ) : (
                      <DestellosAmount value={item.price} size={14} className="text-xs" />
                    )}
                  </span>
                </m.button>
              );
            })}
          </div>
        </section>
      ))}

      {/* Confirm / preview sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-[1.75rem] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
          {selected && (() => {
            const have = isOwned(selected);
            const missing = selected.price - coins;
            const wp = WALLPAPERS.find((w) => w.id === selected.id);
            return (
              <>
                <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted" aria-hidden />
                {selected.kind === "background" && <div className="mb-4 aspect-[16/9] w-full rounded-2xl" style={{ background: wp?.preview }} />}
                {selected.kind === "frame" && (
                  <div className="mb-4 flex justify-center"><CharacterPortrait url={profile?.avatar_url} seed={profile?.user_id} size={96} frame={selected.id} /></div>
                )}
                <SheetHeader className="text-left">
                  <SheetTitle className="font-serif text-2xl font-medium">{selected.name}</SheetTitle>
                  <SheetDescription>{selected.description}</SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  {have ? (
                    selected.kind === "background" ? (
                      <button type="button" onClick={() => { updateProfile.mutate({ wallpaper: selected.id }); setSelected(null); }} className="h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
                        Usar este fondo
                      </button>
                    ) : (
                      <p className="text-center text-sm font-semibold text-muted-foreground">{selected.kind === "consumable" ? "Ya tienes el máximo." : "Ya es tuyo."}</p>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={missing > 0 || buy.isPending}
                      onClick={() => purchase(selected)}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {missing > 0 ? <>Te faltan <DestellosAmount value={missing} size={14} /></> : buy.isPending ? "Comprando…" : <>Comprar por <DestellosAmount value={selected.price} size={14} /></>}
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <OrbOpenOverlay open={orb.open} reward={orb.reward} opening={!orb.reward} onClose={() => setOrb({ open: false, reward: null })} />
    </div>
  );
};

export default Shop;
