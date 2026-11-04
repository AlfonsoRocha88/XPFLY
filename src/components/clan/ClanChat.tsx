import { useEffect, useRef, useState } from "react";
import { ArrowUp, Flame, LogIn, LogOut, MessageSquare, Send, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useClanActivity, useClanMessages, type ClanActivity, type ClanMessage } from "@/hooks/useClans";
import { timeAgo } from "./timeAgo";
import { avatarSrc } from "@/lib/avatars";

function activityText(a: ClanActivity): { Icon: any; line: string; tone: string } {
  const name = a.profile?.display_name || a.profile?.username || "Un héroe";
  switch (a.type) {
    case "joined":
      return { Icon: LogIn, line: `${name} se unió al clan`, tone: "text-emerald-300" };
    case "left":
      return { Icon: LogOut, line: `${name} dejó el clan`, tone: "text-muted-foreground" };
    case "leveled_up":
      return { Icon: ArrowUp, line: `${name} subió a Nv. ${a.data?.level ?? "?"}`, tone: "text-primary" };
    case "streak":
      return { Icon: Flame, line: `${name} alcanzó racha de ${a.data?.days ?? "?"} días`, tone: "text-amber-300" };
    case "promoted":
      return { Icon: Trophy, line: `${name} fue ascendido`, tone: "text-yellow-300" };
    case "demoted":
      return { Icon: ArrowUp, line: `${name} fue degradado`, tone: "text-muted-foreground" };
    default:
      return { Icon: MessageSquare, line: `${name} · ${a.type}`, tone: "text-muted-foreground" };
  }
}

type TimelineItem =
  | { kind: "msg"; id: string; ts: string; msg: ClanMessage }
  | { kind: "act"; id: string; ts: string; act: ClanActivity };

const ClanChat = ({ clanId }: { clanId: string }) => {
  const { user } = useAuth();
  const { messages, send } = useClanMessages(clanId);
  const { data: activities } = useClanActivity(clanId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const timeline: TimelineItem[] = (() => {
    const items: TimelineItem[] = [
      ...messages.map((m) => ({ kind: "msg" as const, id: `m:${m.id}`, ts: m.created_at, msg: m })),
      ...(activities ?? []).map((a) => ({ kind: "act" as const, id: `a:${a.id}`, ts: a.created_at, act: a })),
    ];
    items.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    return items;
  })();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activities?.length]);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      await send.mutateAsync(t);
    } catch (e: any) {
      setText(t);
      toast.error(e?.message ?? "No se pudo enviar");
    }
  };

  return (
    <div className="flex h-[360px] flex-col rounded-xl border border-border bg-card/60">
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {timeline.length === 0 && (
            <p className="py-10 text-center text-xs text-muted-foreground">Sin actividad aún. ¡Saluda a tu clan!</p>
          )}
          {timeline.map((it) => {
            if (it.kind === "act") {
              const t = activityText(it.act);
              const Icon = t.Icon;
              return (
                <div key={it.id} className="flex items-center justify-center">
                  <div className={`inline-flex max-w-[90%] items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1 text-[11px] ${t.tone}`}>
                    <Icon className="h-3 w-3" />
                    <span className="truncate">{t.line}</span>
                    <span className="text-xs text-muted-foreground">· {timeAgo(it.ts)}</span>
                  </div>
                </div>
              );
            }
            const m = it.msg;
            const mine = m.user_id === user?.id;
            const name = m.profile?.display_name || m.profile?.username || "Jugador";
            return (
              <div key={it.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border">
                  <AvatarImage src={avatarSrc(m.profile?.avatar_url, m.user_id)} />
                  <AvatarFallback className="text-xs">{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`flex items-baseline gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    <span className="text-[11px] font-semibold text-foreground">{mine ? "Tú" : name}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(m.created_at)}</span>
                  </div>
                  <div
                    className={`mt-0.5 rounded-2xl px-3 py-2 text-sm leading-snug ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex gap-2 border-t border-border p-2"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje…"
          maxLength={500}
          aria-label="Mensaje al clan"
          disabled={send.isPending}
        />
        <Button type="submit" size="icon" disabled={send.isPending || !text.trim()} aria-label="Enviar mensaje">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ClanChat;