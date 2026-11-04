/**
 * Avatar catalog: hand-picked flat illustrations served from /public/avatars.
 * Profiles store the chosen avatar's path in `avatar_url` (e.g. "/avatars/gato.webp").
 */
export interface AvatarOption {
  id: string;
  name: string;
  src: string;
}

const CATALOG: Array<[id: string, name: string]> = [
  ["gato", "Gato"],
  ["perro", "Perro"],
  ["nutria", "Nutria"],
  ["foca", "Foca"],
  ["puma", "Puma"],
  ["tigre", "Tigre"],
  ["conejo", "Conejo"],
  ["ballena", "Ballena"],
  ["pez", "Pez"],
  ["petirrojo", "Petirrojo"],
  ["zorro", "Zorro"],
  ["tortuga", "Tortuga"],
  ["buho", "Búho"],
  ["panda-rojo", "Panda rojo"],
  ["pinguino", "Pingüino"],
  ["oso", "Oso"],
];

export const AVATARS: AvatarOption[] = CATALOG.map(([id, name]) => ({ id, name, src: `/avatars/${id}.webp` }));

const BY_SRC = new Map(AVATARS.map((a) => [a.src, a]));

/** The catalog avatar for a stored `avatar_url`, or null for legacy/unknown values. */
export function findAvatar(url: string | null | undefined): AvatarOption | null {
  return (url && BY_SRC.get(url)) || null;
}

/**
 * Image to show for a profile. Legacy AI portraits are no longer shown: anyone
 * without a catalog avatar gets a stable one picked from their id or name.
 */
export function avatarSrc(url: string | null | undefined, seed?: string | null): string {
  const chosen = findAvatar(url);
  if (chosen) return chosen.src;
  const key = seed || "xpfly";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return AVATARS[Math.abs(hash) % AVATARS.length].src;
}
