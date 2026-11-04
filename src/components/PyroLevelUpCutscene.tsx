import { useEffect, useState } from "react";
import PyroSprite from "./PyroSprite";
import type { PyroTier } from "@/lib/pyro-progression";
import { usePyroCutsceneBus } from "@/hooks/usePyroProgression";
import { playSfx } from "@/lib/sfx";
import { pyroSay } from "@/hooks/usePyro";

/**
 * Phase 4 — Full-screen cutscene shown when Pyro levels up and unlocks a feature.
 * Auto-dismisses after ~4s. Click anywhere to skip.
 */
export default function PyroLevelUpCutscene() {
  const [tier, setTier] = useState<PyroTier | null>(null);

  usePyroCutsceneBus((t) => {
    setTier(t);
    try { playSfx("levelUp"); } catch { /* ignore */ }
    // Echo Pyro's line in the bubble after the cutscene closes.
    window.setTimeout(() => pyroSay(t.pyroLine, "celebrating"), 3800);
  });

  useEffect(() => {
    if (!tier) return;
    const t = window.setTimeout(() => setTier(null), 4200);
    return () => window.clearTimeout(t);
  }, [tier]);

  if (!tier) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in cursor-pointer"
      onClick={() => setTier(null)}
      role="dialog"
      aria-label="Pyro ha subido de nivel"
    >
      {/* Radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, hsl(var(--primary) / 0.35), transparent 60%)",
        }}
      />
      {/* Scanlines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, hsl(var(--primary) / 0.08) 0 1px, transparent 1px 3px)",
        }}
      />

      <div className="relative flex flex-col items-center gap-4 px-6 text-center animate-scale-in">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 -m-8 rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 70%)",
              filter: "blur(8px)",
              animation: "pyro-celebrate 1.2s ease-in-out infinite",
            }}
          />
          <div className="relative">
            <PyroSprite size={140} mood="celebrating" />
          </div>
        </div>

        <div
          className="font-pixel text-xs tracking-widest text-primary"
          style={{ textShadow: "0 0 12px hsl(var(--primary) / 0.8)" }}
        >
          PODER DE PYRO · NIVEL {tier.level}
        </div>
        <h2
          className="font-pixel text-base md:text-2xl text-foreground"
          style={{ textShadow: "0 0 16px hsl(var(--primary) / 0.7)" }}
        >
          {tier.title}
        </h2>
        <div className="flex items-center gap-2 rounded-lg border-2 border-primary/60 bg-card/80 px-4 py-2 shadow-[0_0_24px_hsl(var(--primary)/0.5)]">
          <span className="text-2xl">{tier.emoji}</span>
          <span className="font-pixel text-xs text-foreground">FEATURE DESBLOQUEADA</span>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">{tier.description}</p>
        <p className="font-pixel text-xs text-muted-foreground/70 mt-2">
          [toca para continuar]
        </p>
      </div>
    </div>
  );
}