// Shared AI client: Google Gemini through its OpenAI-compatible endpoint.
// Set the key once with: supabase secrets set GEMINI_API_KEY=...
// To switch providers later, change these three values (and the model names).

export const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export const AI_MODELS = {
  /** Structured tasks such as profile-photo moderation. */
  fast: "gemini-2.5-flash",
} as const;

export function aiHeaders(): HeadersInit {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY no configurado");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

/** Spanish message for the client when the provider rejects a request. */
export function aiErrorMessage(status: number): string {
  if (status === 429) return "Demasiadas peticiones, espera un momento.";
  if (status === 401 || status === 403) return "La clave de IA no es válida.";
  return "La IA no está disponible ahora.";
}
