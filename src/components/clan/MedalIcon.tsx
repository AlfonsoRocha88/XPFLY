import { cn } from "@/lib/utils";

interface Props {
  rank: 1 | 2 | 3;
  size?: number;
  className?: string;
}

const COLORS: Record<1 | 2 | 3, { primary: string; ring: string; text: string }> = {
  1: { primary: "#fbbf24", ring: "#92400e", text: "#451a03" },
  2: { primary: "#cbd5e1", ring: "#475569", text: "#0f172a" },
  3: { primary: "#f59e0b", ring: "#7c2d12", text: "#431407" },
};

const MedalIcon = ({ rank, size = 28, className }: Props) => {
  const c = COLORS[rank];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]", className)}
      aria-label={`Posición ${rank}`}
      role="img"
    >
      <defs>
        <linearGradient id={`m${rank}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.primary} stopOpacity="1" />
          <stop offset="100%" stopColor={c.ring} stopOpacity="1" />
        </linearGradient>
      </defs>
      <polygon points="10,2 22,2 26,10 22,18 10,18 6,10" fill={c.ring} opacity="0.5" />
      <circle cx="16" cy="20" r="10" fill={`url(#m${rank})`} stroke={c.ring} strokeWidth="1.5" />
      <text x="16" y="24" textAnchor="middle" fontSize="11" fontWeight="900" fill={c.text} fontFamily="ui-sans-serif, system-ui">
        {rank}
      </text>
    </svg>
  );
};

export default MedalIcon;