import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import PyroSprite from "./PyroSprite";
import { usePyroHunger } from "@/hooks/usePyroHunger";
import { ChatMsg, useLocalState, PYRO_KEYS } from "@/hooks/usePyro";
import { useProfile } from "@/hooks/useProfile";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { PYRO_TIERS } from "@/lib/pyro-progression";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pyro-chat`;

type Props = { onClose: () => void };

export default function PyroChat({ onClose }: Props) {
  const [messages, setMessages] = useLocalState<ChatMsg[]>(PYRO_KEYS.HIST_KEY, []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { profile } = useProfile();
  const { tasks } = useTasks();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { state: hungerState } = usePyroHunger();

  // Header bars (compact) — derived like PyroStatusWidget
  const powerLevel: number = profile?.pyro_power_level ?? 0;
  const totalFed: number = profile?.missions_completed_total ?? 0;
  const nextTier = PYRO_TIERS.find((t) => t.threshold > totalFed) ?? null;
  const prevThreshold = [...PYRO_TIERS].reverse().find((t) => totalFed >= t.threshold)?.threshold ?? 0;
  const denom = nextTier ? Math.max(1, nextTier.threshold - prevThreshold) : 1;
  const num = nextTier ? Math.max(0, Math.min(denom, totalFed - prevThreshold)) : denom;
  const pwrPct = Math.round((num / denom) * 100);
  // Hunger bar percentage: 4 segments × 5h, empties at 20h, refill on mission complete.
  const lastMissionAt: string | null | undefined = profile?.last_mission_completed_at;
  const hoursSinceMission = lastMissionAt
    ? (Date.now() - new Date(lastMissionAt).getTime()) / 36e5
    : 0;
  const hungerSegments = Math.max(0, Math.min(4, 4 - Math.floor(hoursSinceMission / 5)));
  const hungerPct = Math.round((hungerSegments / 4) * 100);
  const hungerColor =
    hungerState === "critical" ? "from-red-500 to-red-400"
    : hungerState === "dying" ? "from-orange-500 to-orange-400"
    : hungerState === "alert" ? "from-yellow-500 to-yellow-400"
    : "from-emerald-500 to-emerald-400";

  const createMission = async (args: any): Promise<string> => {
    if (!user) return "⚠ Sin sesión";
    try {
      const insert: any = {
        user_id: user.id,
        title: args.title,
        description: args.description ?? null,
        priority: args.priority ?? "medium",
        status: "todo",
        is_daily: !!args.is_daily,
      };
      if (args.due_date) insert.due_date = args.due_date;
      if (args.start_time) insert.start_time = args.start_time;
      if (args.end_time) insert.end_time = args.end_time;
      if (Array.isArray(args.reminders)) {
        insert.reminders = args.reminders
          .map((n: any) => parseInt(n))
          .filter((n: number) => Number.isFinite(n) && n >= 0);
      }
      const { error } = await supabase.from("tasks").insert(insert);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["daily-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      toast.success(`Misión creada: ${args.title}`);
      return `OK: misión "${args.title}" creada`;
    } catch (e: any) {
      console.error(e);
      return `ERROR: ${e?.message ?? "no se pudo crear"}`;
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages]);

  // Focus input on open; restore focus + Esc to close
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const streamOnce = async (history: ChatMsg[]): Promise<{ text: string; toolCalls: any[] }> => {
    let acc = "";
    const toolCalls: any[] = []; // [{id, name, args}]
    let assistantStarted = false;
    const upsert = (chunk: string) => {
      acc += chunk;
      if (!assistantStarted) {
        assistantStarted = true;
        setMessages((prev) => [...prev, { role: "assistant", content: acc }]);
      } else {
        setMessages((prev) =>
          prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m))
        );
      }
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("NO_SESSION");

    const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
        messages: history,
          context: {
            level: profile?.level,
            xp: profile?.xp,
            streak: profile?.daily_streak,
            displayName: profile?.display_name,
            pendingTasks: tasks.filter((t: any) => t.status !== "done").length,
          now: new Date().toISOString(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

    if (resp.status === 429) throw new Error("RATE_LIMIT");
    if (resp.status === 402) throw new Error("NO_CREDITS");
    if (!resp.ok || !resp.body) throw new Error("Stream failed");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let done = false;
    while (!done) {
      const { done: d, value } = await reader.read();
      if (d) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const j = line.slice(6).trim();
        if (j === "[DONE]") { done = true; break; }
        try {
          const parsed = JSON.parse(j);
          const delta = parsed.choices?.[0]?.delta;
          const content = delta?.content as string | undefined;
          if (content) upsert(content);
          const tcs = delta?.tool_calls as any[] | undefined;
          if (tcs) {
            for (const tc of tcs) {
              const idx = tc.index ?? 0;
              if (!toolCalls[idx]) toolCalls[idx] = { id: tc.id, name: "", argsRaw: "" };
              if (tc.id) toolCalls[idx].id = tc.id;
              if (tc.function?.name) toolCalls[idx].name = tc.function.name;
              if (tc.function?.arguments) toolCalls[idx].argsRaw += tc.function.arguments;
            }
          }
        } catch {
          buf = line + "\n" + buf;
          break;
        }
      }
    }
    return { text: acc, toolCalls };
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", content: text };
    let history: any[] = [...messages, userMsg].slice(-20);
    setMessages(history as ChatMsg[]);
    setLoading(true);

    try {
      for (let round = 0; round < 3; round++) {
        const { text: replyText, toolCalls } = await streamOnce(history);
        if (!toolCalls.length) break;

        // Build assistant message with tool_calls and append tool results
        const assistantMsg: any = {
          role: "assistant",
          content: replyText || "",
          tool_calls: toolCalls.map((t) => ({
            id: t.id,
            type: "function",
            function: { name: t.name, arguments: t.argsRaw || "{}" },
          })),
        };
        const toolMsgs: any[] = [];
        for (const t of toolCalls) {
          let args: any = {};
          try { args = JSON.parse(t.argsRaw || "{}"); } catch { /* ignore */ }
          let result = "ERROR: tool desconocida";
          if (t.name === "create_mission") result = await createMission(args);
          toolMsgs.push({ role: "tool", tool_call_id: t.id, content: result });
        }
        history = [...history, assistantMsg, ...toolMsgs];
        // Don't persist tool plumbing in UI history; just keep going
      }
    } catch (e: any) {
      console.error(e);
      if (e?.message === "RATE_LIMIT") toast.error("Demasiadas peticiones, espera un momento.");
      else if (e?.message === "NO_CREDITS") toast.error("Sin créditos en Lovable AI.");
      else toast.error("Pyro no pudo responder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-card animate-fade-in"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pyro-chat-title"
    >
      {/* Sticky header — never moves with keyboard */}
      <header
        className="flex shrink-0 items-center gap-3 border-b border-primary/30 bg-card/95 px-3 backdrop-blur-md"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)", paddingBottom: "0.5rem", minHeight: 72 }}
      >
        <PyroSprite size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div id="pyro-chat-title" className="font-pixel text-[11px] text-primary">Pyro</div>
            <div className="font-pixel text-[11px] text-muted-foreground truncate">
              Espíritu de Fuego
            </div>
          </div>
          {/* PWR */}
          <div className="mt-1 flex items-center gap-2">
            <span className="font-pixel text-[11px] text-muted-foreground w-7">PWR</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background/70">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                style={{ width: `${pwrPct}%` }}
              />
            </div>
            <span className="font-pixel text-xs text-primary tabular-nums">LV{powerLevel}</span>
          </div>
          {/* HP / hunger */}
          <div className="mt-1 flex items-center gap-2">
            <span className="font-pixel text-[11px] text-muted-foreground w-7">HP</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background/70">
              <div
                className={`h-full bg-gradient-to-r ${hungerColor} transition-all duration-500`}
                style={{ width: `${hungerPct}%` }}
              />
            </div>
            <span className="font-pixel text-xs text-muted-foreground tabular-nums">{hungerPct}%</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Cerrar chat de Pyro">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="font-pixel text-[11px] text-muted-foreground hover:text-foreground"
              aria-label="Borrar historial del chat"
            >
              LIMPIAR
            </button>
          )}
        </div>
      </header>

      {/* Scrollable message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3"
        role="log"
        aria-live="polite"
        aria-label="Mensajes de Pyro"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <PyroSprite size={64} />
            <div className="font-pixel text-xs text-muted-foreground">
              ¡Hola héroe!<br />Pregúntame lo que quieras 🔥
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.role === "user";
          return (
            <div key={i} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              {!mine && (
                <div className="shrink-0">
                  <PyroSprite size={28} />
                </div>
              )}
              <div
                className={
                  mine
                    ? "max-w-[78%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground shadow-sm"
                    : "max-w-[80%] rounded-2xl rounded-bl-md bg-secondary px-3 py-2 text-foreground shadow-sm border-l-2 border-primary/60"
                }
              >
                <div className="prose prose-sm prose-invert max-w-none text-[13px] leading-snug [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2">
            <PyroSprite size={28} />
            <div className="rounded-2xl rounded-bl-md bg-secondary px-3 py-2 text-xs text-muted-foreground flex items-center gap-2 border-l-2 border-primary/60">
              <Loader2 className="h-3 w-3 animate-spin" /> Pyro está pensando…
            </div>
          </div>
        )}
      </div>

      {/* Sticky input bar — keyboard-safe */}
      <div
        className="sticky bottom-0 shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-2 pt-2"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Escribe a Pyro…"
            className="min-h-10 h-10 max-h-32 resize-none rounded-full border-border bg-background px-4 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
            rows={1}
            disabled={loading}
            aria-label="Mensaje para Pyro"
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={send}
            disabled={loading || !input.trim()}
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}