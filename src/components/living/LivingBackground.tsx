import { useEffect, useRef } from "react";
import { loadScene, runScene, type LivingScene } from "./engine";

export type { LivingScene } from "./engine";

/**
 * Premium "living" backgrounds: a full-screen canvas behind the app that drifts on its own and
 * answers the user — every tap leaves a small trace and finishing a task (the `xpfly:celebrate`
 * event) makes a bigger moment where the finger last touched. The scene module for `scene` is
 * loaded on demand (one chunk per scene); the engine handles DPR, resize, pausing and reduced motion.
 */
export default function LivingBackground({ scene, forceDark = false }: { scene: LivingScene; forceDark?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let disposed = false;
    let stop: (() => void) | null = null;
    loadScene(scene)
      .then((mod) => { if (!disposed) stop = runScene(canvas, mod, { forceDark }); })
      .catch(() => { /* chunk failed to load (offline): the plain app background shows instead */ });
    return () => { disposed = true; stop?.(); };
  }, [scene, forceDark]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
