import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";
import { SECTIONS, type SectionId } from "./sections";

interface BottomNavProps {
  current: SectionId;
  onChange: (id: SectionId) => void;
  badges?: Partial<Record<SectionId, number>>;
}

/** Floating glass tab bar, icons only (names live in aria-label): the pill glides and the icon pops. */
const BottomNav = ({ current, onChange, badges = {} }: BottomNavProps) => (
  <nav
    className="glass fixed inset-x-3 z-40 rounded-[1.75rem] md:hidden"
    style={{ bottom: "max(0.6rem, env(safe-area-inset-bottom))" }}
  >
    <div className="grid grid-cols-6 p-1.5">
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const active = id === current;
        const badge = badges[id] ?? 0;
        return (
          <button
            key={id}
            onClick={() => { if (!active) { playSfx("nav"); onChange(id); } }}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            title={label}
            className="relative flex h-12 items-center justify-center rounded-[1.35rem]"
          >
            {active && (
              <m.span
                layoutId="bottomnav-pill"
                className="absolute inset-0 rounded-[1.35rem] bg-primary/10 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.35)]"
                transition={{ type: "spring", stiffness: 450, damping: 34 }}
              />
            )}
            <m.span
              key={active ? "on" : "off"}
              initial={active ? { scale: 0.7, y: 2 } : false}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 15 }}
              className={cn("relative flex h-8 items-center justify-center", active ? "text-primary" : "text-muted-foreground")}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.3 : 1.9} />
              {badge > 0 && (
                <span className="absolute -right-2.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </m.span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNav;
