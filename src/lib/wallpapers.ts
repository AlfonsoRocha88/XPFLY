/**
 * Modern abstract wallpapers built entirely with CSS so they automatically
 * adapt to the user's selected theme color (uses hsl(var(--primary)) /
 * hsl(var(--accent))). Kept soft so content stays readable on light surfaces.
 */
export interface WallpaperOption {
  id: string;
  name: string;
  /** CSS `background` shorthand (or "" to use the app default). */
  background: string;
}

const P = "var(--primary)";
const A = "var(--accent)";
const BG = "var(--background)";

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: "default",
    name: "Limpio",
    background: "",
  },
  {
    id: "aurora",
    name: "Aurora",
    background: `radial-gradient(at 18% 20%, hsl(${P} / 0.165) 0px, transparent 55%), radial-gradient(at 82% 75%, hsl(${A} / 0.154) 0px, transparent 50%), radial-gradient(at 50% 100%, hsl(${P} / 0.099) 0px, transparent 60%), hsl(${BG})`,
  },
  {
    id: "mesh",
    name: "Mesh",
    background: `radial-gradient(at 0% 0%, hsl(${P} / 0.138) 0px, transparent 45%), radial-gradient(at 100% 0%, hsl(${A} / 0.121) 0px, transparent 45%), radial-gradient(at 0% 100%, hsl(${A} / 0.11) 0px, transparent 45%), radial-gradient(at 100% 100%, hsl(${P} / 0.138) 0px, transparent 45%), hsl(${BG})`,
  },
  {
    id: "waves",
    name: "Olas",
    background: `linear-gradient(135deg, hsl(${P} / 0.121) 0%, transparent 35%, transparent 65%, hsl(${A} / 0.121) 100%), linear-gradient(45deg, transparent 60%, hsl(${P} / 0.055) 100%), hsl(${BG})`,
  },
  {
    id: "grid",
    name: "Grid",
    background: `linear-gradient(hsl(${P} / 0.033) 1px, transparent 1px) 0 0 / 36px 36px, linear-gradient(90deg, hsl(${P} / 0.033) 1px, transparent 1px) 0 0 / 36px 36px, radial-gradient(at 50% 40%, hsl(${P} / 0.11) 0px, transparent 60%), hsl(${BG})`,
  },
  {
    id: "orbit",
    name: "Órbita",
    background: `radial-gradient(circle at 50% 50%, transparent 0px, transparent 220px, hsl(${P} / 0.055) 221px, transparent 222px, transparent 320px, hsl(${A} / 0.044) 321px, transparent 322px, transparent 420px, hsl(${P} / 0.033) 421px, transparent 422px), radial-gradient(at 50% 50%, hsl(${P} / 0.099) 0px, transparent 55%), hsl(${BG})`,
  },
  {
    id: "prism",
    name: "Prisma",
    background: `linear-gradient(115deg, hsl(${P} / 0.099) 0%, hsl(${P} / 0.099) 18%, transparent 18%, transparent 32%, hsl(${A} / 0.083) 32%, hsl(${A} / 0.083) 44%, transparent 44%, transparent 62%, hsl(${P} / 0.066) 62%, hsl(${P} / 0.066) 70%, transparent 70%), hsl(${BG})`,
  },
  {
    id: "halo",
    name: "Halo",
    background: `radial-gradient(ellipse at top, hsl(${P} / 0.165) 0px, transparent 50%), radial-gradient(ellipse at bottom, hsl(${A} / 0.121) 0px, transparent 55%), hsl(${BG})`,
  },
  {
    id: "diagonal",
    name: "Diagonal",
    background: `linear-gradient(160deg, hsl(${P} / 0.121) 0%, transparent 40%), linear-gradient(20deg, hsl(${A} / 0.099) 0%, transparent 40%), hsl(${BG})`,
  },
];
