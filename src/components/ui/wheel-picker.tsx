import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * iOS-style scroll wheel. Native scroll + snap does the physics; the value is committed only once
 * the wheel comes to rest (scrollend, with a timeout fallback), so a flick never records the
 * number it happened to pass over. External value changes re-centre the wheel only while the user
 * isn't touching it. Tap an item to jump to it; arrow keys step it.
 */

export const WHEEL_ITEM_H = 40;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * WHEEL_ITEM_H;

interface WheelProps<T extends string | number> {
  items: readonly T[];
  value: number; // selected index
  onChange: (index: number) => void;
  format?: (item: T) => string;
  label: string; // accessible name, e.g. "Hora"
  className?: string;
}

export function Wheel<T extends string | number>({ items, value, onChange, format, label, className }: WheelProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const interacting = useRef(false);
  const settleTimer = useRef<number>();
  const [live, setLive] = useState(value); // index under the highlight while scrolling

  const clamp = useCallback((i: number) => Math.max(0, Math.min(items.length - 1, i)), [items.length]);

  // Follow outside changes (initial value, reset) without fighting a finger on the wheel.
  useEffect(() => {
    const el = ref.current;
    if (!el || interacting.current) return;
    el.scrollTo({ top: value * WHEEL_ITEM_H, behavior: "auto" });
    setLive(value);
  }, [value]);

  const commit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    interacting.current = false;
    const idx = clamp(Math.round(el.scrollTop / WHEEL_ITEM_H));
    setLive(idx);
    if (idx !== value) onChange(idx);
  }, [clamp, onChange, value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEnd = () => { window.clearTimeout(settleTimer.current); commit(); };
    el.addEventListener("scrollend", onEnd);
    return () => el.removeEventListener("scrollend", onEnd);
  }, [commit]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    interacting.current = true;
    const idx = clamp(Math.round(el.scrollTop / WHEEL_ITEM_H));
    if (idx !== live) {
      setLive(idx);
      try { navigator.vibrate?.(4); } catch { /* not supported */ }
    }
    // Fallback for browsers without scrollend (older Safari): commit once scrolling has been quiet.
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(commit, 160);
  };

  const goTo = (i: number) => {
    const idx = clamp(i);
    interacting.current = true;
    ref.current?.scrollTo({ top: idx * WHEEL_ITEM_H, behavior: "smooth" });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); goTo(live + 1); }
    if (e.key === "ArrowUp") { e.preventDefault(); goTo(live - 1); }
  };

  return (
    <div className={cn("relative", className)} style={{ height: VISIBLE * WHEEL_ITEM_H }}>
      {/* Selection band behind the centred row */}
      <div className="pointer-events-none absolute inset-x-0 rounded-xl bg-foreground/[0.07]" style={{ top: PAD, height: WHEEL_ITEM_H }} />
      <div
        ref={ref}
        role="spinbutton"
        aria-label={label}
        aria-valuenow={live}
        aria-valuetext={format ? format(items[live]) : String(items[live])}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        data-no-swipe
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
        }}
      >
        <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={cn(
                "flex w-full snap-center items-center justify-center text-lg tabular-nums transition-[color,transform] duration-150",
                i === live ? "scale-105 font-semibold text-foreground" : "text-muted-foreground",
              )}
              style={{ height: WHEEL_ITEM_H }}
            >
              {format ? format(it) : it}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
