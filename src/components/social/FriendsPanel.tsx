import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Check, Copy, MoreHorizontal, QrCode as QrIcon, RefreshCw, ScanLine, Search, Share2, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useFriends, type FriendProfilePreview, type Friendship } from "@/hooks/useFriends";
import { useProfile } from "@/hooks/useProfile";
import { getCurrentLeague, leagueLabel } from "@/lib/leagues";
import { avatarSrc } from "@/lib/avatars";
import { inviteLink, parseInvite, whatsappLink } from "@/lib/friendInvite";
import { playSfx } from "@/lib/sfx";
import { LeagueEmblem } from "@/components/leagues/LeagueEmblem";
import { StreakComet } from "@/components/icons/StreakComet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { QrCode } from "./QrCode";
import { QrScanner } from "./QrScanner";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const WhatsAppGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);

/**
 * Who goes on the podium, in what order. Receives your accepted friends' profiles and returns them
 * best first; the top three get the podium, the rest the list below.
 */
export function rankFriends(list: FriendProfilePreview[]): FriendProfilePreview[] {
  // TODO(human): choose what "best" means for the friends podium.
  return [...list].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
}

const nameOf = (p?: FriendProfilePreview | null) => p?.display_name || p?.username || "Usuario";

function Avatar({ p, size, ring = true }: { p?: FriendProfilePreview | null; size: number; ring?: boolean }) {
  const lg = getCurrentLeague(p?.trophies || 0);
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {ring && <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-fuchsia-400 to-sky-400 p-[2px]" aria-hidden />}
      <img src={avatarSrc(p?.avatar_url, p?.user_id)} alt="" className="relative rounded-full bg-muted object-cover ring-2 ring-background" style={{ width: size - 4, height: size - 4 }} />
      <span className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
        <LeagueEmblem family={lg.family} division={lg.divisionNumber} size={Math.max(14, size * 0.32)} animated={false} />
      </span>
    </span>
  );
}

