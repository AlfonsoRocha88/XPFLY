import { cn } from "@/lib/utils";
import pyroImg from "@/assets/pyro-mascot.png";
import type { PyroMood } from "@/hooks/usePyro";

type Props = {
  size?: number;
  mood?: PyroMood;
  className?: string;
};

/**
 * Pyro: bolita de fuego azul estilo Fire Force × Solo Leveling.
 * Ilustración hecha a mano, animada con CSS (flotar / rebote / wiggle).
 */
const ANIMATION_MAP: Record<PyroMood, string> = {
  idle: "pyro-float 3s ease-in-out infinite",
  happy: "pyro-bounce 0.6s ease-out",
  thinking: "pyro-float 3s ease-in-out infinite",
  alert: "pyro-wiggle 0.4s ease-in-out infinite",
  eating: "pyro-eating 1.2s ease-in-out",
  dying: "pyro-tremble 2.4s ease-in-out infinite",
  revival: "pyro-revival 1.8s cubic-bezier(0.22, 1, 0.36, 1)",
  celebrating: "pyro-celebrate 1.2s ease-in-out",
  sleeping: "pyro-sleep 5s ease-in-out infinite",
};

export default function PyroSprite({ size = 64, mood = "idle", className }: Props) {
  const animation = ANIMATION_MAP[mood] ?? ANIMATION_MAP.idle;
  const tilt = mood === "thinking" ? "rotate(-6deg)" : undefined;

  return (
    <div
      className={cn("pyro-sprite relative", `pyro-mood-${mood}`)}
      style={{ width: size, height: size, animation }}
      aria-label="Pyro"
    >
      <div className="pyro-glow" />
      <img
        src={pyroImg}
        alt="Pyro"
        width={512}
        height={512}
        loading="lazy"
        draggable={false}
        className="pyro-img"
        style={{ transform: tilt }}
      />
      {mood === "eating" && <div className="pyro-mouth" aria-hidden="true" />}
      {mood === "eating" && <div className="pyro-flame-burst" aria-hidden="true" />}
      {mood === "celebrating" && <div className="pyro-flame-burst pyro-flame-burst--celebrate" aria-hidden="true" />}
      {mood === "revival" && <div className="pyro-revival-flash" aria-hidden="true" />}
    </div>
  );
}
