import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "pill";

const base =
  "inline-flex items-center justify-center border text-white outline-none select-none " +
  "transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out " +
  "active:scale-[0.98] motion-reduce:active:scale-100 " +
  "focus-visible:ring-2 focus-visible:ring-sky-200/70 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Glass tinted ice blue → lavender, with a soft cool glow under it.
  primary:
    "h-12 w-full rounded-2xl border-white/25 text-base font-semibold [text-shadow:0_1px_8px_rgba(30,27,75,0.45)] " +
    "bg-white/[0.06] bg-[image:linear-gradient(135deg,rgba(186,230,253,0.34)_0%,rgba(165,180,252,0.26)_50%,rgba(196,181,253,0.32)_100%)] " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_32px_-10px_rgba(165,180,252,0.7)] " +
    "hover:border-white/35 hover:bg-white/[0.12] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_12px_36px_-8px_rgba(165,180,252,0.85)] " +
    "[@media(prefers-reduced-transparency:reduce)]:bg-[#3a3f7a]",
  secondary:
    "h-12 w-full rounded-2xl border-white/15 bg-white/[0.07] text-base font-medium text-white/90 " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-white/25 hover:bg-white/[0.11] " +
    "[@media(prefers-reduced-transparency:reduce)]:bg-[#1c2146]",
  // Small link-like action, drawn as a glass pill (44px tall touch target).
  pill:
    "min-h-11 rounded-full border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/75 " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-white/20 hover:bg-white/[0.09] hover:text-white " +
    "[@media(prefers-reduced-transparency:reduce)]:bg-[#1a1e40]",
};

export const GlassButton = forwardRef<HTMLButtonElement, ComponentProps<"button"> & { variant?: Variant }>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], className)} {...props} />
  ),
);
GlassButton.displayName = "GlassButton";
