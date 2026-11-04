import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatars";

interface Props {
  url?: string | null;
  /** Stable id (user id) used to pick a default avatar when none is chosen. */
  seed?: string | null;
  size?: number;
  className?: string;
}

const CharacterPortrait = ({ url, seed, size = 96, className }: Props) => (
  <img
    src={avatarSrc(url, seed)}
    alt="Avatar"
    width={size}
    height={size}
    className={cn("shrink-0 rounded-full object-cover", className)}
    style={{ width: size, height: size }}
    draggable={false}
  />
);

export default CharacterPortrait;
