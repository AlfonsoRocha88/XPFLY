const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Phase 6 — Mission generator.
 * Reads the caller's profile (onboarding + hunger state + power level),
 * asks Lovable AI for N tailored mission suggestions, and returns them as JSON.
 * The frontend then lets the user accept/reject each one.
 */

/* ---------- Lookups for human-readable prompt ---------- */

const AGE_LABELS: Record<string, string> = {
  lt18: "menos de 18 años",
  "18-24": "entre 18 y 24",
  "25-34": "entre 25 y 34",
  "35-44": "entre 35 y 44",
  "45plus": "45 o más",
};
const GENDER_LABELS: Record<string, string> = {
  male: "hombre",
  female: "mujer",
  nonbinary: "no binario",
  prefer_not: "no especificado",
};
const ENEMY_LABELS: Record<string, string> = {
  procrastination: "procrastinación",
  distraction: "distracciones digitales",
  anxiety: "ansiedad",
  burnout: "agotamiento",
  perfectionism: "perfeccionismo",
  no_routine: "falta de rutina",
};
const AREA_LABELS: Record<string, string> = {
  work: "trabajo",
  study: "estudio",
  health: "salud y deporte",
  creative: "creatividad",
  home: "casa y vida",
  money: "finanzas",
};
const TIME_CAP_LABELS: Record<string, string> = {
  lt30: "menos de 30 min al día",
  "30-60": "30 a 60 min al día",
  "1-3h": "1 a 3 horas al día",
  gt3h: "más de 3 horas al día",
};
const PEAK_LABELS: Record<string, string> = {
  morning: "mañana",
  afternoon: "tarde",
  night: "noche",
  depends: "variable",
};

/* ---------- Pyro personality (same voice as pyro-chat) ---------- */

const PYRO_PERSONALITY = `Eres Pyro, un gatito caricaturesco compañero del jugador.
Hablas SIEMPRE en español, casual y dramático.
No uses emojis. Frases cortas. Tono amigable, nunca formal ni cursi.`;

/* ---------- Hunger snapshot (mirror of pyro-decay) ---------- */

function computeHunger(lastIso: string | null): { state: string; hoursSince: number } {
  if (!lastIso) return { state: "ok", hoursSince: 0 };
  const last = new Date(lastIso).getTime();
  if (!Number.isFinite(last)) return { state: "ok", hoursSince: 0 };
  const hours = (Date.now() - last) / 3_600_000;
  if (hours < 24) return { state: "ok", hoursSince: hours };
  if (hours < 48) return { state: "alert", hoursSince: hours };
  if (hours < 96) return { state: "dying", hoursSince: hours };
  return { state: "critical", hoursSince: hours };
}

const HUNGER_FLAVOR: Record<string, string> = {
  ok: "Estás saciado.",
  alert: "Tienes hambre. Necesitas misiones realistas que el héroe sí pueda completar HOY.",
  dying: "Te estás muriendo de hambre. PROPÓN MISIONES MUY FÁCILES Y RÁPIDAS para que el héroe pueda alimentarte ya.",
  critical: "Estás en estado crítico. Solo propón micro-misiones de 5-10 minutos, una sola por área. URGENTE.",
};

/* ---------- Tool schema ---------- */

