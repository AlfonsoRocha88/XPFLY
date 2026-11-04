export interface AppTheme {
  id: string;
  name: string;
  className: string;
  swatch: string; // mirrors --primary for this theme in index.css
}

export const APP_THEMES: AppTheme[] = [
  { id: "system-cyan", name: "Cian", className: "theme-system-cyan", swatch: "hsl(196 85% 42%)" },
  { id: "monarch-violet", name: "Violeta", className: "theme-monarch-violet", swatch: "hsl(262 70% 58%)" },
  { id: "ember-red", name: "Rojo", className: "theme-ember-red", swatch: "hsl(4 76% 54%)" },
  { id: "emerald-hunter", name: "Esmeralda", className: "theme-emerald-hunter", swatch: "hsl(156 64% 36%)" },
  { id: "gold-arena", name: "Dorado", className: "theme-gold-arena", swatch: "hsl(38 92% 44%)" },
  { id: "rose-blade", name: "Frambuesa", className: "theme-rose-blade", swatch: "hsl(338 76% 54%)" },
  { id: "cafe", name: "Café", className: "theme-cafe", swatch: "hsl(22 45% 42%)" },
  { id: "navy", name: "Navy", className: "theme-navy", swatch: "hsl(222 62% 40%)" },
  { id: "lavanda", name: "Lavanda", className: "theme-lavanda", swatch: "hsl(282 42% 56%)" },
  { id: "menta", name: "Menta", className: "theme-menta", swatch: "hsl(162 45% 38%)" },
  { id: "rosa-pastel", name: "Rosa pastel", className: "theme-rosa-pastel", swatch: "hsl(340 68% 58%)" },
  { id: "melocoton", name: "Melocotón", className: "theme-melocoton", swatch: "hsl(14 80% 56%)" },
  { id: "pizarra", name: "Pizarra", className: "theme-pizarra", swatch: "hsl(200 22% 38%)" },
  { id: "oro-oscuro", name: "Oro oscuro", className: "theme-oro-oscuro", swatch: "hsl(40 85% 36%)" },
];

export const THEME_CLASS_NAMES = APP_THEMES.map((t) => t.className);

export function getThemeClass(id: string | null | undefined): string {
  return APP_THEMES.find((t) => t.id === id)?.className ?? APP_THEMES[0].className;
}