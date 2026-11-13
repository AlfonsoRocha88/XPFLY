// Shop catalog, shared by the app (display) and the `shop-buy` function (prices are enforced there).
// Destellos are stored in profiles.coins.

export type ShopKind = "background" | "frame" | "consumable";

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  description: string;
  price: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "living-jardin", kind: "background", name: "Jardín", price: 700, description: "Lianas y flores crecen desde tus tareas y se mecen cuando las tocas." },
  { id: "living-nebulosa", kind: "background", name: "Nebulosa", price: 800, description: "Nubes de gas estelar a la deriva; cada toque deja una estela de luz." },
  { id: "living-oceano", kind: "background", name: "Océano", price: 800, description: "Luz bajo el agua y burbujas que suben con cada tarea que completas." },
  { id: "frame-halo", kind: "frame", name: "Halo", price: 300, description: "Un anillo de luz suave que gira lento alrededor de tu foto." },
  { id: "frame-cristal", kind: "frame", name: "Cristal", price: 400, description: "Facetas de cristal con destellos en las orillas." },
  { id: "frame-orbita", kind: "frame", name: "Órbita", price: 450, description: "Dos lunas pequeñas orbitan tu avatar." },
  { id: "freeze", kind: "consumable", name: "Protector de racha", price: 150, description: "Salva tu racha un día que no puedas completar tus diarias." },
];

export const shopItem = (id: string) => SHOP_ITEMS.find((i) => i.id === id);

/** Cosmetics an orb can drop (never consumables). */
export const ORB_COSMETICS = SHOP_ITEMS.filter((i) => i.kind !== "consumable").map((i) => i.id);