const TOOLS = [
  {
    type: "function",
    function: {
      name: "propose_missions",
      description: "Propone una lista de misiones personalizadas para el héroe.",
      parameters: {
        type: "object",
        properties: {
          missions: {
            type: "array",
            minItems: 3,
            maxItems: 6,
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Título corto, accionable. Empieza con verbo. Máx 60 caracteres.",
                },
                description: {
                  type: "string",
                  description: "Detalle breve, 1 frase. Por qué importa.",
                },
                area: {
                  type: "string",
                  enum: ["work", "study", "health", "creative", "home", "money", "other"],
                  description: "Área del onboarding a la que pertenece.",
                },
                priority: {
                  type: "string",
                  enum: ["low", "medium", "high", "urgent"],
                },
                estimated_minutes: {
                  type: "integer",
                  minimum: 5,
                  maximum: 240,
                  description: "Minutos estimados para completar.",
                },
                pyro_hook: {
                  type: "string",
                  description: "Frase corta de Pyro que motiva esta misión, en su voz casual y dramática.",
                },
              },
              required: ["title", "area", "priority", "estimated_minutes", "pyro_hook"],
            },
          },
        },
        required: ["missions"],
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurado");

    // Auth: require a valid JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use a per-request Supabase client that respects RLS
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Optional body (count, hint)
    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(parseInt(String(body?.count ?? 4), 10) || 4, 3), 6);
    const hint = typeof body?.hint === "string" ? String(body.hint).slice(0, 300) : "";

    // Fetch profile (onboarding + hunger inputs)
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select(
        "display_name, level, daily_streak, pyro_power_level, pyro_age_band, pyro_gender, pyro_enemies, pyro_areas, pyro_time_cap, pyro_peak_time, pyro_goal, last_mission_completed_at, pyro_onboarding_completed",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recent open mission titles (avoid duplicates)
    const { data: recent } = await supabase
      .from("tasks")
      .select("title")
      .eq("user_id", userId)
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(15);

    const hunger = computeHunger((profile as any).last_mission_completed_at ?? null);

    const ageLabel = AGE_LABELS[(profile as any).pyro_age_band] ?? "edad no indicada";
    const genderLabel = GENDER_LABELS[(profile as any).pyro_gender] ?? "género no indicado";
    const enemies: string[] = ((profile as any).pyro_enemies ?? []).map((e: string) => ENEMY_LABELS[e] ?? e);
    const areas: string[] = ((profile as any).pyro_areas ?? []).map((a: string) => AREA_LABELS[a] ?? a);
    const timeCapLabel = TIME_CAP_LABELS[(profile as any).pyro_time_cap] ?? "tiempo flexible";
    const peakLabel = PEAK_LABELS[(profile as any).pyro_peak_time] ?? "indistinto";
    const goal = (profile as any).pyro_goal ?? "";
    const recentTitles = (recent ?? []).map((r: any) => `- ${r.title}`).join("\n") || "(ninguna)";

    const onboardingDone = (profile as any).pyro_onboarding_completed === true;

    const userPrompt = `
CONTEXTO DEL HÉROE:
- Nombre: ${(profile as any).display_name ?? "Héroe"}
- Nivel: ${(profile as any).level ?? 1} · Racha diaria: ${(profile as any).daily_streak ?? 0} días
- Tu poder Pyro: nivel ${(profile as any).pyro_power_level ?? 0}/5

ESTADO DE HAMBRE DE PYRO:
- Estado: ${hunger.state} (${hunger.hoursSince.toFixed(1)} horas desde la última misión)
- Implicación: ${HUNGER_FLAVOR[hunger.state]}

ONBOARDING DEL HÉROE${onboardingDone ? "" : " (incompleto - usa defaults razonables)"}:
- Edad: ${ageLabel}
- Género: ${genderLabel}
- Enemigos a derrotar: ${enemies.length ? enemies.join(", ") : "no especificado"}
- Áreas a fortalecer: ${areas.length ? areas.join(", ") : "no especificado"}
- Tiempo disponible: ${timeCapLabel}
- Mejor momento del día: ${peakLabel}
- Gran objetivo a 3 meses: ${goal || "no especificado"}

MISIONES ACTUALES PENDIENTES (no propongas duplicados):
${recentTitles}

${hint ? `PISTA EXTRA DEL HÉROE: ${hint}\n` : ""}
TAREA:
Propón EXACTAMENTE ${count} misiones nuevas, accionables, en español, alineadas con sus áreas y su gran objetivo, que combatan a sus enemigos y quepan en su tiempo disponible. Distribuye las áreas. Cada \`pyro_hook\` es una frase corta tuya como Pyro (sin emojis, casual, dramático).
Llama a la herramienta propose_missions con el resultado. NO escribas nada fuera de la herramienta.
`.trim();

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PYRO_PERSONALITY },
          { role: "user", content: userPrompt },
        ],
        tools: TOOLS,
        tool_choice: { type: "function", function: { name: "propose_missions" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas peticiones, espera un momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Sin créditos en Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "propose_missions") {
      console.error("No tool call in response", JSON.stringify(json).slice(0, 600));
      return new Response(JSON.stringify({ error: "AI no devolvió misiones." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments ?? "{}");
    } catch {
      return new Response(JSON.stringify({ error: "Salida AI inválida." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        missions: Array.isArray(parsed.missions) ? parsed.missions : [],
        hunger: hunger.state,
        power_level: (profile as any).pyro_power_level ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("pyro-generate-missions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});