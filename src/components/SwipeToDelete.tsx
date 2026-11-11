import { useRef, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 96;

/**
 * Swipe a row left to delete it, so touch screens need no trash button.
 * The red layer behind grows with the drag; past the threshold (or on a fast flick)
 * the row slides away and `onDelete` fires. Undo lives in the toast that follows.
 */
// Mouse users keep the hover trash button (and drag-to-reorder), so swiping is touch-only.
const isTouch = typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches;

export function SwipeToDelete({ onDelete, className, children }: { onDelete: () => void; className?: string; children: ReactNode }) {
  const x = useMotionValue(0);
  const fired = useRef(false);
  const armed = useRef(false);
  // A light haptic tick when the swipe crosses the point of no return, synced with the icon pop.
  // (navigator.vibrate works on Android; iOS Safari ignores it and keeps the visual cue only.)
  const tick = () => navigator.vibrate?.(8);
  const reveal = useTransform(x, [-THRESHOLD, -16, 0], [1, 0.2, 0]);
  const iconScale = useTransform(x, [-THRESHOLD * 1.1, -THRESHOLD, -24], [1.15, 1, 0.6]);

  return (
    <div className={cn("relative", className)} data-no-swipe>
      <motion.div
        aria-hidden
        style={{ opacity: reveal }}
        className="absolute inset-0 flex items-center justify-end rounded-[inherit] bg-destructive pr-5 text-destructive-foreground"
      >
        <motion.span style={{ scale: iconScale }}>
          <Trash2 className="h-5 w-5" />
        </motion.span>
      </motion.div>
      <motion.div
        style={{ x }}
        drag={isTouch ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.85, right: 0.05 }}
        dragSnapToOrigin={false}
        onDrag={(_, info) => {
          const past = info.offset.x < -THRESHOLD;
          if (past !== armed.current) { armed.current = past; if (past) tick(); }
        }}
        onDragEnd={(_, info) => {
          armed.current = false;
          if (fired.current) return;
          if (info.offset.x < -THRESHOLD || info.velocity.x < -700) {
            fired.current = true;
            animate(x, -window.innerWidth, { duration: 0.22, ease: [0.4, 0, 1, 1] }).then(onDelete);
          } else {
            animate(x, 0, { type: "spring", stiffness: 500, damping: 34 });
          }
        }}
        className="relative touch-pan-y rounded-[inherit]"
      >
        {children}
      </motion.div>
    </div>
  );
}
