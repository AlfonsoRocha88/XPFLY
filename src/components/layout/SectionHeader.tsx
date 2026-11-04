import type { ReactNode } from "react";
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
}

/** Sticky title bar shared by every section, with optional segmented sub-tabs. */
function SectionHeader<T extends string>({ title, subtitle, actions, tabs, activeTab, onTabChange }: SectionHeaderProps<T>) {
  return (
    <header className="sticky top-0 z-20 bg-background/90 px-4 pb-3 pt-4 backdrop-blur-md md:px-8 md:pt-6">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm font-semibold text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {tabs && tabs.length > 1 && (
        <div className="mx-auto mt-3 flex w-full max-w-3xl rounded-full bg-muted p-1">
          {tabs.map((t) => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => { if (!active) { playSfx("nav"); onTabChange?.(t.id); } }}
                className={cn(
                  "flex-1 rounded-full py-1.5 text-sm font-bold transition-all duration-200",
                  active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}

export default SectionHeader;
