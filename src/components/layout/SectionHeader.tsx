import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";

export interface SubTab<T extends string> {
  id: T;
  label: string;
}

interface SectionHeaderProps<T extends string> {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  tabs?: SubTab<T>[];
  activeTab?: T;
  onTabChange?: (id: T) => void;
  /** Floats transparently over a full-screen scene (e.g. the Logros galaxy). */
  overlay?: boolean;
}

/** Sticky glass title bar shared by every section, with an animated segmented control. */
function SectionHeader<T extends string>({ title, subtitle, actions, tabs, activeTab, onTabChange, overlay }: SectionHeaderProps<T>) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] transition-colors duration-500 md:px-8 md:pt-6",
        overlay
          ? "pointer-events-auto bg-gradient-to-b from-[#070a1c]/80 via-[#070a1c]/40 to-transparent text-white"
          : "bg-background/50 backdrop-blur-xl backdrop-saturate-150",
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-[28px] font-medium leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className={cn("truncate text-sm font-semibold", overlay ? "text-white/60" : "text-muted-foreground")}>{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {tabs && tabs.length > 1 && (
        <div className={cn("mx-auto mt-3 flex w-full max-w-3xl rounded-full p-1", overlay ? "border border-white/10 bg-white/[0.07] backdrop-blur-xl" : "glass")} role="tablist">
          {tabs.map((t) => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => { if (!active) { playSfx("nav"); onTabChange?.(t.id); } }}
                className={cn(
                  "relative flex-1 rounded-full py-1.5 text-sm font-medium transition-colors duration-200",
                  active ? (overlay ? "text-white" : "text-foreground") : overlay ? "text-white/55 hover:text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="subtab-pill"
                    className={cn("absolute inset-0 rounded-full", overlay ? "bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" : "bg-card shadow-soft")}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}

export default SectionHeader;
