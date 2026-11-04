import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";
import { SECTIONS, type SectionId } from "./sections";

interface BottomNavProps {
  current: SectionId;
  onChange: (id: SectionId) => void;
  badges?: Partial<Record<SectionId, number>>;
}

const BottomNav = ({ current, onChange, badges = {} }: BottomNavProps) => (
  <nav
    className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden"
    style={{
      paddingLeft: "env(safe-area-inset-left)",
      paddingRight: "env(safe-area-inset-right)",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}
  >
    <div className="grid grid-cols-5 px-1">
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const active = id === current;
        const badge = badges[id] ?? 0;
        return (
          <button
            key={id}
            onClick={() => { if (!active) { playSfx("nav"); onChange(id); } }}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center gap-0.5 py-2"
          >
            <span
              className={cn(
                "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
              {badge > 0 && (
                <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            <span className={cn("text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNav;
