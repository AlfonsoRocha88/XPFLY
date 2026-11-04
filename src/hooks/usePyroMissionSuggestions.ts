import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PyroSuggestion {
  title: string;
  description?: string;
  area: "work" | "study" | "health" | "creative" | "home" | "money" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  estimated_minutes: number;
  pyro_hook: string;
}

export function usePyroMissionSuggestions() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PyroSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hunger, setHunger] = useState<string | null>(null);

  const generate = useCallback(async (opts?: { count?: number; hint?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("pyro-generate-missions", {
        body: { count: opts?.count ?? 4, hint: opts?.hint ?? "" },
      });
      if (error) throw error;
      const list = Array.isArray((data as any)?.missions) ? (data as any).missions as PyroSuggestion[] : [];
      setSuggestions(list);
      setHunger((data as any)?.hunger ?? null);
      return list;
    } catch (e: any) {
      const msg = e?.message ?? "No se pudieron generar misiones.";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  const removeAt = useCallback((idx: number) => {
    setSuggestions((s) => s.filter((_, i) => i !== idx));
  }, []);

  return { loading, suggestions, error, hunger, generate, clear, removeAt };
}