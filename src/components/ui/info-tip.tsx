import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * A small "?" that unfolds an explanation instead of spending a whole card on it.
 * Radix handles anchoring, collisions, focus and outside-click; motion handles the entrance:
 * the panel grows from the button with a short blur-to-sharp (motion blur) and a soft fall.
 */
export function InfoTip({
  title,
  children,
  label,
  className,
  side = "bottom",
  align = "center",
}: {
  title?: string;
  children: ReactNode;
  /** Accessible name for the button, e.g. "Cómo ganar trofeos". Defaults to the title. */
  label?: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={label ?? title ?? "Más información"}
        className={cn(
          "glass relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          open && "text-foreground",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        ?
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild forceMount side={side} align={align} sideOffset={8} collisionPadding={16}>
              <m.div
                className="glass-strong z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-4 text-sm shadow-lift outline-none"
                style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: side === "top" ? 6 : -6, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(6px)", transition: { duration: 0.14, ease: "easeIn" } }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              >
                {title && <p className="mb-2 font-semibold text-foreground">{title}</p>}
                <div className="space-y-2 text-muted-foreground">{children}</div>
              </m.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}

/** One line in an InfoTip: an icon (or emoji) and a short sentence. */
export function InfoRow({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 leading-snug">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span>{children}</span>
    </p>
  );
}
