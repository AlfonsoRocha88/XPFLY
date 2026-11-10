import { useEffect, useMemo, useState } from "react";
import {
  Shield, X, Search, Plus, LogOut, Check, Bell, Users, Crown, Star, Award,
  ChevronLeft, Flame, Sparkles, MessageSquare, Target,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useMyClan, useClanSearch, useClanMutations, useClanJoinRequests,
  type Clan, type ClanMember,
} from "@/hooks/useClans";
import { canDo, CLAN_ROLE_LABEL, type ClanRole } from "@/lib/clan-roles";
import {
  DEFAULT_EMBLEM, EMBLEM_SHAPES, EMBLEM_PALETTE, EMBLEM_ICONS_BY_CATEGORY,
  type EmblemConfig, type EmblemIcon, type EmblemShape,
} from "@/lib/clan-emblem";
import { leagueTierRoman } from "@/lib/leagues";
import EmblemSVG from "@/components/clan/EmblemSVG";
import RoleBadge from "@/components/clan/RoleBadge";
import MedalIcon from "@/components/clan/MedalIcon";
import LeagueShield from "@/components/leagues/LeagueShield";
import ClanHeader, { ClanHeaderCompact } from "@/components/clan/ClanHeader";
import ClanWeeklyChallenge from "@/components/clan/ClanWeeklyChallenge";
import ClanChat from "@/components/clan/ClanChat";
import { avatarSrc } from "@/lib/avatars";
import { Flame as StreakFlame } from "@/components/icons/GameIcons";


/* ───────────────────────────── Member row ───────────────────────────── */

const MemberRow = ({ member, rank, onSelect }: { member: ClanMember; rank: number; onSelect: () => void }) => {
  const p = member.profile;
  const streak = p?.daily_streak ?? 0;
  const streakCls = streak >= 14 ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]"
    : streak >= 7 ? "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]"
    : "text-muted-foreground";
  const tier = leagueTierRoman(p?.current_league_id ?? null);
  const leagueName = (p?.current_league_id ?? "mortal-3").split("-")[0];
  return (
    <button
      onClick={onSelect}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card/70 p-3 text-left transition-all hover:border-primary/50 hover:bg-card active:scale-[0.99]"
    >
      <div className="w-7 shrink-0">
        {rank <= 3 ? <MedalIcon rank={rank as 1 | 2 | 3} /> : (
          <span className="block text-center text-xs font-medium text-muted-foreground">{rank}</span>
        )}
      </div>
      <div className="flex w-12 shrink-0 flex-col items-center">
        <LeagueShield league={leagueName} size={40} />
        <span className="mt-0.5 font-medium text-xs text-muted-foreground">{tier ?? "∞"}</span>
      </div>
      <div className="w-14 shrink-0 text-center">
        <div className="text-sm font-medium tabular-nums text-foreground">{p?.trophies ?? 0}</div>
        <div className="text-xs text-muted-foreground">trofeos</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{p?.display_name || p?.username || "Usuario"}</span>
          <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/30">Nv {p?.level ?? 1}</span>
        </div>
        <RoleBadge role={member.role} className="mt-1" />
      </div>
      <div className={cn("flex shrink-0 items-center gap-1 text-sm font-medium tabular-nums", streakCls)}>
        <span>{streak}</span>
        <StreakFlame size={15} />
      </div>
    </button>
  );
};

/* ────────────────────────── Member detail sheet ────────────────────────── */

