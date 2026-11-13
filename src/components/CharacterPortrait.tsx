import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatars";
import { frameById } from "@/components/achievements/frames";
import type { ConstellationId } from "@shared/achievements";

interface Props {
  url?: string | null;
  /** Stable id (user id) used to pick a default avatar when none is chosen. */
  seed?: string | null;
  size?: number;
  /** Equipped avatar frame id (unlocked from achievements). */
  frame?: string | null;
  className?: string;
}

const CharacterPortrait = ({ url, seed, size = 96, frame, className }: Props) => {
  const Frame = frameById(frame)?.Frame ?? null;
  const img = (
    <img
      src={avatarSrc(url, seed)}
      alt="Avatar"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full object-cover", !Frame && className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
  if (!Frame) return img;
  // The frame ring sits just outside the photo.
  const outer = Math.round(size * 1.16);
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: outer, height: outer }}>
      {img}
      <Frame size={outer} />
    </span>
  );
};

export default CharacterPortrait;
