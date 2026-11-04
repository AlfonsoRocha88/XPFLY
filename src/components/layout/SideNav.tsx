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
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-sidebar p-4 md:flex">
      <div className="mb-5 px-2 text-2xl font-black tracking-tight text-primary">XPFly</div>

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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold transition-colors",
                active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className="flex-1 text-left">{label}</span>
              {badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-extrabold text-destructive-foreground">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => signOut()}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
      >
        <LogOut className="h-5 w-5" /> Cerrar sesión
      </button>
    </aside>
  );
};

export default SideNav;
