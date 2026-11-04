import { useState } from "react";
import { Users, UserPlus, Swords, Copy, Check, X, Crown, Shield, LogOut, Send, Bell, Search, Trophy, Flame } from "lucide-react";
import { useFriends, type FriendProfilePreview } from "@/hooks/useFriends";
import { getCurrentLeague, leagueLabel } from "@/lib/leagues";
import { useParty } from "@/hooks/useParty";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SocialPanelProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
  embedded?: boolean;
}

const SocialPanel = ({ open: openProp, onOpenChange, hideTrigger, embedded = false }: SocialPanelProps = {}) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { friends, pendingRequests, searchUser, sendRequest, respondRequest, removeFriend } = useFriends();
  const { party, partyInvites, createParty, inviteToParty, respondInvite, leaveParty, kickMember } = useParty();
  const [friendQuery, setFriendQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState<FriendProfilePreview | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [partyName, setPartyName] = useState("");
  const [copied, setCopied] = useState(false);
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => { if (onOpenChange) onOpenChange(v); else setOpenInternal(v); };

  const myFriendCode = profile?.friend_code || "...";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myFriendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("¡Código copiado!");
  };

  const handleSearch = async () => {
    const q = friendQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setPreview(null);
    try {
      const found = await searchUser(q);
      if (!found) {
        setSearchError("No user found with that code or username.");
      } else {
        setPreview(found);
      }
    } catch (e: any) {
      setSearchError(e.message || "Error en la búsqueda");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!preview) return;
    try {
      await sendRequest.mutateAsync(preview.user_id);
      toast.success("¡Solicitud enviada!");
      setPreview(null);
      setFriendQuery("");
    } catch (e: any) {
      toast.error(e.message || "Error al enviar solicitud");
    }
  };

  const handleCreateParty = async () => {
    if (!partyName.trim()) return;
    try {
      await createParty.mutateAsync(partyName.trim());
      setPartyName("");
      toast.success("¡Party creada!");
    } catch {
      toast.error("Error al crear party");
    }
  };

  const handleInvite = async (friendUserId: string) => {
    try {
      await inviteToParty.mutateAsync(friendUserId);
      toast.success("¡Invitación enviada!");
    } catch (e: any) {
      toast.error(e.message || "Error al invitar");
    }
  };

  const totalNotifications = pendingRequests.length + partyInvites.length;

  const body = (
      <Tabs defaultValue="friends" className="mt-2">
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger value="friends" className="font-pixel text-[8px]">
            <Users className="mr-1 h-3 w-3" /> Amigos
            {pendingRequests.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[7px] text-destructive-foreground">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="party" className="font-pixel text-[8px]">
            <Swords className="mr-1 h-3 w-3" /> Party
            {partyInvites.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[7px] text-destructive-foreground">
                {partyInvites.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* FRIENDS TAB */}
        <TabsContent value="friends" className="space-y-3 mt-3">
          {/* My friend code */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[9px] font-pixel text-muted-foreground mb-2">Tu código de amigo</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-1.5 text-sm font-mono tracking-wider">
                {myFriendCode}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopyCode}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Add friend (by code or username) */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Código de amigo o usuario..."
                value={friendQuery}
                onChange={(e) => {
                  setFriendQuery(e.target.value);
                  setSearchError(null);
                  setPreview(null);
                }}
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button size="sm" onClick={handleSearch} disabled={searching || !friendQuery.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchError && (
              <p className="text-[10px] text-destructive font-pixel">{searchError}</p>
            )}
            {preview && (() => {
              const lg = getCurrentLeague(preview.trophies || 0);
              return (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/40">
                    {preview.avatar_url ? (
                      <img src={preview.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-pixel text-[10px] text-primary">Nv.{preview.level}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {preview.display_name || preview.username || "Jugador"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      @{preview.username || "—"} · Nv.{preview.level}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Trophy className="h-3 w-3" style={{ color: lg.color }} /> {leagueLabel(lg)}
                    </p>
                  </div>
                  <Button size="sm" onClick={handleSendRequest} disabled={sendRequest.isPending}>
                    <UserPlus className="h-4 w-4 mr-1" /> Enviar
                  </Button>
                </div>
              );
            })()}
          </div>

          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div>
              <p className="text-[8px] font-pixel text-muted-foreground mb-2 flex items-center gap-1">
                <Bell className="h-3 w-3" /> Solicitudes pendientes
              </p>
              <div className="space-y-1">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{req.friend_profile?.display_name || "Jugador"}</p>
                      <p className="text-[10px] text-muted-foreground">Nv.{req.friend_profile?.level || 1}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => respondRequest.mutate({ friendshipId: req.id, accept: true })}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => respondRequest.mutate({ friendshipId: req.id, accept: false })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends list */}
          <div>
            <p className="text-[8px] font-pixel text-muted-foreground mb-2">
              Amigos ({friends.length})
            </p>
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Comparte tu código para agregar amigos
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-auto">
                {friends.map((f) => {
                  const fp = f.friend_profile;
                  const lg = getCurrentLeague(fp?.trophies || 0);
                  return (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30">
                        {fp?.avatar_url ? (
                          <img src={fp.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-pixel text-[8px] text-primary">{fp?.level || 1}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{fp?.display_name || fp?.username || "Jugador"}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <span>Nv.{fp?.level || 1}</span>
                          <span>· {fp?.xp || 0} XP</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <span className="flex items-center gap-1"><Trophy className="h-3 w-3" style={{ color: lg.color }} />{leagueLabel(lg)}</span>
                          <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" />{fp?.daily_streak || 0}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {party && party.leader_id === user?.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Invitar a party"
                          onClick={() => {
                            const friendUserId = f.user_id === user?.id ? f.friend_id : f.user_id;
                            handleInvite(friendUserId);
                          }}
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeFriend.mutate(f.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* PARTY TAB */}
        <TabsContent value="party" className="space-y-3 mt-3">
          {/* Party invites */}
          {partyInvites.length > 0 && (
            <div>
              <p className="text-[8px] font-pixel text-muted-foreground mb-2 flex items-center gap-1">
                <Bell className="h-3 w-3" /> Invitaciones a party
              </p>
              {partyInvites.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 mb-1">
                  <p className="text-sm">{inv.parties?.name || "Party"}</p>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => respondInvite.mutate({ membershipId: inv.id, accept: true })}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => respondInvite.mutate({ membershipId: inv.id, accept: false })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!party ? (
            <div className="space-y-3">
              <div className="text-center py-6">
                <Swords className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No estás en una party</p>
                <p className="text-[10px] text-muted-foreground">Crea una para jugar con amigos y ganar +10% XP</p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la party..."
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateParty()}
                />
                <Button size="sm" onClick={handleCreateParty} disabled={createParty.isPending}>
                  Crear
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Party header */}
              <div className="rounded-lg party-header-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-pixel text-[10px] text-primary">{party.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {(party.members.filter(m => m.status === "accepted").length + 1)}/{party.max_members} miembros · +10% XP
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="font-pixel text-[7px] h-7"
                    onClick={() => {
                      leaveParty.mutate();
                      toast.success(party.leader_id === user?.id ? "Party disuelta" : "Saliste de la party");
                    }}
                  >
                    <LogOut className="h-3 w-3 mr-1" />
                    {party.leader_id === user?.id ? "Disolver" : "Salir"}
                  </Button>
                </div>
              </div>

              {/* Leader */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-pixel text-[8px]">
                    {(party as any).leaderProfile?.level || 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {(party as any).leaderProfile?.display_name || "Líder"}
                      {party.leader_id === user?.id && " (Tú)"}
                    </p>
                  </div>
                </div>

                {/* Members */}
                {party.members
                  .filter((m) => m.status === "accepted")
                  .map((member) => (
                    <div key={member.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground font-pixel text-[8px]">
                        {member.profile?.level || 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {member.profile?.display_name || "Miembro"}
                          {member.user_id === user?.id && " (Tú)"}
                        </p>
                      </div>
                      {party.leader_id === user?.id && member.user_id !== user?.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => kickMember.mutate(member.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}

                {/* Pending invites in party */}
                {party.members
                  .filter((m) => m.status === "pending")
                  .map((member) => (
                    <div key={member.id} className="flex items-center gap-2 rounded-lg border border-dashed border-muted px-3 py-2 opacity-50">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {member.profile?.display_name || "Pendiente..."} (invitado)
                      </p>
                    </div>
                  ))}
              </div>

              {/* Invite friends */}
              {party.leader_id === user?.id && friends.length > 0 && (
                <div>
                  <p className="text-[8px] font-pixel text-muted-foreground mb-2">Invitar amigos</p>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {friends.map((f) => {
                      const friendUserId = f.user_id === user?.id ? f.friend_id : f.user_id;
                      const alreadyInParty = party.members.some((m) => m.user_id === friendUserId);
                      if (alreadyInParty) return null;
                      return (
                        <div key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5">
                          <p className="text-sm">{f.friend_profile?.display_name || "Jugador"}</p>
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleInvite(friendUserId)}>
                            <Send className="h-3 w-3 mr-1" /> Invitar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
  );

  if (embedded) {
    return (
      <div className="mx-auto w-full max-w-lg pb-24">
        <div className="mb-3 flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <h1 className="font-pixel text-xs">Centro Social</h1>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
      <DialogTrigger asChild>
        <button className="relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50">
          <Users className="h-4 w-4" />
          <span className="font-pixel text-[9px]">Social</span>
          {totalNotifications > 0 && (
            <span className="absolute right-2 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
              {totalNotifications}
            </span>
          )}
        </button>
      </DialogTrigger>
      )}
      <DialogContent className="max-w-lg social-panel-dialog">
        <DialogHeader>
          <DialogTitle className="font-pixel text-xs flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" /> Centro Social
          </DialogTitle>
        </DialogHeader>

        {body}
      </DialogContent>
    </Dialog>
  );
};

export default SocialPanel;
