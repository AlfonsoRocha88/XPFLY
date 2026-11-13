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
  /** Premium animated scene drawn by <LivingBackground>; bought in the shop. */
  living?: boolean;
  /** Small static preview for the picker. */
  preview?: string;
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
  {
    id: "living-jardin",
    name: "Jardín",
    background: "transparent",
    living: true,
    preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 90'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23f1fbef'/%3E%3Cstop offset='1' stop-color='%23d5efd1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='90' fill='url%28%23g%29'/%3E%3Cg fill='none' stroke='%235f9e62' stroke-width='1.6' stroke-linecap='round'%3E%3Cpath d='M14 0 C12 14 20 24 16 40'/%3E%3Cpath d='M48 0 C52 10 44 20 50 30'/%3E%3Cpath d='M92 0 C88 16 98 28 92 50'/%3E%3C/g%3E%3Cg fill='%237cbf73'%3E%3Cellipse cx='18' cy='12' rx='5' ry='2.4' transform='rotate%2830 18 12%29'/%3E%3Cellipse cx='12' cy='26' rx='5' ry='2.4' transform='rotate%28-30 12 26%29'/%3E%3Cellipse cx='48' cy='14' rx='4.5' ry='2.2' transform='rotate%28-25 48 14%29'/%3E%3Cellipse cx='96' cy='18' rx='5' ry='2.4' transform='rotate%2830 96 18%29'/%3E%3Cellipse cx='89' cy='34' rx='5' ry='2.4' transform='rotate%28-30 89 34%29'/%3E%3C/g%3E%3Cg fill='%23f48fb8'%3E%3Ccircle cx='16' cy='40' r='3.4'/%3E%3Ccircle cx='50' cy='30' r='2.8'/%3E%3Ccircle cx='92' cy='50' r='3.6'/%3E%3C/g%3E%3Cg fill='%23f9c6d8' opacity='.9'%3E%3Cellipse cx='34' cy='58' rx='2.6' ry='1.4' transform='rotate%2830 34 58%29'/%3E%3Cellipse cx='70' cy='70' rx='2.6' ry='1.4' transform='rotate%28-20 70 70%29'/%3E%3Cellipse cx='104' cy='76' rx='2.4' ry='1.3'/%3E%3Cellipse cx='24' cy='80' rx='2.2' ry='1.2' transform='rotate%2850 24 80%29'/%3E%3C/g%3E%3Crect x='18' y='62' width='84' height='18' rx='5' fill='%23fff' opacity='.7'/%3E%3C/svg%3E") center / cover no-repeat`,
  },
  {
    id: "living-nebulosa",
    name: "Nebulosa",
    background: "transparent",
    living: true,
    preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 90'%3E%3Cdefs%3E%3CradialGradient id='a'%3E%3Cstop offset='0' stop-color='%23b18cff' stop-opacity='.9'/%3E%3Cstop offset='1' stop-color='%23b18cff' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b'%3E%3Cstop offset='0' stop-color='%235fc3ff' stop-opacity='.8'/%3E%3Cstop offset='1' stop-color='%235fc3ff' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c'%3E%3Cstop offset='0' stop-color='%23ff86c8' stop-opacity='.6'/%3E%3Cstop offset='1' stop-color='%23ff86c8' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='120' height='90' fill='%23120f33'/%3E%3Cellipse cx='34' cy='28' rx='44' ry='30' fill='url%28%23a%29'/%3E%3Cellipse cx='88' cy='56' rx='42' ry='30' fill='url%28%23b%29'/%3E%3Cellipse cx='56' cy='80' rx='34' ry='18' fill='url%28%23c%29'/%3E%3Cg fill='%23fff'%3E%3Ccircle cx='12' cy='10' r='.9'/%3E%3Ccircle cx='70' cy='14' r='1.2'/%3E%3Ccircle cx='104' cy='22' r='.8'/%3E%3Ccircle cx='26' cy='64' r='1'/%3E%3Ccircle cx='96' cy='80' r='1.1'/%3E%3Ccircle cx='60' cy='44' r='1.6'/%3E%3Ccircle cx='84' cy='36' r='.7'/%3E%3C/g%3E%3Cpath d='M60 39 L61 43.5 L65.5 44.5 L61 45.5 L60 50 L59 45.5 L54.5 44.5 L59 43.5 Z' fill='%23fff' opacity='.9'/%3E%3C/svg%3E") center / cover no-repeat`,
  },
  {
    id: "living-oceano",
    name: "Océano",
    background: "transparent",
    living: true,
    preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 90'%3E%3Cdefs%3E%3ClinearGradient id='w' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23cdeffd'/%3E%3Cstop offset='1' stop-color='%233e9fcb'/%3E%3C/linearGradient%3E%3ClinearGradient id='r' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23fff' stop-opacity='.55'/%3E%3Cstop offset='1' stop-color='%23fff' stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='90' fill='url%28%23w%29'/%3E%3Cg fill='url%28%23r%29'%3E%3Cpath d='M14 0 L24 0 L46 90 L32 90 Z'/%3E%3Cpath d='M54 0 L60 0 L78 90 L68 90 Z'/%3E%3Cpath d='M88 0 L98 0 L118 90 L104 90 Z'/%3E%3C/g%3E%3Cg fill='%23fff' fill-opacity='.2' stroke='%23fff' stroke-opacity='.85' stroke-width='.8'%3E%3Ccircle cx='30' cy='70' r='3.5'/%3E%3Ccircle cx='36' cy='56' r='2'/%3E%3Ccircle cx='33' cy='44' r='1.4'/%3E%3Ccircle cx='84' cy='76' r='4.5'/%3E%3Ccircle cx='80' cy='60' r='2.4'/%3E%3Ccircle cx='86' cy='48' r='1.6'/%3E%3Ccircle cx='60' cy='30' r='1.2'/%3E%3C/g%3E%3C/svg%3E") center / cover no-repeat`,
  },
];
