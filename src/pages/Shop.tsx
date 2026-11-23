import { useState } from "react";
import { m } from "motion/react";
import { Check, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useChests, type ChestReward } from "@/hooks/useChests";
import { useShop } from "@/hooks/useShop";
import { SHOP_ITEMS, type ShopItem } from "@shared/shop";
import { RARITY_META, RARITY_ORDER, RarityBadge, rarityCardClass, type Rarity } from "@/lib/rarity";
import { LivingPreview } from "@/components/living/LivingPreview";
import { Destello, DestellosAmount } from "@/components/currency/Destello";
import { Orb } from "@/components/orb/Orb";
import OrbOpenOverlay from "@/components/orb/OrbOpenOverlay";
import CharacterPortrait from "@/components/CharacterPortrait";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InfoTip } from "@/components/ui/info-tip";

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
  const [filter, setFilter] = useState<Rarity | "all">("all");
  // Legendary first, then epic, rare, common; filtered by the chip row.
  const listFor = (kind: ShopItem["kind"]) =>
    SHOP_ITEMS
      .filter((i) => i.kind === kind && (kind === "consumable" || filter === "all" || i.rarity === filter))
      .sort((a, b) => RARITY_ORDER.indexOf(a.rarity ?? "common") - RARITY_ORDER.indexOf(b.rarity ?? "common"));
  const [orb, setOrb] = useState<{ open: boolean; reward: ChestReward | null }>({ open: false, reward: null });

  const owned = new Set(profile?.owned_items ?? []);
  const freezes = profile?.streak_freezes ?? 0;
  const freezeMax = profile?.streak_freeze_max ?? 3;
  const isOwned = (i: ShopItem) => (i.kind === "consumable" ? freezes >= freezeMax : !!profile?.unlock_all || owned.has(i.id));

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

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Rareza">
        {(["all", ...RARITY_ORDER] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={filter === r}
            onClick={() => setFilter(r)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filter === r ? "border-transparent bg-foreground text-background" : "border-border bg-card/60",
              filter !== r && r !== "all" && RARITY_META[r].text,
            )}
          >
            {r === "all" ? "Todas" : RARITY_META[r].label}
          </button>
        ))}
      </div>

      {SECTIONS.map((sec) => (
        <section key={sec.kind}>
          <div className="mb-3">
            <h2 className="section-title flex items-center gap-2">
              {sec.title}
              {sec.hint && <InfoTip title={sec.title} align="start"><p>{sec.hint}</p></InfoTip>}
            </h2>
          </div>
          <div className={cn("grid gap-3", sec.kind === "consumable" ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3")}>
            {listFor(sec.kind).map((item, idx) => {
              const have = isOwned(item);
              return (
                <m.button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: idx * 0.05 }}
                  className={cn("surface flex text-left", sec.kind === "consumable" ? "items-center gap-3 p-3" : "flex-col", rarityCardClass(item.rarity))}
                >
                  {item.kind === "background" && (
                    <LivingPreview id={item.id} className="block aspect-[4/3] w-full overflow-hidden rounded-t-2xl" />
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
                      {item.rarity && <RarityBadge rarity={item.rarity} className="mt-1" />}
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
            return (
              <>
                <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted" aria-hidden />
                {selected.kind === "background" && <LivingPreview id={selected.id} live className="mb-4 block aspect-[16/9] w-full overflow-hidden rounded-2xl" />}
                {selected.kind === "frame" && (
                  <div className="mb-4 flex justify-center"><CharacterPortrait url={profile?.avatar_url} seed={profile?.user_id} size={128} frame={selected.id} /></div>
                )}
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-2 font-serif text-2xl font-medium">{selected.name}{selected.rarity && <RarityBadge rarity={selected.rarity} />}</SheetTitle>
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
