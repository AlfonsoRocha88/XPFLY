import type { Rarity } from "@shared/shop";
import { cn } from "@/lib/utils";

export type { Rarity };

export const RARITY_ORDER: Rarity[] = ["legendary", "epic", "rare", "common"];

export const RARITY_META: Record<Rarity, { label: string; text: string; ring: string; bg: string }> = {
  common: { label: "Común", text: "text-slate-500 dark:text-slate-300", ring: "ring-slate-400/30", bg: "bg-slate-400/12" },
  rare: { label: "Rara", text: "text-sky-500 dark:text-sky-300", ring: "ring-sky-400/45", bg: "bg-sky-400/12" },
  epic: { label: "Épica", text: "text-violet-500 dark:text-violet-300", ring: "ring-violet-400/55", bg: "bg-violet-400/14" },
  legendary: { label: "Legendaria", text: "text-amber-500 dark:text-amber-300", ring: "ring-amber-400/65", bg: "bg-amber-400/14" },
};

/** Small pill with the rarity name. */
export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  const m = RARITY_META[rarity];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", m.bg, m.text, className)}>
      {m.label}
    </span>
  );
}

/** Card frame per rarity: epic shimmers, legendary gets a slow gold sweep (CSS in index.css). */
export const rarityCardClass = (r: Rarity | undefined) =>
  r === "legendary" ? "rarity-legendary ring-1 " + RARITY_META.legendary.ring
  : r === "epic" ? "rarity-epic ring-1 " + RARITY_META.epic.ring
  : r ? "ring-1 " + RARITY_META[r].ring : "";
