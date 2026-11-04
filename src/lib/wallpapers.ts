/**
 * Modern abstract wallpapers built entirely with CSS so they automatically
 * adapt to the user's selected theme color (uses hsl(var(--primary)) /
 * hsl(var(--accent))). No image assets, fully responsive, GPU-cheap.
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
    background: `radial-gradient(at 18% 20%, hsl(${P} / 0.30) 0px, transparent 55%), radial-gradient(at 82% 75%, hsl(${A} / 0.28) 0px, transparent 50%), radial-gradient(at 50% 100%, hsl(${P} / 0.18) 0px, transparent 60%), hsl(${BG})`,
  },
  {
    id: "mesh",
    name: "Mesh",
    background: `radial-gradient(at 0% 0%, hsl(${P} / 0.25) 0px, transparent 45%), radial-gradient(at 100% 0%, hsl(${A} / 0.22) 0px, transparent 45%), radial-gradient(at 0% 100%, hsl(${A} / 0.20) 0px, transparent 45%), radial-gradient(at 100% 100%, hsl(${P} / 0.25) 0px, transparent 45%), hsl(${BG})`,
  },
  {
    id: "waves",
    name: "Olas",
    background: `linear-gradient(135deg, hsl(${P} / 0.22) 0%, transparent 35%, transparent 65%, hsl(${A} / 0.22) 100%), linear-gradient(45deg, transparent 60%, hsl(${P} / 0.10) 100%), hsl(${BG})`,
  },
  {
    id: "grid",
    name: "Grid",
    background: `linear-gradient(hsl(${P} / 0.06) 1px, transparent 1px) 0 0 / 36px 36px, linear-gradient(90deg, hsl(${P} / 0.06) 1px, transparent 1px) 0 0 / 36px 36px, radial-gradient(at 50% 40%, hsl(${P} / 0.20) 0px, transparent 60%), hsl(${BG})`,
  },
  {
    id: "orbit",
    name: "Órbita",
    background: `radial-gradient(circle at 50% 50%, transparent 0px, transparent 220px, hsl(${P} / 0.10) 221px, transparent 222px, transparent 320px, hsl(${A} / 0.08) 321px, transparent 322px, transparent 420px, hsl(${P} / 0.06) 421px, transparent 422px), radial-gradient(at 50% 50%, hsl(${P} / 0.18) 0px, transparent 55%), hsl(${BG})`,
  },
  {
    id: "prism",
    name: "Prisma",
    background: `linear-gradient(115deg, hsl(${P} / 0.18) 0%, hsl(${P} / 0.18) 18%, transparent 18%, transparent 32%, hsl(${A} / 0.15) 32%, hsl(${A} / 0.15) 44%, transparent 44%, transparent 62%, hsl(${P} / 0.12) 62%, hsl(${P} / 0.12) 70%, transparent 70%), hsl(${BG})`,
  },
  {
    id: "halo",
    name: "Halo",
    background: `radial-gradient(ellipse at top, hsl(${P} / 0.30) 0px, transparent 50%), radial-gradient(ellipse at bottom, hsl(${A} / 0.22) 0px, transparent 55%), hsl(${BG})`,
  },
  {
    id: "diagonal",
    name: "Diagonal",
    background: `linear-gradient(160deg, hsl(${P} / 0.22) 0%, transparent 40%), linear-gradient(20deg, hsl(${A} / 0.18) 0%, transparent 40%), hsl(${BG})`,
  },
];
