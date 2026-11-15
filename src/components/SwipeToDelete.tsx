import { useRef, type ReactNode } from "react";
import { animate, m, useMotionValue, useTransform } from "motion/react";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 96;

/**
 * Swipe actions for a task row (touch screens only; mouse users keep the hover buttons):
 *  - left: the row slides away and `onDelete` fires (undo lives in the toast that follows);
 *  - right: completes it (or reopens it if done). The row springs back and the card's own
 *    completion animation plays, so it never vanishes under your finger.
 * Each side reveals its colour as you drag and ticks (haptic + icon pop) at the point of no return.
 */
const isTouch = typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches;

interface Props {
  onDelete: () => void;
  onComplete?: () => void;
  done?: boolean;
  className?: string;
  children: ReactNode;
}

export function SwipeToDelete({ onDelete, onComplete, done = false, className, children }: Props) {
  const x = useMotionValue(0);
  const fired = useRef(false);
  const armed = useRef<"left" | "right" | null>(null);
  // navigator.vibrate works on Android; iOS Safari ignores it and keeps the visual cue only.
  const tick = () => navigator.vibrate?.(8);

  const deleteReveal = useTransform(x, [-THRESHOLD, -16, 0], [1, 0.2, 0]);
  const deleteIcon = useTransform(x, [-THRESHOLD * 1.1, -THRESHOLD, -24], [1.15, 1, 0.6]);
  const doneReveal = useTransform(x, [0, 16, THRESHOLD], [0, 0.2, 1]);
  const doneIcon = useTransform(x, [24, THRESHOLD, THRESHOLD * 1.1], [0.6, 1, 1.15]);

  return (
    <div className={cn("relative", className)} data-no-swipe>
      {onComplete && (
        <m.div
          aria-hidden
          style={{ opacity: doneReveal }}
          className={cn(
            "absolute inset-0 flex items-center justify-start rounded-[inherit] pl-5 text-white",
            done ? "bg-muted-foreground" : "bg-success",
          )}
        >
          <m.span style={{ scale: doneIcon }}>
            {done ? <RotateCcw className="h-5 w-5" /> : <Check className="h-5 w-5" strokeWidth={3} />}
          </m.span>
        </m.div>
      )}
      <m.div
        aria-hidden
        style={{ opacity: deleteReveal }}
        className="absolute inset-0 flex items-center justify-end rounded-[inherit] bg-destructive pr-5 text-destructive-foreground"
      >
        <m.span style={{ scale: deleteIcon }}>
          <Trash2 className="h-5 w-5" />
        </m.span>
      </m.div>
      <m.div
        style={{ x }}
        drag={isTouch ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.85, right: onComplete ? 0.85 : 0.05 }}
        dragSnapToOrigin={false}
        onDrag={(_, info) => {
          const side = info.offset.x < -THRESHOLD ? "left" : onComplete && info.offset.x > THRESHOLD ? "right" : null;
          if (side !== armed.current) { armed.current = side; if (side) tick(); }
        }}
        onDragEnd={(_, info) => {
          armed.current = null;
          if (fired.current) return;
          if (info.offset.x < -THRESHOLD || info.velocity.x < -700) {
            fired.current = true;
            animate(x, -window.innerWidth, { duration: 0.22, ease: [0.4, 0, 1, 1] }).then(onDelete);
            return;
          }
          if (onComplete && (info.offset.x > THRESHOLD || info.velocity.x > 700)) onComplete();
          animate(x, 0, { type: "spring", stiffness: 500, damping: 34 });
        }}
        className="relative touch-pan-y rounded-[inherit]"
      >
        {children}
      </m.div>
    </div>
  );
}
