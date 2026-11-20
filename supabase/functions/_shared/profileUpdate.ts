// Safe read-modify-write of a profile row from an edge function (service role).
//
// Rewards are computed from the row we read (coins + amount, xp + reward, chests - 1 …). Without a
// guard, two requests that overlap (double tap, award-xp racing open-chest, …) both read the same
// row and the second write silently undoes the first, or both pay out the same chest / daily bonus.
// The update only lands when `updated_at` is still the value we read; the
// update_profiles_updated_at trigger bumps it on every write, so any write in between makes ours
// match no row and we re-read and rebuild. No imports: keep it loadable from Deno and Vite alike.

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ProfileStep<R> =
  | { updates: Record<string, unknown>; result: R }
  | { error: string; status: number; extra?: Record<string, unknown> };

export type ProfileOutcome<R> =
  | { ok: true; profile: any; result: R }
  | { ok: false; error: string; status: number; extra?: Record<string, unknown> };

export async function mutateProfile<R>(
  admin: any,
  userId: string,
  build: (profile: any) => ProfileStep<R>,
  attempts = 5,
): Promise<ProfileOutcome<R>> {
  for (let i = 0; i < attempts; i++) {
    const { data: p, error } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) return { ok: false, error: error.message, status: 500 };
    if (!p) return { ok: false, error: "profile_not_found", status: 404 };

    const step = build(p);
    if ("error" in step) return { ok: false, ...step };

    const { data: updated, error: uErr } = await admin
      .from("profiles")
      .update(step.updates)
      .eq("user_id", userId)
      .eq("updated_at", p.updated_at)
      .select()
      .maybeSingle();
    if (uErr) return { ok: false, error: uErr.message, status: 500 };
    if (updated) return { ok: true, profile: updated, result: step.result };
    // Someone else wrote the row since we read it: read again and rebuild.
  }
  return { ok: false, error: "busy_retry", status: 409 };
}
