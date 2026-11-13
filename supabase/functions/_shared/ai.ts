// Shared AI client: Google Gemini through its OpenAI-compatible endpoint.
// Set the key once with: supabase secrets set GEMINI_API_KEY=...
// To switch providers later, change these three values (and the model names).

export const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export const AI_MODELS = {
  /** Structured tasks such as profile-photo moderation. Override with the GEMINI_MODEL secret. */
  fast: Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash",
} as const;

/**
 * Google retires model names over time (gemini-2.5-flash broke photo uploads).
 * When the configured model is gone, ask the API which models exist and use the newest "flash".
 */
export async function latestFlashModel(): Promise<string | null> {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/models", { headers: aiHeaders() });
    if (!res.ok) return null;
    const ids: string[] = ((await res.json())?.data ?? []).map((m: { id: string }) => m.id.replace(/^models\//, ""));
    const flash = ids.filter((id) => /^gemini-[\d.]+-flash$/.test(id));
    flash.sort((a, b) => parseFloat(b.split("-")[1]) - parseFloat(a.split("-")[1]));
    return flash[0] ?? null;
  } catch {
    return null;
  }
}

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
