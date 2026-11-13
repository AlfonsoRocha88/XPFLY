import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Glass text field: white text on a faint frost, cool blue glow on focus. Always 16px (no iOS zoom). */
export const GlassInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-12 w-full rounded-2xl border border-white/15 bg-white/[0.07] px-4 text-base font-medium text-white caret-sky-200 outline-none",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] placeholder:font-normal placeholder:text-white/45",
      "transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-white/25",
      "focus-visible:border-sky-200/60 focus-visible:bg-white/[0.1] focus-visible:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_3px_rgba(147,197,253,0.22),0_0_22px_rgba(147,197,253,0.28)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Browser autofill would paint an opaque pale box with dark text: keep it night-colored instead.
      "[&:-webkit-autofill]:shadow-[inset_0_0_0_100px_#1a1e44] [&:-webkit-autofill]:[-webkit-text-fill-color:#fff]",
      "[@media(prefers-reduced-transparency:reduce)]:bg-[#1c2146]",
      className,
    )}
    {...props}
  />
));
GlassInput.displayName = "GlassInput";
