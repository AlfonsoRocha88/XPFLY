/**
 * Pyro dialogue pools — Paimon × Duo × Calcifer.
 * Always casual Spanish, dramatic, slightly unhinged.
 */

export const EATING_LINES = [
  "¡Mmm! ¡Misión completada! ¡Deliciosa!",
  "¡Sí, sí, sí! ¡Más así!",
  "Hmm... misión de ejercicio. Un poco amarga pero muy nutritiva.",
  "¡Eso estuvo INCREÍBLE! ¿Tienes más?",
  "Cada misión me hace más fuerte. Y tú también, supongo.",
  "¡Fuego! ¡Más fuego! ¡Esto es lo que necesitaba!",
  "No está mal. Podrías haber tardado menos, pero no está mal.",
];

export const HUNGER_ALERT_LINE =
  "Oye... hace un día que no comes. Quiero decir, que no me alimentas. Que no cumples misiones. Ya sabes.";

export const HUNGER_DYING_LINE =
  "Me estoy apagando... ¿ya no te importo? Solo una misión. Una. Por favor.";

export const HUNGER_CRITICAL_LINE =
  "Esto es el fin. Mi llama... se apaga... dile a mis misiones que las quise mucho.";

export const REVIVAL_LINE =
  "¡VIVO! ¡Estoy VIVO! ¡Sabía que no me abandonarías! ...casi.";

export const IDLE_ONELINERS = [
  "¿Sabías que las llamas no dormimos? Bueno, yo a veces sí. No le digas a nadie.",
  "Estoy pensando en misiones. Y en atún. Sobre todo en atún.",
  "Si me alimentas, te hago famoso. Es un trato.",
  "Una misión más y subimos de nivel. Tú sube. Yo ya estoy arriba.",
  "El fuego nunca se cansa. Tú sí. Eso es problema tuyo.",
];

/** Picks a random index from `arr` that is different from `lastIdx`. */
export function pickNoRepeat(arr: string[], lastIdx: number): { idx: number; line: string } {
  if (arr.length <= 1) return { idx: 0, line: arr[0] ?? "" };
  let idx = Math.floor(Math.random() * arr.length);
  if (idx === lastIdx) idx = (idx + 1) % arr.length;
  return { idx, line: arr[idx] };
}