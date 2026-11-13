import { cn } from "@/lib/utils";

/**
 * Orb: a glass sphere with a slowly turning nebula inside. Pure CSS (conic + radial gradients),
 * so it costs nothing to render in lists and buttons.
 */
export function Orb({ size = 48, className, still = false }: { size?: number; className?: string; still?: boolean }) {
  return (
    <span
      className={cn("orb relative inline-block shrink-0 rounded-full", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className={cn("orb-core absolute inset-[6%] rounded-full", !still && "orb-spin")} />
      <span className="orb-glass absolute inset-0 rounded-full" />
    </span>
  );
}
