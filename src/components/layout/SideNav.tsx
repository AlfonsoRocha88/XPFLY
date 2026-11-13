import { m } from "motion/react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PlayerHUD from "@/components/PlayerHUD";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";
import { SECTIONS, type SectionId } from "./sections";

interface SideNavProps {
  current: SectionId;
  onChange: (id: SectionId) => void;
  badges?: Partial<Record<SectionId, number>>;
}

const SideNav = ({ current, onChange, badges = {} }: SideNavProps) => {
  const { signOut } = useAuth();

  return (
    <aside className="glass relative z-20 hidden h-full w-64 shrink-0 flex-col rounded-none border-y-0 border-l-0 p-4 md:flex">
      <div className="mb-5 px-2 font-serif text-3xl font-semibold tracking-tight text-primary">Constela</div>

      <div className="surface mb-5 p-3">
        <PlayerHUD />
      </div>

      <nav className="flex flex-col gap-1">
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = id === current;
          const badge = badges[id] ?? 0;
          return (
            <button
              key={id}
              onClick={() => { if (!active) { playSfx("nav"); onChange(id); } }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                active ? "text-primary" : "text-sidebar-foreground hover:bg-foreground/5",
              )}
            >
              {active && (
                <m.span layoutId="sidenav-pill" className="absolute inset-0 rounded-xl bg-primary/10" transition={{ type: "spring", stiffness: 450, damping: 36 }} />
              )}
              <Icon className="relative h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className="relative flex-1 text-left">{label}</span>
              {badge > 0 && (
                <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => signOut()}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
      >
        <LogOut className="h-5 w-5" /> Cerrar sesión
      </button>
    </aside>
  );
};

export default SideNav;
