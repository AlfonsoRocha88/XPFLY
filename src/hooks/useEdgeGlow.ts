import { useEffect } from "react";

/** Everything that draws a luminous edge (see "Luminous edges" in index.css). */
const SELECTOR = ".glass, .glass-strong, .surface, .task-card-game, .daily-quest-item, .glow-edge";
/** How far outside an element the pointer still lights its edge, in px. */
const REACH = 220;

/**
 * Drives the pointer-reactive edges: once per animation frame, every glowing element near the
 * pointer gets --mx/--my (pointer position in its own box); the rest are parked off-screen.
 * Mouse: follows the cursor. Touch: lights what you press, then fades as the finger lifts.
 * One listener for the whole app, so components don't need to know about it.
 */
export function useEdgeGlow() {
  useEffect(() => {
    let x = -1e4, y = -1e4;
    let frame = 0;
    const lit = new Set<HTMLElement>();

    const paint = () => {
      frame = 0;
      const next = new Set<HTMLElement>();
      for (const el of document.querySelectorAll<HTMLElement>(SELECTOR)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        const near = x > r.left - REACH && x < r.right + REACH && y > r.top - REACH && y < r.bottom + REACH;
        if (!near) continue;
        el.style.setProperty("--mx", `${x - r.left}px`);
        el.style.setProperty("--my", `${y - r.top}px`);
        next.add(el);
      }
      for (const el of lit) if (!next.has(el)) { el.style.removeProperty("--mx"); el.style.removeProperty("--my"); }
      lit.clear();
      next.forEach((el) => lit.add(el));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      x = e.clientX; y = e.clientY; schedule();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      x = e.clientX; y = e.clientY; schedule();
    };
    let lift: number | undefined;
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      window.clearTimeout(lift);
      lift = window.setTimeout(() => { x = y = -1e4; schedule(); }, 350);
    };
    const onLeave = () => { x = y = -1e4; schedule(); };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    // Content moving under a still pointer (scroll) should move the light with it.
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(lift);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", schedule, { capture: true });
    };
  }, []);
}
