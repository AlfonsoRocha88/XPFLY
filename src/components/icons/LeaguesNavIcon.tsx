import { TrophyIcon } from "./TrophyIcon";

/** Ligas tab icon: the trophy orbit, sized like the lucide icons next to it. */
export function LeaguesNavIcon({ className }: { className?: string; strokeWidth?: number }) {
  return <TrophyIcon size={24} className={className} />;
}
