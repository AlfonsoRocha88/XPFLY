import type { ReactNode, SVGProps } from "react";

/**
 * Game icon set: duo-tone line icons in the lucide style (24px grid, 1.75 stroke, round joins)
 * with a soft fill on the main shape. Both stroke and fill follow `currentColor`, so icons take
 * the text color they sit in (theme primary, warning, etc.).
 */
interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
}

const FILL = { fill: "currentColor", fillOpacity: 0.16 } as const;

function base(children: ReactNode) {
  return function Icon({ size = 24, className, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={className}
        {...rest}
      >
        {children}
      </svg>
    );
  };
}

export const Coin = base(
  <>
    <circle cx="12" cy="12" r="8.5" {...FILL} />
    <circle cx="12" cy="12" r="5.5" />
    <path d="M12 9.5v5" />
  </>,
);

export const CoinStack = base(
  <>
    <ellipse cx="9" cy="6.5" rx="5.5" ry="2.5" {...FILL} />
    <path d="M3.5 6.5v3.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V6.5" />
    <path d="M3.5 10v3.5c0 1.4 2.5 2.5 5.5 2.5" />
    <circle cx="16" cy="15.5" r="4.5" {...FILL} />
    <path d="M16 13.8v3.4" />
  </>,
);

export const Gem = base(
  <>
    <path d="M6.5 4h11l4 5.5L12 20.5 2.5 9.5z" {...FILL} />
    <path d="M2.5 9.5h19M9 4l-1.5 5.5L12 20.5l4.5-11L15 4" />
  </>,
);

export const Chest = base(
  <>
    <path d="M3.5 10h17v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" {...FILL} />
    <path d="M3.5 10V8a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v2" />
    <path d="M10 10v3a2 2 0 0 0 4 0v-3" />
  </>,
);

export const Flame = base(
  <>
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.6-8.3.4 1.7 1.3 2.8 2.4 3.3C11.6 6.7 13 4.4 15 3c-.2 2.6.9 4.4 2 6 1 1.4 1.5 3 1.5 4.8C18.5 18.4 15.9 21 12 21z" {...FILL} />
    <path d="M12 21c-1.7 0-2.8-1.2-2.8-2.8 0-1.7 1.4-2.6 2.1-4.2.9 1.1 1.9 1.6 2.6 2.6.5.6.9 1.2.9 1.8 0 1.5-1.1 2.6-2.8 2.6z" />
  </>,
);

export const Frost = base(
  <>
    <path d="M12 2.5l7.5 4.3v8.6L12 19.7l-7.5-4.3V6.8z" {...FILL} />
    <path d="M12 7v10M7.7 9.5l8.6 5M16.3 9.5l-8.6 5" />
    <path d="M10.6 7.8L12 9l1.4-1.2M10.6 16.2L12 15l1.4 1.2" />
  </>,
);

export const Potion = base(
  <>
    <path d="M9.5 3h5M10 3v5.2L5.4 16a3 3 0 0 0 2.6 4.5h8a3 3 0 0 0 2.6-4.5L14 8.2V3" />
    <path d="M7.3 13h9.4l1.9 3a3 3 0 0 1-2.6 4.5H8a3 3 0 0 1-2.6-4.5z" {...FILL} />
    <circle cx="11" cy="16.5" r=".6" fill="currentColor" />
  </>,
);

export const Bolt = base(<path d="M13 2.5L4.5 13.5h6.5L10 21.5l8.5-11H12z" {...FILL} />);

export const Sun = base(
  <>
    <circle cx="12" cy="12" r="4.5" {...FILL} />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </>,
);

export const Moon = base(<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" {...FILL} />);

export const Medal = base(
  <>
    <path d="M7.5 2.5h3l2 5M16.5 2.5h-3l-1.1 2.6" />
    <circle cx="12" cy="14.5" r="6" {...FILL} />
    <path d="M12 11.5l.9 1.9 2.1.3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.4 2.1-.3z" />
  </>,
);

export const Sparkle = base(
  <>
    <path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z" {...FILL} />
    <path d="M18.5 15v4M16.5 17h4" />
  </>,
);

export const Frame = base(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" {...FILL} />
    <circle cx="9" cy="9.5" r="1.5" />
    <path d="M20.5 15.5l-4.5-4.5-8.5 8.5" />
  </>,
);

export const Shirt = base(
  <path d="M8.5 3.5L3.5 6l1.8 4.5 2.2-.9V20.5h9V9.6l2.2.9L20.5 6l-5-2.5a3.5 3.5 0 0 1-7 0z" {...FILL} />,
);

export const HeartCrack = base(
  <>
    <path d="M12 20s-8.5-4.8-8.5-11a4.5 4.5 0 0 1 8.5-2.1A4.5 4.5 0 0 1 20.5 9c0 6.2-8.5 11-8.5 11z" {...FILL} />
    <path d="M12 6.9l-1.5 3.6 3 1.5-1.5 3.5" />
  </>,
);

export const Gift = base(
  <>
    <rect x="3.5" y="8" width="17" height="4" rx="1" />
    <path d="M5 12h14v7.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" {...FILL} />
    <path d="M12 8v12.5M12 8C10.5 4 6.5 4.2 7.5 6.5c.5 1.2 2.6 1.5 4.5 1.5zM12 8c1.5-4 5.5-3.8 4.5-1.5C16 7.7 13.9 8 12 8z" />
  </>,
);

export const GAME_ICONS = {
  coin: Coin,
  coins: CoinStack,
  gem: Gem,
  chest: Chest,
  flame: Flame,
  frost: Frost,
  potion: Potion,
  bolt: Bolt,
  sun: Sun,
  moon: Moon,
  medal: Medal,
  sparkle: Sparkle,
  frame: Frame,
  shirt: Shirt,
  heartCrack: HeartCrack,
  gift: Gift,
} as const;

export type GameIconKey = keyof typeof GAME_ICONS;

/** Renders an icon by key. Unknown values (e.g. emoji saved by older versions) render as text. */
export function GameIcon({ name, ...props }: IconProps & { name: string }) {
  const Icon = GAME_ICONS[name as GameIconKey];
  if (!Icon) return <span className={props.className}>{name}</span>;
  return <Icon {...props} />;
}
