import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Width of an element, kept in sync with resizes. Charts draw in real pixels so text never scales. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Linear scale: maps [d0, d1] to [r0, r1]. */
export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** "Nice" upper bound and ~4 ticks for a count axis. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => +(i * step).toFixed(6));
}

/** Counts up from 0 to `value` once, on mount or when value changes. */
export function useCountUp(value: number, duration = 700) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(value); return; }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

/** Floating tooltip positioned inside a relative chart container. */
export function ChartTooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const W = 168;
  const left = Math.max(0, Math.min(width - W, x - W / 2));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 w-[168px] rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lift animate-chip-in"
      style={{ left, top: Math.max(0, y - 8), transform: "translateY(-100%)" }}
    >
      {children}
    </div>
  );
}

/** Card shell shared by every chart: title, optional subtitle, and a chart/table toggle. */
export function ChartCard({
  title,
  subtitle,
  action,
  table,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  table?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn("surface p-5", className)} aria-label={title}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          {action}
          {table && (
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={asTable ? "Ver como gráfica" : "Ver como tabla"}
              title={asTable ? "Ver como gráfica" : "Ver como tabla"}
            >
              {asTable ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>
      {asTable && table ? <div className="max-h-72 overflow-auto">{table}</div> : children}
    </section>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-xs tabular-nums">
      <thead className="sticky top-0 bg-card text-muted-foreground">
        <tr>{head.map((h) => <th key={h} className="py-1.5 pr-3 font-medium">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-border/60">
            {r.map((c, j) => <td key={j} className="py-1.5 pr-3 text-foreground">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EmptyChart({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="max-w-xs text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
