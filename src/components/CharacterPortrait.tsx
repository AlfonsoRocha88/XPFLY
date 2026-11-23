import { lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatars";

// Frame art (25 illustrated SVGs) is its own chunk, fetched the first time a framed avatar shows.
const FrameLayer = lazy(() => import("@/components/frames/FrameLayer"));

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
  const hasFrame = !!frame;
  const img = (
    <img
      src={avatarSrc(url, seed)}
      alt="Avatar"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full object-cover", !hasFrame && className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
  if (!hasFrame) return img;
  // The frame ring sits just outside the photo.
  const outer = Math.round(size * 1.16);
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: outer, height: outer }}>
      {img}
      <Suspense fallback={null}><FrameLayer id={frame!} size={outer} /></Suspense>
    </span>
  );
};

export default CharacterPortrait;
