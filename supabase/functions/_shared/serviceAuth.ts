// Checks that a request comes from a trusted server-side caller (pg_cron / pg_net through
// Vault, or another edge function). Accepts the token from `Authorization: Bearer …` or `apikey`.
//
// A plain string comparison against SUPABASE_SERVICE_ROLE_KEY is not enough: the key stored in
// Vault can be a different, equally valid secret (the legacy service_role JWT vs. a new
// `sb_secret_…` key, or a rotated one). So when it doesn't match exactly, ask Supabase Auth
// whether the token is a secret key: only secret / service_role keys can call the admin API.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/** Results per token for this isolate, so each cron tick doesn't re-check with Auth. */
const verdicts = new Map<string, boolean>();

function knownSecretKeys(): string[] {
  const keys = [SERVICE_KEY];
  // Newer runtimes expose the project's secret keys as a JSON object { name: key }.
  try {
    const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (raw) keys.push(...Object.values(JSON.parse(raw) as Record<string, string>));
  } catch { /* not set or not JSON */ }
  return keys.filter(Boolean);
}

function tokenOf(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return bearer || (req.headers.get("apikey") || "").trim();
}

export async function isServiceCaller(req: Request): Promise<boolean> {
  const token = tokenOf(req);
  if (!token) return false;
  if (knownSecretKeys().includes(token)) return true;

  const cached = verdicts.get(token);
  if (cached !== undefined) return cached;

  let ok = false;
  try {
    const headers: Record<string, string> = { apikey: token };
    // New `sb_secret_…` keys go in `apikey` only; legacy JWT keys also go in Authorization.
    if (!token.startsWith("sb_")) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, { headers });
    ok = res.ok;
    await res.body?.cancel();
  } catch (e) {
    console.error("isServiceCaller: auth check failed", e);
    return false; // don't cache network errors
  }
  if (!ok) console.warn("isServiceCaller: rejected a token that is not a service/secret key");
  if (verdicts.size > 50) verdicts.clear();
  verdicts.set(token, ok);
  return ok;
}
