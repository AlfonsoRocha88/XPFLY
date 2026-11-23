// Shop catalog, shared by the app (display) and the `shop-buy` / `open-chest` functions (prices and
// drops are enforced there). Destellos are stored in profiles.coins.

export type ShopKind = "background" | "frame" | "consumable";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  description: string;
  price: number;
  rarity?: Rarity;
}

/** Price follows rarity, so the catalog stays consistent as it grows. */
export const RARITY_PRICE: Record<Rarity, number> = { common: 200, rare: 450, epic: 900, legendary: 1800 };
/** Orb cosmetic drops: chance of each rarity (renormalised over what the user still lacks). */
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 28, epic: 10, legendary: 2 };

const cosmetic = (id: string, kind: "background" | "frame", name: string, rarity: Rarity, description: string): ShopItem =>
  ({ id, kind, name, rarity, price: RARITY_PRICE[rarity], description });

export const SHOP_ITEMS: ShopItem[] = [
  // Frames
  cosmetic("frame-bronce", "frame", "Bronce", "common", "Un aro de cuentas de metal pulido."),
  cosmetic("frame-hiedra", "frame", "Hiedra", "common", "Hojas de hiedra rodean tu foto."),
  cosmetic("frame-puntos", "frame", "Constelación", "common", "Pequeñas estrellas unidas en un círculo."),
  cosmetic("frame-petalo", "frame", "Pétalos", "common", "Cinco flores pequeñas alrededor."),
  cosmetic("frame-halo", "frame", "Halo", "common", "Un anillo de luz suave que gira lento."),
  cosmetic("frame-llamas", "frame", "Llamas", "rare", "Lenguas de fuego que se mueven."),
  cosmetic("frame-escarcha", "frame", "Escarcha", "rare", "Cristales de hielo con un destello."),
  cosmetic("frame-neon", "frame", "Neón", "rare", "Luz de neón de dos colores que late."),
  cosmetic("frame-sakura", "frame", "Sakura", "rare", "Una rama de cerezo que suelta pétalos."),
  cosmetic("frame-cristal", "frame", "Cristal", "rare", "Facetas de cristal con destellos."),
  cosmetic("frame-orbita", "frame", "Órbita", "rare", "Dos lunas pequeñas orbitan tu foto."),
  cosmetic("frame-gato", "frame", "Gatito", "epic", "Un gatito se asoma, parpadea y mueve la cola."),
  cosmetic("frame-enredadera", "frame", "Jardín secreto", "epic", "Enredaderas que crecen y flores que se abren."),
  cosmetic("frame-oscuridad", "frame", "Oscuridad", "epic", "Sombras que se arremolinan y ojos que te miran."),
  cosmetic("frame-tormenta", "frame", "Tormenta", "epic", "Nubes de tormenta con relámpagos."),
  cosmetic("frame-dragon", "frame", "Dragón", "legendary", "Un dragón enroscado que respira chispas."),
  cosmetic("frame-fenix", "frame", "Fénix", "legendary", "Alas de fuego que se despliegan."),
  cosmetic("frame-galaxia", "frame", "Galaxia", "legendary", "Brazos de una galaxia que giran a tu alrededor."),
  cosmetic("frame-corona", "frame", "Corona celestial", "legendary", "Corona de oro y un halo con rayos de luz."),
  // Living backgrounds
  cosmetic("living-lluvia", "background", "Lluvia suave", "common", "Lluvia tranquila al atardecer."),
  cosmetic("living-aurora", "background", "Aurora", "common", "Auroras que fluyen sobre el horizonte."),
  cosmetic("living-luciernagas", "background", "Luciérnagas", "rare", "Luciérnagas que se juntan donde tocas."),
  cosmetic("living-nieve", "background", "Nieve", "rare", "Nieve cayendo sobre un bosque de pinos."),
  cosmetic("living-jardin", "background", "Jardín", "epic", "Lianas y flores crecen desde tus tareas."),
  cosmetic("living-oceano", "background", "Océano", "epic", "Luz bajo el agua y burbujas."),
  cosmetic("living-sakura", "background", "Sakura", "epic", "Un cerezo en flor con pétalos al viento."),
  cosmetic("living-gatitos", "background", "Gatitos", "epic", "Dos gatitos en la ventana, de noche."),
  cosmetic("living-retro", "background", "Retro 8-bit", "epic", "Un atardecer de videojuego clásico."),
  cosmetic("living-ciudad", "background", "Ciudad flotante", "legendary", "Islas flotantes que siguen tu hora del día."),
  cosmetic("living-bosque", "background", "Bosque encantado", "legendary", "Un bosque con espíritus de luz que te siguen."),
  cosmetic("living-synthwave", "background", "Synthwave", "legendary", "Rejilla de neón hacia un sol retro."),
  // Consumables
  { id: "freeze", kind: "consumable", name: "Protector de racha", price: 250, description: "Salva tu racha un día que no puedas completar tus diarias." },
];

export const shopItem = (id: string) => SHOP_ITEMS.find((i) => i.id === id);

/** Cosmetics an orb can drop (never consumables). */
export const ORB_COSMETICS = SHOP_ITEMS.filter((i) => i.kind !== "consumable").map((i) => i.id);

/**
 * Pick one cosmetic the user doesn't own: first a rarity by RARITY_WEIGHT (only rarities that still
 * have something missing), then an item of that rarity. `r` is a random number in [0, 1).
 */
export function pickOrbCosmetic(missing: string[], r1: number, r2: number): ShopItem | undefined {
  const items = missing.map(shopItem).filter((i): i is ShopItem => !!i && !!i.rarity);
  if (!items.length) return undefined;
  const rarities = (Object.keys(RARITY_WEIGHT) as Rarity[]).filter((ra) => items.some((i) => i.rarity === ra));
  const total = rarities.reduce((s, ra) => s + RARITY_WEIGHT[ra], 0);
  let roll = r1 * total;
  let chosen = rarities[rarities.length - 1];
  for (const ra of rarities) { if ((roll -= RARITY_WEIGHT[ra]) < 0) { chosen = ra; break; } }
  const pool = items.filter((i) => i.rarity === chosen);
  return pool[Math.floor(r2 * pool.length)];
}
