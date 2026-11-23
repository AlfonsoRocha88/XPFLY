import { frameById } from "./registry";

/** The frame art for one id. Loaded lazily by CharacterPortrait so the main bundle stays small. */
export default function FrameLayer({ id, size }: { id: string; size: number }) {
  const def = frameById(id);
  return def ? <def.Frame size={size} /> : null;
}
