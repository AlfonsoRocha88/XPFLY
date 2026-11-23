import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { WALLPAPERS } from "@/lib/wallpapers";
import { isDocDark, isLivingScene, loadScene, paintPreview, runScene } from "./engine";

interface Props {
  id: string;
  className?: string;
  /** Run the real animated scene inside the box (taps inside it count) instead of a still. */
  live?: boolean;
  /** Force a palette; by default it follows the app's light/dark mode. */
  dark?: boolean;
}

/**
 * Thumbnail of a living scene, sized by `className` (it fills its box, DPR-aware).
 * - Still (default): the scene's own `drawPreview`, painted once it scrolls into view.
 * - `live`: the real scene running in the box; paused while off-screen, stopped on unmount.
 * The scene chunk is only fetched when needed. Until then — and for ids with no scene, or if the
 * chunk fails to load — the wallpaper's CSS `preview` shows.
 */
export function LivingPreview({ id, className, live = false, dark }: Props) {
  const box = useRef<HTMLSpanElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const fallback = WALLPAPERS.find((w) => w.id === id)?.preview;

  useEffect(() => {
    const canvas = ref.current, el = box.current;
    if (!canvas || !el || !isLivingScene(id)) return;
    let disposed = false, visible = false, painted = false, lastDark: boolean | null = null;
    let stop: (() => void) | null = null;
    const show = () => { canvas.style.opacity = "1"; };

    const paintStill = () => {
      loadScene(id).then((mod) => {
        if (disposed) return;
        const d = dark ?? isDocDark();
        if (painted && d === lastDark) return;
        lastDark = d; painted = true;
        paintPreview(canvas, mod, d);
        show();
      }).catch(() => { /* keep the CSS fallback */ });
    };
    const startLive = () => {
      if (stop) return;
      loadScene(id).then((mod) => {
        if (disposed || stop || !visible) return;
        stop = runScene(canvas, mod, { container: el, pointerTarget: el, forceDark: dark === true });
        show();
      }).catch(() => { /* keep the CSS fallback */ });
    };
    const stopLive = () => { stop?.(); stop = null; };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (live) { if (visible) startLive(); else stopLive(); }
      else if (visible && !painted) paintStill();
    }, { rootMargin: live ? "0px" : "120px" });
    io.observe(el);
    // Stills repaint when the app flips light/dark (the live engine handles that itself).
    const mo = !live && dark === undefined ? new MutationObserver(() => { if (painted) paintStill(); }) : null;
    mo?.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => { disposed = true; io.disconnect(); mo?.disconnect(); stopLive(); };
  }, [id, live, dark]);

  return (
    <span ref={box} className={cn("relative block overflow-hidden", className)} style={{ background: fallback }} aria-hidden>
      <canvas ref={ref} className="absolute inset-0 h-full w-full transition-opacity duration-300" style={{ opacity: 0 }} />
    </span>
  );
}

export default LivingPreview;
