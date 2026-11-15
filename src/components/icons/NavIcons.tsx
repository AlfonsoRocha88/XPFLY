import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bottom-bar / side-nav icons, drawn in the same language as TrophyIcon: a soft halo, a glossy
 * two-stop gradient body and a thin light edge. Each section owns one hue so the bar reads as a
 * family; the nav dims the inactive ones instead of turning them grey.
 */

type Hue = { light: string; mid: string; deep: string };

const HUES = {
  tasks: { light: "#E4D9FF", mid: "#A98BFF", deep: "#6D4CF0" },
  calendar: { light: "#D2F7FB", mid: "#5FD3E6", deep: "#1C97B8" },
  progress: { light: "#D6FBE6", mid: "#5DDBA0", deep: "#1E9E6E" },
  community: { light: "#FFDDEB", mid: "#FF8DBE", deep: "#D9467F" },
  profile: { light: "#DCE7FF", mid: "#7FA4FF", deep: "#3F63E0" },
} satisfies Record<string, Hue>;

type IconProps = { className?: string; strokeWidth?: number | string };

function NavGlyph({ hue, className, children }: { hue: Hue; className?: string; children: (fill: string, edge: string) => ReactNode }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" className={cn("inline-block shrink-0 overflow-visible", className)} aria-hidden focusable="false">
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0" stopColor={hue.mid} stopOpacity=".32" />
          <stop offset="1" stopColor={hue.mid} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hue.light} />
          <stop offset=".45" stopColor={hue.mid} />
          <stop offset="1" stopColor={hue.deep} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11.5" fill={`url(#${id}h)`} />
      {children(`url(#${id}f)`, hue.light)}
    </svg>
  );
}

const EDGE = { strokeWidth: 0.5, strokeOpacity: 0.8, strokeLinejoin: "round" as const };

/** Tareas: a card with a check. */
export const TasksNavIcon = ({ className }: IconProps) => (
  <NavGlyph hue={HUES.tasks} className={className}>
    {(fill, edge) => (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5.2" fill={fill} stroke={edge} {...EDGE} />
        <path d="M8 12.3l2.7 2.7L16.2 9.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </NavGlyph>
);

/** Calendario: a page with binder tabs and one marked day. */
export const CalendarNavIcon = ({ className }: IconProps) => (
  <NavGlyph hue={HUES.calendar} className={className}>
    {(fill, edge) => (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="4.6" fill={fill} stroke={edge} {...EDGE} />
        <path d="M3.5 10h17" stroke="#fff" strokeOpacity=".55" strokeWidth="1.2" />
        <rect x="7.2" y="2.8" width="2" height="4.6" rx="1" fill="#fff" />
        <rect x="14.8" y="2.8" width="2" height="4.6" rx="1" fill="#fff" />
        <circle cx="8.6" cy="14.4" r="1.15" fill="#fff" fillOpacity=".6" />
        <circle cx="12" cy="14.4" r="1.15" fill="#fff" fillOpacity=".6" />
        <circle cx="15.4" cy="14.4" r="1.6" fill="#fff" />
      </>
    )}
  </NavGlyph>
);

/** Progreso: three rising bars. */
export const ProgressNavIcon = ({ className }: IconProps) => (
  <NavGlyph hue={HUES.progress} className={className}>
    {(fill, edge) => (
      <>
        <rect x="4" y="12.5" width="4.4" height="8" rx="2.2" fill={fill} stroke={edge} {...EDGE} fillOpacity=".75" />
        <rect x="9.8" y="8.5" width="4.4" height="12" rx="2.2" fill={fill} stroke={edge} {...EDGE} fillOpacity=".88" />
        <rect x="15.6" y="3.5" width="4.4" height="17" rx="2.2" fill={fill} stroke={edge} {...EDGE} />
      </>
    )}
  </NavGlyph>
);

/** Comunidad: two people, the one behind softer. */
export const CommunityNavIcon = ({ className }: IconProps) => (
  <NavGlyph hue={HUES.community} className={className}>
    {(fill, edge) => (
      <>
        <g opacity=".6">
          <circle cx="16.2" cy="7.6" r="3.1" fill={fill} />
          <path d="M11.8 19.6c0-3.4 2-5.8 4.4-5.8s4.4 2.4 4.4 5.8z" fill={fill} />
        </g>
        <circle cx="9.4" cy="8.2" r="3.7" fill={fill} stroke={edge} {...EDGE} />
        <path d="M3.4 20.4c0-4 2.7-6.7 6-6.7s6 2.7 6 6.7z" fill={fill} stroke={edge} {...EDGE} />
      </>
    )}
  </NavGlyph>
);

/** Perfil: a portrait inside a round frame. */
export const ProfileNavIcon = ({ className }: IconProps) => (
  <NavGlyph hue={HUES.profile} className={className}>
    {(fill, edge) => (
      <>
        <circle cx="12" cy="12" r="9" fill={fill} stroke={edge} {...EDGE} />
        <circle cx="12" cy="10" r="3.1" fill="#fff" />
        <path d="M6.6 18.2c1.2-2.3 3.1-3.5 5.4-3.5s4.2 1.2 5.4 3.5A8.9 8.9 0 0 1 12 21a8.9 8.9 0 0 1-5.4-2.8z" fill="#fff" />
      </>
    )}
  </NavGlyph>
);
