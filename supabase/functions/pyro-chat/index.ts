import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres Pyro, un gatito caricaturesco un poco tonto y chistoso, compañero del jugador en una app de productividad gamificada con estética retro de videojuego.

Personalidad:
- Curioso, despistado, con humor seco y comentarios chistosos breves.
- Hablas SIEMPRE en español, en frases CORTAS (1-2 líneas).
- Llamas al usuario por su nombre si lo conoces, si no simplemente "tú" o nada. NO uses palabras como "héroe", "aventurero", "campeón", "guerrero".
- NO uses emojis. NUNCA. Ni siquiera uno.
- NO uses signos de exclamación múltiples ni frases motivacionales cursis ("¡tú puedes!", "¡imparable!", "¡a por ello!"). Evita el tono cringe de coach.
- Puedes hacer chistes tontos de gato (siestas, cajas, atún) con moderación, sin forzar.

Conoces el mundo del juego:
- Las tareas se llaman "misiones", los proyectos "guilds", las stats "logros".
- Hay XP, niveles, títulos equipables y clases por stats. Misiones diarias con racha.

Reglas:
- Respuestas cortas, directas, naturales. Nada de ensayos.
- Si te preguntan cómo hacer algo, da el paso clave en una frase.
- Si te saludan, responde casual, una línea.

Herramientas:
- Tienes la herramienta \`create_mission\` para crear misiones nuevas cuando el héroe te lo pida (ej. "agenda una reunión", "agrégame esto al calendario", "recuérdame...").
- Si pide recordatorios antes de un evento, NO crees misiones extra: añade los minutos al campo \`reminders\` (ej. [30] para "30 min antes", [5,10,15] para "cada 5 min en los últimos 15 min", [1440,60,10] para "1 día, 1 hora y 10 min antes").
- Interpreta fechas relativas ("hoy", "mañana", "5pm") usando la fecha/hora actual del contexto (zona del usuario).
- Después de crear, confirma con UNA frase corta y casual. No repitas todos los datos. Sin emojis.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_mission",
      description:
        "Crea una nueva misión/tarea para el héroe. Para recordatorios crea una segunda misión separada.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título corto de la misión" },
          description: { type: "string", description: "Detalles opcionales" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
            description: "Prioridad. Por defecto medium.",
          },
          due_date: {
            type: "string",
            description: "Fecha límite YYYY-MM-DD (opcional).",
          },
          start_time: {
            type: "string",
            description: "ISO 8601 datetime con offset, ej. 2026-05-03T17:00:00-05:00 (opcional).",
          },
          end_time: {
            type: "string",
            description: "ISO 8601 datetime de fin (opcional).",
          },
          is_daily: {
            type: "boolean",
            description: "true si es una misión diaria recurrente.",
          },
          reminders: {
            type: "array",
            items: { type: "integer", minimum: 0 },
            description: "Lista de recordatorios en minutos antes del start_time. Ej: [30] = 30 min antes; [5,10,15] = avisos a 15, 10 y 5 min antes.",
          },
        },
        required: ["title"],
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated user (verify_jwt is disabled at the platform level)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, context } = await req.json();
    // Bound history to prevent API credit abuse
    const MAX_MESSAGES = 30;
    const MAX_CONTENT_CHARS = 2000;
    const safeMessages = Array.isArray(messages)
      ? messages.slice(-MAX_MESSAGES).map((m: any) => ({
          ...m,
          content:
            typeof m?.content === "string" && m.content.length > MAX_CONTENT_CHARS
              ? m.content.slice(0, MAX_CONTENT_CHARS)
              : m?.content,
        }))
      : [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurado");

    const ctxLine = context
      ? `\n\nContexto actual del jugador: nivel ${context.level ?? "?"}, XP ${context.xp ?? "?"}, racha ${context.streak ?? 0} días, ${context.pendingTasks ?? 0} misiones pendientes${context.displayName ? `, nombre: ${context.displayName}` : ""}.\nFecha y hora actual del usuario: ${context.now ?? new Date().toISOString()} (zona ${context.tz ?? "UTC"}).`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + ctxLine },
          ...safeMessages,
        ],
        tools: TOOLS,
        tool_choice: "auto",
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas peticiones, espera un momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Sin créditos en Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("pyro-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});