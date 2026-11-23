import type { ConstellationId } from "@shared/achievements";
import { FRAMES, frameById, type FrameDef } from "@/components/frames/registry";

/**
 * Compatibility layer: frames now live in src/components/frames (registry.ts).
 * Achievement frames are keyed by constellation id; shop frames by their frame-* id.
 */
type Entry = Pick<FrameDef, "name" | "Frame">;

const pick = (pred: (d: FrameDef) => boolean) =>
  Object.fromEntries(FRAMES.filter(pred).map((d) => [d.id, { name: d.name, Frame: d.Frame }]));

export const AVATAR_FRAMES = pick((d) => d.rarity === "achievement") as Record<ConstellationId, Entry>;

/**
 * The original shop frames (kept as-is so FramePicker/Shop behave exactly as before).
 * The full catalog with rarities is FRAMES in "@/components/frames/registry".
 */
const LEGACY_SHOP = new Set(["frame-halo", "frame-cristal", "frame-orbita"]);
export const SHOP_FRAMES: Record<string, Entry> = pick((d) => LEGACY_SHOP.has(d.id));

export { frameById };