export default function FriendsPanel() {
  const { profile } = useProfile();
  const { friends, pendingRequests, searchUser, sendRequest, respondRequest, removeFriend, inviteKey, resetInviteKey, acceptInvite } = useFriends();
  const reduce = useReducedMotion();
  const [qrOpen, setQrOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<FriendProfilePreview | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const code = profile?.friend_code ?? "";
  const link = code && inviteKey ? inviteLink(code, inviteKey) : "";

  const ranked = useMemo(() => {
    const profiles = friends.map((f) => f.friend_profile).filter((p): p is FriendProfilePreview => !!p);
    return rankFriends(profiles);
  }, [friends]);
  const byUser = useMemo(() => new Map(friends.map((f) => [f.friend_profile?.user_id, f])), [friends]);

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    toast.success("Link copiado");
  };
  const share = async () => {
    if (!link) return;
    if (navigator.share) await navigator.share({ title: "Constela", text: "Sé mi amigo en Constela ✨", url: link }).catch(() => undefined);
    else copyLink();
  };

  const onScan = useCallback(async (text: string) => {
    setScanOpen(false);
    const inv = parseInvite(text);
    if (!inv) { toast.error("Ese QR no es una invitación de Constela"); return; }
    try {
      const r = await acceptInvite.mutateAsync(inv);
      if (r.status === "added") { playSfx("achievement"); toast.success(`¡Ahora eres amigo de ${r.name}!`); }
      else if (r.status === "already") toast(`Ya eres amigo de ${r.name}`);
      else if (r.status === "self") toast("Ese es tu propio QR 🙂");
      else toast.error("Invitación vencida. Pídele un QR nuevo.");
    } catch { toast.error("No se pudo agregar"); }
  }, [acceptInvite]);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearchError(null); setFound(null);
    try {
      const r = await searchUser(q);
      if (r) setFound(r); else setSearchError("No encontré a nadie con ese código o usuario.");
    } catch (e) { setSearchError((e as Error).message || "Error en la búsqueda"); }
  };
  const request = async () => {
    if (!found) return;
    try {
      await sendRequest.mutateAsync(found.user_id);
      toast.success("Solicitud enviada");
      setFound(null); setQuery("");
    } catch (e) { toast.error((e as Error).message || "No se pudo enviar"); }
  };

  const remove = (p: FriendProfilePreview) => {
    const f = byUser.get(p.user_id);
    if (f) removeFriend.mutate(f.id, { onSuccess: () => toast(`${nameOf(p)} ya no está en tu lista`) });
  };

  const podium = ranked.slice(0, 3);

  return (
    <div className="space-y-4 pb-6">
      {/* Invite hero: the fastest way in is a link, sent or scanned */}
      <section className="surface relative overflow-hidden p-4">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-sky-400/20 blur-3xl" aria-hidden />
        <p className="relative font-serif text-xl">Suma estrellas a tu constelación</p>
        <p className="relative mt-0.5 text-sm text-muted-foreground">Con el link o el QR se agregan al instante, sin solicitudes.</p>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <a
            href={link ? whatsappLink(link, profile?.display_name) : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!link}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#25D366] px-2 py-3 text-xs font-semibold text-white shadow-[0_6px_20px_-8px_#25D366] transition-transform active:scale-95 aria-disabled:opacity-50"
          >
            <WhatsAppGlyph className="h-6 w-6" /> WhatsApp
          </a>
          <button onClick={() => setQrOpen(true)} className="flex flex-col items-center gap-1.5 rounded-2xl bg-primary px-2 py-3 text-xs font-semibold text-primary-foreground shadow-[0_6px_20px_-8px_hsl(var(--primary))] transition-transform active:scale-95">
            <QrIcon className="h-6 w-6" /> Mi QR
          </button>
          <button onClick={() => setScanOpen(true)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card/60 px-2 py-3 text-xs font-semibold transition-transform active:scale-95">
            <ScanLine className="h-6 w-6" /> Escanear
          </button>
        </div>
        <button onClick={() => setSearchOpen((v) => !v)} className="relative mt-3 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Search className="h-3.5 w-3.5" /> Buscar por código o usuario
        </button>
        <AnimatePresence initial={false}>
          {searchOpen && (
            <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }} className="relative overflow-hidden">
              <div className="flex gap-2 pt-3">
                <Input placeholder="ABCD1234 o @usuario" value={query} onChange={(e) => { setQuery(e.target.value); setFound(null); setSearchError(null); }} onKeyDown={(e) => e.key === "Enter" && search()} className="text-sm" />
                <Button size="sm" onClick={search} disabled={!query.trim()}><Search className="h-4 w-4" /></Button>
              </div>
              {searchError && <p className="pt-2 text-xs text-destructive">{searchError}</p>}
              {found && (
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-2.5">
                  <Avatar p={found} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{nameOf(found)}</p>
                    <p className="truncate text-xs text-muted-foreground">@{found.username || "—"} · Nv.{found.level}</p>
                  </div>
                  <Button size="sm" onClick={request} disabled={sendRequest.isPending}><UserPlus className="mr-1 h-4 w-4" />Agregar</Button>
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </section>

      {/* Requests that came by code/username */}
      <AnimatePresence initial={false}>
        {pendingRequests.map((req: Friendship) => (
          <m.div
            key={req.id}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
            className="surface flex items-center gap-3 border-primary/40 p-3"
          >
            <Avatar p={req.friend_profile} size={42} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{nameOf(req.friend_profile)}</p>
              <p className="text-xs text-muted-foreground">Quiere ser tu amigo · Nv.{req.friend_profile?.level || 1}</p>
            </div>
            <Button size="icon" className="h-9 w-9 rounded-full" aria-label="Aceptar" onClick={() => { playSfx("complete"); respondRequest.mutate({ friendshipId: req.id, accept: true }); }}><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full text-muted-foreground" aria-label="Rechazar" onClick={() => respondRequest.mutate({ friendshipId: req.id, accept: false })}><X className="h-4 w-4" /></Button>
          </m.div>
        ))}
      </AnimatePresence>

      {ranked.length === 0 ? (
        /* Empty: a little constellation waiting for its stars */
        <section className="surface flex flex-col items-center px-6 py-8 text-center">
          <svg viewBox="0 0 160 90" className="h-24 w-44 text-primary" aria-hidden>
            <path d="M20 60 L60 25 L100 50 L140 20" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 4" />
            {[[20, 60], [60, 25], [100, 50], [140, 20]].map(([x, y], i) => (
              <g key={i} className="friend-float" style={{ animationDelay: `${i * -0.8}s` }}>
                <circle cx={x} cy={y} r={i === 0 ? 7 : 5} fill={i === 0 ? "currentColor" : "none"} stroke="currentColor" strokeOpacity={i === 0 ? 1 : 0.5} strokeDasharray={i === 0 ? undefined : "2 2"} />
              </g>
            ))}
          </svg>
          <p className="mt-3 font-medium">Tu constelación está esperando</p>
          <p className="mt-1 text-sm text-muted-foreground">Invita a alguien por WhatsApp: con un toque ya son amigos.</p>
        </section>
      ) : (
        <>
          {/* Podium */}
          <section className="surface relative overflow-hidden px-3 pb-4 pt-5">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tu constelación · {ranked.length}</p>
            <div className="flex items-end justify-center gap-3">
              {[podium[1], podium[0], podium[2]].map((p, slot) => {
                if (!p) return <span key={slot} className="w-24" />;
                const first = slot === 1;
                return (
                  <m.div
                    key={p.user_id}
                    className="flex w-24 flex-col items-center text-center"
                    initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.5, ease: EASE_OUT, delay: first ? 0.05 : 0.18 }}
                  >
                    <div className={first ? "friend-float" : undefined}><Avatar p={p} size={first ? 72 : 56} /></div>
                    <p className="mt-2 w-full truncate text-sm font-medium">{nameOf(p)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><StreakComet streak={p.daily_streak || 0} size={16} />{p.daily_streak || 0}</p>
                    <div className={`mt-2 grid w-full place-items-center rounded-t-xl bg-gradient-to-b ${first ? "h-14 from-amber-300/40" : slot === 0 ? "h-10 from-slate-300/30" : "h-8 from-orange-400/25"} to-transparent font-serif text-lg`}>
                      {first ? 1 : slot === 0 ? 2 : 3}
                    </div>
                  </m.div>
                );
              })}
            </div>
          </section>

          {/* Full ranking */}
          <ul className="space-y-2">
            {ranked.map((p, i) => (
              <m.li
                key={p.user_id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT, delay: Math.min(i, 8) * 0.04 }}
                className="surface flex items-center gap-3 p-3"
              >
                <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <Avatar p={p} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{nameOf(p)}</p>
                  <p className="truncate text-xs text-muted-foreground">Nv.{p.level || 1} · {leagueLabel(getCurrentLeague(p.trophies || 0))}</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium tabular-nums"><StreakComet streak={p.daily_streak || 0} size={20} />{p.daily_streak || 0}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-muted-foreground" aria-label={`Opciones de ${nameOf(p)}`}><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onClick={() => remove(p)}><UserMinus className="mr-2 h-4 w-4" />Quitar amigo</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </m.li>
            ))}
          </ul>
          {ranked.length < 3 && (
            <p className="text-center text-xs text-muted-foreground">Invita a más amigos para completar el podio.</p>
          )}
        </>
      )}

      {/* My QR */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogTitle>Tu QR de amigo</DialogTitle>
          <DialogDescription>Que lo escaneen con Constela o con la cámara del celular.</DialogDescription>
          <div className="mx-auto mt-2 rounded-3xl bg-white p-3 shadow-[0_10px_40px_-12px_hsl(var(--primary))]">
            {link ? <QrCode value={link} size={220} /> : <div className="h-[220px] w-[220px] animate-pulse rounded-2xl bg-muted" />}
          </div>
          <p className="mt-1 font-mono text-sm tracking-widest text-muted-foreground">{code}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copyLink} disabled={!link}>{copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}Copiar link</Button>
            <Button onClick={share} disabled={!link}><Share2 className="mr-1.5 h-4 w-4" />Compartir</Button>
          </div>
          <button
            className="mx-auto mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => resetInviteKey.mutate(undefined, { onSuccess: () => toast("Nuevo QR: los links anteriores ya no sirven") })}
          >
            <RefreshCw className="h-3 w-3" /> Generar uno nuevo
          </button>
        </DialogContent>
      </Dialog>

      <QrScanner open={scanOpen} onOpenChange={setScanOpen} onResult={onScan} />
    </div>
  );
}
