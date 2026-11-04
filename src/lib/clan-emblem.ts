import type { CSSProperties } from "react";

export type EmblemShape = "heater" | "round" | "angular" | "kite" | "tower" | "crest";
export type EmblemIcon =
  | "wolf" | "eagle" | "lion" | "dragon" | "snake"
  | "fire" | "lightning" | "ice" | "water" | "earth"
  | "sword" | "crown" | "star" | "skull" | "fist" | "shield" | "gem"
  | "spiral" | "eye" | "infinity" | "cross";

export interface EmblemConfig {
  shape: EmblemShape;
  primary: string;
  secondary: string;
  icon: EmblemIcon;
}

export const DEFAULT_EMBLEM: EmblemConfig = {
  shape: "heater",
  primary: "#3b82f6",
  secondary: "#0f172a",
  icon: "sword",
};

export const EMBLEM_SHAPES: { id: EmblemShape; label: string }[] = [
  { id: "heater", label: "Heater" },
  { id: "round", label: "Redondo" },
  { id: "angular", label: "Angular" },
  { id: "kite", label: "Cometa" },
  { id: "tower", label: "Torre" },
  { id: "crest", label: "Cresta" },
];

export const EMBLEM_PALETTE: string[] = [
  "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
  "#eab308", "#f97316", "#ef4444", "#ec4899",
  "#a855f7", "#6366f1", "#94a3b8", "#0f172a",
];

export const EMBLEM_ICONS_BY_CATEGORY: Record<string, { id: EmblemIcon; label: string }[]> = {
  Animales: [
    { id: "wolf", label: "Lobo" },
    { id: "eagle", label: "Águila" },
    { id: "lion", label: "León" },
    { id: "dragon", label: "Dragón" },
    { id: "snake", label: "Serpiente" },
  ],
  Elementos: [
    { id: "fire", label: "Fuego" },
    { id: "lightning", label: "Rayo" },
    { id: "ice", label: "Hielo" },
    { id: "water", label: "Agua" },
    { id: "earth", label: "Tierra" },
  ],
  Objetos: [
    { id: "sword", label: "Espada" },
    { id: "crown", label: "Corona" },
    { id: "star", label: "Estrella" },
    { id: "skull", label: "Calavera" },
    { id: "fist", label: "Puño" },
    { id: "shield", label: "Escudo" },
    { id: "gem", label: "Gema" },
  ],
  Abstractos: [
    { id: "spiral", label: "Espiral" },
    { id: "eye", label: "Ojo" },
    { id: "infinity", label: "Infinito" },
    { id: "cross", label: "Cruz" },
  ],
};

export const ALL_EMBLEM_ICONS: EmblemIcon[] = Object.values(EMBLEM_ICONS_BY_CATEGORY)
  .flat()
  .map((i) => i.id);

/** Coerces a stored jsonb into a valid EmblemConfig with sane fallbacks. */
export function normalizeEmblem(raw: any): EmblemConfig {
  const shape: EmblemShape = (EMBLEM_SHAPES.find((s) => s.id === raw?.shape)?.id) ?? DEFAULT_EMBLEM.shape;
  const icon: EmblemIcon = (ALL_EMBLEM_ICONS.includes(raw?.icon) ? raw.icon : DEFAULT_EMBLEM.icon) as EmblemIcon;
  return {
    shape,
    primary: typeof raw?.primary === "string" ? raw.primary : DEFAULT_EMBLEM.primary,
    secondary: typeof raw?.secondary === "string" ? raw.secondary : DEFAULT_EMBLEM.secondary,
    icon,
  };
}

export function emblemGlowStyle(config: EmblemConfig): CSSProperties {
  return { boxShadow: `0 0 18px ${config.primary}55, inset 0 0 18px ${config.primary}33` };
}