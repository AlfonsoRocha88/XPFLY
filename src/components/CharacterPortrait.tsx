import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface Props {
  url?: string | null;
  size?: number;
  className?: string;
  glow?: string | null;
  loading?: boolean;
}

const CharacterPortrait = ({ url, size = 96, className, glow, loading }: Props) => {
  const ringStyle = glow
    ? { boxShadow: `0 0 24px ${glow}66, inset 0 0 12px ${glow}33`, borderColor: `${glow}aa` }
    : undefined;

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border-2 border-primary/30 bg-primary/10",
        loading && "animate-pulse",
        className,
      )}
      style={{ width: size, height: size, ...ringStyle }}
    >
      {url ? (
        <img
          src={url}
          alt="Retrato del personaje"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary/60">
          <User className="h-1/2 w-1/2" strokeWidth={1.2} />
        </div>
      )}
    </div>
  );
};

export default CharacterPortrait;