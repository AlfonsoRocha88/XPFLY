import { Sword, CalendarDays, Scroll, Shield, Palette, ShoppingBag, Trophy, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";
import { toast } from "sonner";

export type BottomNavPage =
  | "tasks"
  | "calendar"
  | "stats"
  | "shop"
  | "leagues"
  | "social"
  | "clans"
  | "wallpaper";

interface MobileBottomNavProps {
  currentPage: BottomNavPage;
  onPageChange: (page: BottomNavPage) => void;
  socialBadge?: number;
  unlocked?: {
    calendar?: boolean;
    stats?: boolean;
    shop?: boolean;
    leagues?: boolean;
    social?: boolean;
    clans?: boolean;
  };
  /** Page the swipe gesture is heading toward (for smooth indicator). */
  swipeTargetPage?: BottomNavPage | null;
  /** Drag progress 0..1 toward swipeTargetPage. */
  swipeProgress?: number;
}

const LOCK_MSG = {
  social: "Pyro necesita llegar al nivel 2 para despertar las conexiones sociales 🔥",
  clans: "Pyro necesita llegar al nivel 3 para forjar alianzas 🔥",
  leagues: "Pyro necesita llegar al nivel 4 para competir en las grandes ligas 🔥",
};

const MobileBottomNav = ({
  currentPage,
  onPageChange,
  socialBadge = 0,
  unlocked,
  swipeTargetPage,
  swipeProgress = 0,
}: MobileBottomNavProps) => {
  const u = (k: keyof NonNullable<MobileBottomNavProps["unlocked"]>) =>
    unlocked ? unlocked[k] !== false : true;
  type Item = {
    key: BottomNavPage | string;
    label: string;
    icon: typeof Sword;
    active: boolean;
    onClick: () => void;
    badge?: number;
    locked?: boolean;
    lockedMsg?: string;
  };
  const items: Array<Item> = [
    { key: "tasks", label: "Misiones", icon: Sword, active: currentPage === "tasks", onClick: () => onPageChange("tasks") },
    ...(u("calendar") ? [{ key: "calendar", label: "Calend.", icon: CalendarDays, active: currentPage === "calendar", onClick: () => onPageChange("calendar") }] : []),
    ...(u("stats") ? [{ key: "stats", label: "Logros", icon: Scroll, active: currentPage === "stats", onClick: () => onPageChange("stats") }] : []),
    ...(u("shop") ? [{ key: "shop", label: "Tienda", icon: ShoppingBag, active: currentPage === "shop", onClick: () => onPageChange("shop") }] : []),
    u("leagues")
      ? { key: "leagues", label: "Ligas", icon: Trophy, active: currentPage === "leagues", onClick: () => onPageChange("leagues") }
      : { key: "leagues", label: "Ligas", icon: Trophy, active: false, locked: true, lockedMsg: LOCK_MSG.leagues, onClick: () => toast.info(LOCK_MSG.leagues) },
    u("social")
      ? { key: "social", label: "Social", icon: Users, active: currentPage === "social", onClick: () => onPageChange("social"), badge: socialBadge }
      : { key: "social", label: "Social", icon: Users, active: false, locked: true, lockedMsg: LOCK_MSG.social, onClick: () => toast.info(LOCK_MSG.social) },
    u("clans")
      ? { key: "clans", label: "Clanes", icon: Shield, active: currentPage === "clans", onClick: () => onPageChange("clans") }
      : { key: "clans", label: "Clanes", icon: Shield, active: false, locked: true, lockedMsg: LOCK_MSG.clans, onClick: () => toast.info(LOCK_MSG.clans) },
    { key: "wallpaper", label: "Estilo", icon: Palette, active: currentPage === "wallpaper", onClick: () => onPageChange("wallpaper") },
  ];

  const curIdx = Math.max(0, items.findIndex((i) => i.key === currentPage));
  const tgtIdx = swipeTargetPage
    ? items.findIndex((i) => i.key === swipeTargetPage)
    : curIdx;
  const safeTgtIdx = tgtIdx < 0 ? curIdx : tgtIdx;
  const fractionalIdx = curIdx + (safeTgtIdx - curIdx) * Math.min(1, Math.max(0, swipeProgress));
  const itemPct = 100 / items.length;
  const isDragging = swipeProgress > 0 && swipeTargetPage != null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 grid border-t border-border bg-sidebar/95 backdrop-blur-md md:hidden"
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Sliding active-tab indicator (smoothly follows swipe drag). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
        style={{
          width: `calc(${itemPct}% - 1rem)`,
          left: `calc(${fractionalIdx * itemPct}% + 0.5rem)`,
          transition: isDragging ? "none" : "left 200ms ease-out",
        }}
      />
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            onClick={() => { playSfx("nav"); it.onClick(); }}
            aria-label={it.locked ? it.lockedMsg : it.label}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 py-2 transition-colors",
              it.active
                ? "text-primary"
                : it.locked
                  ? "text-sidebar-foreground/50"
                  : "text-sidebar-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {it.locked && (
                <span className="absolute -right-1.5 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-card border border-primary/50">
                  <Lock className="h-2 w-2 text-primary" aria-hidden="true" />
                </span>
              )}
              {it.badge && it.badge > 0 ? (
                <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[7px] font-bold text-destructive-foreground">
                  {it.badge}
                </span>
              ) : null}
            </div>
            <span className="font-pixel text-[7px] leading-none">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;