const MemberSheet = ({
  clan, member, viewerRole, onClose,
}: {
  clan: Clan; member: ClanMember | null; viewerRole: ClanRole | null; onClose: () => void;
}) => {
  const { user } = useAuth();
  const { setRole, kickMember, transferLeadership } = useClanMutations();
  if (!member) return null;
  const isMe = member.user_id === user?.id;
  const targetRole = member.role;
  const isLeader = viewerRole === "leader";
  const canPromoteVet = canDo(viewerRole ?? "member", "promote_to_veteran");
  const canKick = (canDo(viewerRole ?? "member", "kick_member") && targetRole === "member") ||
                  (isLeader && targetRole === "co_leader");
  const p = member.profile;

  const action = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toast.success(msg); onClose(); }
    catch (e: any) { toast.error(e?.message ?? "Error"); }
  };

  return (
    <Sheet open={!!member} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border bg-card/95 backdrop-blur-md">
        <SheetHeader>
          <SheetTitle className="text-left">Miembro</SheetTitle>
        </SheetHeader>
        <div className="mt-2 flex items-center gap-3">
          <Avatar className="h-14 w-14 ring-2 ring-primary/40">
            <AvatarImage src={avatarSrc(p?.avatar_url, member.user_id)} />
            <AvatarFallback>{(p?.display_name ?? p?.username ?? "?").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium">{p?.display_name || p?.username || "Usuario"}{isMe && " (Tú)"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <RoleBadge role={member.role} />
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/30">Nv {p?.level ?? 1}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border bg-muted/40 p-2"><div className="font-medium text-foreground">{p?.trophies ?? 0}</div><div className="text-xs text-muted-foreground">Trofeos</div></div>
          <div className="rounded-lg border border-border bg-muted/40 p-2"><div className="font-medium text-foreground">{p?.xp ?? 0}</div><div className="text-xs text-muted-foreground">XP</div></div>
          <div className="rounded-lg border border-border bg-muted/40 p-2"><div className="font-medium text-foreground"><span className="inline-flex items-center gap-0.5">{p?.daily_streak ?? 0} <StreakFlame size={13} className="text-warning" /></span></div><div className="text-xs text-muted-foreground">Racha</div></div>
        </div>

        {!isMe && viewerRole && (
          <div className="mt-4 flex flex-wrap gap-2">
            {isLeader && targetRole !== "leader" && (
              <Button size="sm" variant="outline" onClick={() =>
                action(() => transferLeadership.mutateAsync({ clanId: clan.id, newLeaderUserId: member.user_id }), "Liderazgo transferido")
              }><Crown className="mr-1 h-3 w-3" /> Hacer líder</Button>
            )}
            {isLeader && targetRole === "veteran" && (
              <Button size="sm" variant="outline" onClick={() =>
                action(() => setRole.mutateAsync({ memberId: member.id, role: "co_leader" }), "Promovido a Co-líder")
              }><Star className="mr-1 h-3 w-3" /> Co-líder</Button>
            )}
            {canPromoteVet && targetRole === "member" && (
              <Button size="sm" variant="outline" onClick={() =>
                action(() => setRole.mutateAsync({ memberId: member.id, role: "veteran" }), "Promovido a Veterano")
              }><Award className="mr-1 h-3 w-3" /> Veterano</Button>
            )}
            {(targetRole === "co_leader" || targetRole === "veteran") && canDo(viewerRole, "demote") && (
              <Button size="sm" variant="outline" onClick={() =>
                action(() => setRole.mutateAsync({ memberId: member.id, role: targetRole === "co_leader" ? "veteran" : "member" }), "Degradado")
              }>Degradar</Button>
            )}
            {canKick && (
              <Button size="sm" variant="destructive" onClick={() =>
                action(() => kickMember.mutateAsync(member.id), "Expulsado")
              }><X className="mr-1 h-3 w-3" /> Expulsar</Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

/* ─────────────────────────── Create wizard ─────────────────────────── */

const CreateWizard = ({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) => {
  const { createClan, checkNameAvailable } = useClanMutations();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [available, setAvailable] = useState<null | boolean>(null);
  const [checking, setChecking] = useState(false);
  const [emblem, setEmblem] = useState<EmblemConfig>(DEFAULT_EMBLEM);
  const [description, setDescription] = useState("");
  const [joinType, setJoinType] = useState<Clan["join_type"]>("open");

  useEffect(() => {
    if (name.trim().length < 3) { setAvailable(null); return; }
    setChecking(true);
    const id = setTimeout(async () => {
      try { setAvailable(await checkNameAvailable(name)); } finally { setChecking(false); }
    }, 300);
    return () => clearTimeout(id);
  }, [name, checkNameAvailable]);

  const submit = async () => {
    try {
      await createClan.mutateAsync({ name, description, join_type: joinType, emblem });
      toast.success("Clan creado");
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al crear");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={onCancel} aria-label="Volver"><ChevronLeft className="h-4 w-4" /></Button>
        <h3 className="text-sm font-medium">Crear clan · Paso {step}/4</h3>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold tracking-wide text-muted-foreground">Nombre del clan</label>
          <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="Equipo Enfoque" maxLength={20} className="text-base" />
          <div className="text-xs">
            {name.trim().length < 3 ? <span className="text-muted-foreground">Mínimo 3 caracteres</span>
              : checking ? <span className="text-muted-foreground">Comprobando…</span>
              : available === true ? <span className="inline-flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" aria-hidden /> Disponible</span>
              : available === false ? <span className="inline-flex items-center gap-1 text-destructive"><X className="h-3.5 w-3.5" aria-hidden /> Ya en uso</span>
              : null}
          </div>
          <Button className="w-full" disabled={!available} onClick={() => setStep(2)}>Continuar</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-center rounded-xl border border-border bg-muted/30 p-4">
            <EmblemSVG config={emblem} size={120} glow />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Forma</p>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {EMBLEM_SHAPES.map((s) => (
                <button key={s.id} onClick={() => setEmblem({ ...emblem, shape: s.id as EmblemShape })}
                  className={cn("rounded-lg border-2 p-1 transition-all", emblem.shape === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                  aria-label={s.label}>
                  <EmblemSVG config={{ ...emblem, shape: s.id }} size={36} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">Color principal</p>
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {EMBLEM_PALETTE.map((c) => (
                  <button key={c} onClick={() => setEmblem({ ...emblem, primary: c })}
                    className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", emblem.primary === c ? "ring-primary" : "ring-transparent")}
                    style={{ background: c }} aria-label={`primary ${c}`} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">Color secundario</p>
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {EMBLEM_PALETTE.map((c) => (
                  <button key={c} onClick={() => setEmblem({ ...emblem, secondary: c })}
                    className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", emblem.secondary === c ? "ring-primary" : "ring-transparent")}
                    style={{ background: c }} aria-label={`secondary ${c}`} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Símbolo</p>
            <div className="mt-2 max-h-[200px] space-y-3 overflow-y-auto pr-1">
              {Object.entries(EMBLEM_ICONS_BY_CATEGORY).map(([cat, icons]) => (
                <div key={cat}>
                  <p className="text-xs font-medium text-muted-foreground">{cat}</p>
                  <div className="mt-1 grid grid-cols-7 gap-1.5">
                    {icons.map((i) => (
                      <button key={i.id} onClick={() => setEmblem({ ...emblem, icon: i.id as EmblemIcon })}
                        className={cn("rounded-lg border-2 p-1 transition-all", emblem.icon === i.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                        aria-label={i.label}>
                        <EmblemSVG config={{ ...emblem, icon: i.id }} size={32} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Atrás</Button>
            <Button className="flex-1" onClick={() => setStep(3)}>Continuar</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold tracking-wide text-muted-foreground">Descripción ({description.length}/100)</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 100))} maxLength={100} rows={3} placeholder="Lema o propósito del clan…" />
          <label className="text-xs font-semibold tracking-wide text-muted-foreground">Tipo de unión</label>
          <div className="grid grid-cols-3 gap-2">
            {(["open", "request", "closed"] as const).map((j) => (
              <button key={j} onClick={() => setJoinType(j)}
                className={cn("rounded-lg border-2 p-2 text-xs font-semibold transition-all", joinType === j ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                {j === "open" ? "Abierto" : j === "request" ? "Por solicitud" : "Cerrado"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Atrás</Button>
            <Button className="flex-1" onClick={() => setStep(4)}>Continuar</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <EmblemSVG config={emblem} size={72} glow />
              <div className="min-w-0">
                <p className="truncate text-base font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{joinType === "open" ? "Abierto" : joinType === "request" ? "Por solicitud" : "Cerrado"}</p>
              </div>
            </div>
            {description && <p className="mt-3 text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Atrás</Button>
            <Button className="flex-1" disabled={createClan.isPending} onClick={submit}>
              <Sparkles className="mr-1 h-4 w-4" /> Crear clan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────── Browser ─────────────────────────── */

const ClanBrowser = ({ onCreate }: { onCreate: () => void }) => {
  const [search, setSearch] = useState("");
  const { data: clans, isLoading } = useClanSearch(search);
  const { requestToJoin } = useClanMutations();

  const join = async (c: Clan) => {
    try {
      const res = await requestToJoin.mutateAsync(c.id);
      toast.success(res === "joined" ? `Te uniste a ${c.name}` : "Solicitud enviada");
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar clan…" className="pl-8" />
        </div>
        <Button onClick={onCreate}><Plus className="mr-1 h-4 w-4" /> Crear</Button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && (clans ?? []).length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados. Puedes crear el primero.</p>
        )}
        {(clans ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/70 p-3">
            <EmblemSVG config={c.emblem_config} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className="text-[11px] text-muted-foreground">
                <Users className="mr-1 inline h-3 w-3 align-[-2px]" />{c.member_count}/{c.max_members} · {c.xp} XP · {c.join_type === "open" ? "Abierto" : c.join_type === "request" ? "Solicitud" : "Cerrado"}
              </p>
            </div>
            <Button size="sm" disabled={c.join_type === "closed" || requestToJoin.isPending} onClick={() => join(c)}>
              {c.join_type === "open" ? "Unirse" : c.join_type === "request" ? "Solicitar" : "Cerrado"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────── Main screen ─────────────────────────── */

const ClanScreen = ({ clan, viewerRole }: { clan: Clan; viewerRole: ClanRole | null }) => {
  const { user } = useAuth();
  const { data: requests } = useClanJoinRequests(clan.id);
  const { respondJoinRequest, leaveClan, dissolveClan, transferLeadership, updateClan } = useClanMutations();
  const [selectedMember, setSelectedMember] = useState<ClanMember | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  const [transferTo, setTransferTo] = useState<string>("");
  const [tab, setTab] = useState("members");
  const [editOpen, setEditOpen] = useState(false);
  const [editEmblem, setEditEmblem] = useState<EmblemConfig>(clan.emblem_config);
  const [editDescription, setEditDescription] = useState(clan.description ?? "");
  const [editJoinType, setEditJoinType] = useState<Clan["join_type"]>(clan.join_type);

  const incoming = requests?.incoming ?? [];
  const isLeader = viewerRole === "leader";
  const canSeeRequests = canDo(viewerRole ?? "member", "accept_request");
  const otherMembers = (clan.members ?? []).filter((m) => m.user_id !== user?.id);

  const handleLeave = async () => {
    try {
      if (isLeader) {
        if (otherMembers.length > 0) {
          if (!transferTo) { toast.error("Elige a quién transferir el liderazgo"); return; }
          await transferLeadership.mutateAsync({ clanId: clan.id, newLeaderUserId: transferTo });
          await leaveClan.mutateAsync();
          toast.success("Liderazgo transferido y saliste del clan");
        } else {
          await dissolveClan.mutateAsync(clan.id);
          toast.success("Clan disuelto");
        }
      } else {
        await leaveClan.mutateAsync();
        toast.success("Saliste del clan");
      }
      setConfirmLeave(false);
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
  };

  const handleDissolve = async () => {
    try {
      await dissolveClan.mutateAsync(clan.id);
      toast.success("Clan eliminado");
      setConfirmDissolve(false);
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
  };

  const handleShare = async () => {
    const text = `Únete a mi clan ${clan.name} con el código #${clan.tag}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: clan.name, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Enlace copiado");
      }
    } catch { /* user cancelled */ }
  };

  const openEdit = () => {
    setEditEmblem(clan.emblem_config);
    setEditDescription(clan.description ?? "");
    setEditJoinType(clan.join_type);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      await updateClan.mutateAsync({
        id: clan.id,
        emblem_config: editEmblem as any,
        description: editDescription.trim() || null,
        join_type: editJoinType,
        color: editEmblem.primary,
      } as any);
      toast.success("Clan actualizado");
      setEditOpen(false);
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
  };

  const headerProps = {
    viewerRole,
    onShare: handleShare,
    onLeave: () => setConfirmLeave(true),
    onDissolve: () => setConfirmDissolve(true),
  };

  return (
    <div className="space-y-3">
      {tab === "members"
        ? <ClanHeader clan={clan} {...headerProps} onEdit={openEdit} />
        : <ClanHeaderCompact clan={clan} {...headerProps} />}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 bg-muted">
          <TabsTrigger value="members" className="text-xs"><Users className="mr-1 h-3.5 w-3.5" />Miembros</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs"><MessageSquare className="mr-1 h-3.5 w-3.5" />Chat</TabsTrigger>
          <TabsTrigger value="goal" className="text-xs"><Target className="mr-1 h-3.5 w-3.5" />Reto</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-3 space-y-3">
          {canSeeRequests && incoming.length > 0 && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
              <p className="mb-2 flex items-center gap-1 text-xs font-medium text-primary"><Bell className="h-3 w-3" /> Solicitudes pendientes ({incoming.length})</p>
              <div className="space-y-1">
                {incoming.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg bg-card/60 px-2 py-1.5">
                    <Avatar className="h-7 w-7"><AvatarImage src={avatarSrc(r.profile?.avatar_url, r.user_id)} /><AvatarFallback>{(r.profile?.display_name ?? "?").charAt(0)}</AvatarFallback></Avatar>
                    <span className="flex-1 truncate text-sm">{r.profile?.display_name || r.profile?.username || "Usuario"} <span className="text-xs text-muted-foreground">Nv.{r.profile?.level ?? 1}</span></span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400" onClick={() => respondJoinRequest.mutate({ requestId: r.id, accept: true })}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => respondJoinRequest.mutate({ requestId: r.id, accept: false })}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            {(clan.members ?? []).map((m, i) => (
              <MemberRow key={m.id} member={m} rank={i + 1} onSelect={() => setSelectedMember(m)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-3"><ClanChat clanId={clan.id} /></TabsContent>
        <TabsContent value="goal" className="mt-3"><ClanWeeklyChallenge clan={clan} /></TabsContent>
      </Tabs>

      <MemberSheet clan={clan} member={selectedMember} viewerRole={viewerRole} onClose={() => setSelectedMember(null)} />

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isLeader && otherMembers.length > 0 ? "Transferir liderazgo" : "¿Confirmar salida?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isLeader && otherMembers.length > 0
                ? "Como líder, debes transferir el liderazgo antes de salir."
                : isLeader
                  ? "Eres el único miembro: el clan será disuelto."
                  : "Saldrás del clan y perderás acceso a su chat y actividad."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isLeader && otherMembers.length > 0 && (
            <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Elegir nuevo líder…</option>
              {otherMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.display_name || m.profile?.username || "Usuario"} — {CLAN_ROLE_LABEL[m.role]}
                </option>
              ))}
            </select>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDissolve} onOpenChange={setConfirmDissolve}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar clan?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. Todos los miembros serán expulsados y el clan desaparecerá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDissolve} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modificar clan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center rounded-xl border border-border bg-muted/30 p-4">
              <EmblemSVG config={editEmblem} size={100} glow />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">Forma</p>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {EMBLEM_SHAPES.map((s) => (
                  <button key={s.id} onClick={() => setEditEmblem({ ...editEmblem, shape: s.id as EmblemShape })}
                    className={cn("rounded-lg border-2 p-1 transition-all", editEmblem.shape === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                    aria-label={s.label}>
                    <EmblemSVG config={{ ...editEmblem, shape: s.id }} size={32} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">Principal</p>
                <div className="mt-2 grid grid-cols-6 gap-1.5">
                  {EMBLEM_PALETTE.map((c) => (
                    <button key={c} onClick={() => setEditEmblem({ ...editEmblem, primary: c })}
                      className={cn("h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", editEmblem.primary === c ? "ring-primary" : "ring-transparent")}
                      style={{ background: c }} aria-label={`primary ${c}`} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">Secundario</p>
                <div className="mt-2 grid grid-cols-6 gap-1.5">
                  {EMBLEM_PALETTE.map((c) => (
                    <button key={c} onClick={() => setEditEmblem({ ...editEmblem, secondary: c })}
                      className={cn("h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", editEmblem.secondary === c ? "ring-primary" : "ring-transparent")}
                      style={{ background: c }} aria-label={`secondary ${c}`} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">Símbolo</p>
              <div className="mt-2 max-h-[180px] space-y-3 overflow-y-auto pr-1">
                {Object.entries(EMBLEM_ICONS_BY_CATEGORY).map(([cat, icons]) => (
                  <div key={cat}>
                    <p className="text-xs font-medium text-muted-foreground">{cat}</p>
                    <div className="mt-1 grid grid-cols-7 gap-1.5">
                      {icons.map((i) => (
                        <button key={i.id} onClick={() => setEditEmblem({ ...editEmblem, icon: i.id as EmblemIcon })}
                          className={cn("rounded-lg border-2 p-1 transition-all", editEmblem.icon === i.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                          aria-label={i.label}>
                          <EmblemSVG config={{ ...editEmblem, icon: i.id }} size={28} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide text-muted-foreground">Descripción ({editDescription.length}/100)</label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value.slice(0, 100))} maxLength={100} rows={3} className="mt-2" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">Tipo de unión</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["open", "request", "closed"] as const).map((j) => (
                  <button key={j} onClick={() => setEditJoinType(j)}
                    className={cn("rounded-lg border-2 p-2 text-xs font-semibold transition-all", editJoinType === j ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {j === "open" ? "Abierto" : j === "request" ? "Por solicitud" : "Cerrado"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={updateClan.isPending} onClick={saveEdit}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─────────────────────────── Root panel ─────────────────────────── */

const ClansPanel = () => {
  const { clan, isLoading, myRole } = useMyClan();
  const [creating, setCreating] = useState(false);

  const body = (
      <div>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : clan ? (
          <ClanScreen clan={clan} viewerRole={myRole} />
        ) : creating ? (
          <CreateWizard onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />
        ) : (
          <ClanBrowser onCreate={() => setCreating(true)} />
        )}
      </div>
  );

  return body;
};

export default ClansPanel;