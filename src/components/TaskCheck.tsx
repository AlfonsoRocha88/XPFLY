import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCheckProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  size?: "md" | "sm";
  disabled?: boolean;
}

/** Round, thumb-friendly completion toggle used by every task row. */
const TaskCheck = ({ checked, onToggle, label, size = "md", disabled }: TaskCheckProps) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    onPointerDown={(e) => e.stopPropagation()}
    className={cn(
      "relative flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-90 disabled:opacity-40",
      "before:absolute before:-inset-2 before:content-['']",
      size === "md" ? "h-7 w-7" : "h-6 w-6",
      checked
        ? "border-success bg-success text-white"
        : "border-muted-foreground/30 bg-card text-transparent hover:border-primary",
    )}
  >
    <Check className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={3.5} />
  </button>
);

export default TaskCheck;
