import { lazy, Suspense } from "react";

const LivingBackground = lazy(() => import("@/components/living/LivingBackground"));

/**
 * Always-night backdrop for the sign-in screens: the live nebula canvas over a deep-space
 * gradient (seen while the canvas chunk loads). Fixed and full-bleed, under the safe areas.
 */
export function AuthSky() {
  return (
    <div
      data-auth-sky=""
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-[#0b0a24] bg-[image:radial-gradient(120%_70%_at_20%_8%,#2a1d5e_0%,transparent_60%),radial-gradient(90%_60%_at_88%_92%,#0f3554_0%,transparent_65%)]"
    >
      <Suspense fallback={null}>
        <LivingBackground scene="living-nebulosa" forceDark />
      </Suspense>
      {/* Soft vignette: pulls the eye to the card and deepens the edges of the sky. */}
      <div className="absolute inset-0 bg-[image:radial-gradient(120%_90%_at_50%_45%,transparent_45%,rgba(4,5,18,0.55)_100%)]" />
    </div>
  );
}
