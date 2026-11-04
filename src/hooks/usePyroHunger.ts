import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { pyroSay, pyroFeed, usePyroFeedBus } from "./usePyro";
import {
  HUNGER_ALERT_LINE,
  HUNGER_DYING_LINE,
  HUNGER_CRITICAL_LINE,
  REVIVAL_LINE,
} from "@/lib/pyro-dialogue";

export type HungerState = "ok" | "alert" | "dying" | "critical";

const SESSION_FLAG_KEY = "pyro_hunger_announced_session";

/** Derive hunger state from the canonical DB value, not from local UI state. */
function deriveHungerState(lastIso: string | null | undefined): HungerState {
  if (!lastIso) return "ok"; // never completed → treat as fed
  const hours = (Date.now() - new Date(lastIso).getTime()) / 36e5;
  if (hours >= 72) return "critical";
  if (hours >= 48) return "dying";
  if (hours >= 24) return "alert";
  return "ok";
}

/**
 * Phase 3 — hunger system.
 * State is ALWAYS derived from `profile.last_mission_completed_at`, which is
 * the server-authoritative timestamp written by the `award-xp` edge function.
 * This avoids divergence between hook instances and prevents the "fills then
 * resets" flicker that happened when local state was overwritten by a stale
 * pyro-decay response. On mount we still call pyro-decay so the daily
 * XP/trophy penalty can be applied — but its returned `state` is no longer
 * trusted for the UI bar.
 */
export function usePyroHunger() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const lastMissionAt = (profile as any)?.last_mission_completed_at as string | null | undefined;

  const state: HungerState = deriveHungerState(lastMissionAt);
  const [revivalTick, setRevivalTick] = useState(0);
  const prevStateRef = useRef<HungerState | null>(null);

  // Apply daily decay (XP/trophies) — fire-and-forget; do not use the
  // returned `state` for the UI, which is now derived from the profile.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        await supabase.functions.invoke("pyro-decay", { body: {} });
        if (cancelled) return;
      } catch (e) {
        console.error("pyro-decay invocation failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Announce escalations once per session whenever the derived state changes.
  useEffect(() => {
    if (!user) return;
    const announced = sessionStorage.getItem(SESSION_FLAG_KEY);
    if (announced !== state && state !== "ok") {
      sessionStorage.setItem(SESSION_FLAG_KEY, state);
      if (state === "alert") pyroSay(HUNGER_ALERT_LINE, "alert");
      else if (state === "dying") pyroSay(HUNGER_DYING_LINE, "dying");
      else if (state === "critical") pyroSay(HUNGER_CRITICAL_LINE, "dying");
    }
    if (state === "ok") {
      // Reset the announce flag so the next escalation fires again.
      sessionStorage.removeItem(SESSION_FLAG_KEY);
    }
    prevStateRef.current = state;
  }, [user, state]);

  // On feed: profile cache is refreshed by addXp.onSuccess, which causes
  // `state` to recompute from the freshly-written last_mission_completed_at.
  // Here we only handle the revival animation/dialogue when transitioning
  // out of a starving state.
  usePyroFeedBus(() => {
    if (!user) return;
    const wasStarving = prevStateRef.current === "dying" || prevStateRef.current === "critical";
    if (wasStarving) {
      setRevivalTick((t) => t + 1);
      window.setTimeout(() => {
        pyroSay(REVIVAL_LINE, "revival");
      }, 1300);
    }
  });

  return { state, revivalTick };
}

// Re-export so consumers can both read and trigger from one place
export { pyroFeed };