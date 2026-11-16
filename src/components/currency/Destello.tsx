import { cn } from "@/lib/utils";

/**
 * Destello: Constela's currency. An eight-point gold star set with four ice-blue step-cut
 * crystals (rendered from the owner's earring; public/destello.png, transparent 256px).
 */
export function Destello({ size = 16, className, twinkle = false }: { size?: number; className?: string; twinkle?: boolean }) {
  return (
    <img
      src="/destello.png"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn("inline-block shrink-0 select-none object-contain drop-shadow-[0_0_3px_rgba(150,215,255,0.55)]", twinkle && "destello-twinkle", className)}
      aria-hidden
    />
  );
}

/** Balance pill: icon + amount. */
export function DestellosAmount({ value, className, size = 16 }: { value: number; className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold tabular-nums", className)}>
      <Destello size={size} twinkle />
      {value.toLocaleString("es-MX")}
    </span>
  );
}
