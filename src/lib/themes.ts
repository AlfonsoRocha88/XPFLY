export interface AppTheme {
  id: string;
  name: string;
  className: string;
  swatch: string; // tailwind-friendly hsl
}

export const APP_THEMES: AppTheme[] = [
  { id: "system-cyan", name: "System Cyan", className: "theme-system-cyan", swatch: "hsl(195 100% 60%)" },
  { id: "monarch-violet", name: "Monarch Violet", className: "theme-monarch-violet", swatch: "hsl(270 90% 65%)" },
  { id: "ember-red", name: "Ember Red", className: "theme-ember-red", swatch: "hsl(0 85% 60%)" },
  { id: "emerald-hunter", name: "Emerald Hunter", className: "theme-emerald-hunter", swatch: "hsl(152 75% 50%)" },
  { id: "gold-arena", name: "Gold Arena", className: "theme-gold-arena", swatch: "hsl(45 95% 58%)" },
  { id: "rose-blade", name: "Rose Blade", className: "theme-rose-blade", swatch: "hsl(340 90% 62%)" },
  { id: "cafe", name: "Café", className: "theme-cafe", swatch: "#6D4C41" },
  { id: "navy", name: "Navy", className: "theme-navy", swatch: "#1B2A4A" },
  { id: "lavanda", name: "Lavanda", className: "theme-lavanda", swatch: "#C39BD3" },
  { id: "menta", name: "Menta", className: "theme-menta", swatch: "#7ECBB4" },
  { id: "rosa-pastel", name: "Rosa pastel", className: "theme-rosa-pastel", swatch: "#F48FB1" },
  { id: "melocoton", name: "Melocotón", className: "theme-melocoton", swatch: "#FFAB91" },
  { id: "pizarra", name: "Pizarra", className: "theme-pizarra", swatch: "#455A64" },
  { id: "oro-oscuro", name: "Oro oscuro", className: "theme-oro-oscuro", swatch: "#B8860B" },
];

export const THEME_CLASS_NAMES = APP_THEMES.map((t) => t.className);

export function getThemeClass(id: string | null | undefined): string {
  return APP_THEMES.find((t) => t.id === id)?.className ?? APP_THEMES[0].className;
}