import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFriends } from "@/hooks/useFriends";
import { useProfile } from "@/hooks/useProfile";
import { getCurrentLeague, leagueLabel } from "@/lib/leagues";
import { playSfx } from "@/lib/sfx";
import CharacterPortrait from "@/components/CharacterPortrait";
import { LeagueEmblem } from "@/components/leagues/LeagueEmblem";
import { StreakComet } from "@/components/icons/StreakComet";
import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export const BIO_MAX = 150;

type Friendship = "self" | "accepted" | "pending_out" | "pending_in" | "none";
export interface PublicProfile {
  user_id: string; display_name: string | null; username: string | null; avatar_url: string | null;
  equipped_frame: string | null; bio: string | null; level: number; xp: number; trophies: number;
  current_league_id: string; daily_streak: number; friendship: Friendship; friendship_id: string | null;
}

/* ---------- opener: any row in the app can call openProfile(userId) ---------- */
const Ctx = createContext<(userId: string) => void>(() => undefined);
export const useOpenProfile = () => useContext(Ctx);

export function ProfileSheetProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const openProfile = useCallback((id: string) => { setUserId(id); setOpen(true); }, []);
  return (
    <Ctx.Provider value={openProfile}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-3xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
          {userId && <ProfileBody userId={userId} />}
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
}

/* ---------- data ---------- */
export function usePublicProfile(userId: string | null) {
  return useQuery({
    queryKey: ["public-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_profile", { _user_id: userId! });
      if (error) throw error;
      return (data?.[0] ?? null) as PublicProfile | null;
    },
  });
}

/** A friend's latest photos (RLS only returns them to friends and the owner). */
function useRecentPhotos(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["profile-photos", userId],
    enabled,
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("id, image_path").eq("user_id", userId).order("created_at", { ascending: false }).limit(6);
      if (!data?.length) return [];
      const { data: signed } = await supabase.storage.from("posts").createSignedUrls(data.map((p) => p.image_path), 3600);
      return data.map((p, i) => ({ id: p.id, url: signed?.[i]?.signedUrl ?? "" })).filter((p) => p.url);
    },
  });
}

/* ---------- bio editor (sheet for yourself, and Perfil → Estilo) ---------- */
export function BioEditor() {
  const { profile, updateProfile } = useProfile();
  const saved = (profile as { bio?: string | null } | null)?.bio ?? "";
  const [value, setValue] = useState(saved);
  useEffect(() => setValue(saved), [saved]);
  const save = () => {
    const next = value.trim().slice(0, BIO_MAX);
    if (next === saved) return;
    updateProfile.mutate({ bio: next || null }, { onSuccess: () => toast.success("Bio guardada") });
  };
  return (
    <div className="relative">
      <Textarea
        value={value}
        maxLength={BIO_MAX}
        rows={2}
        placeholder="Escribe tu bio"
        aria-label="Bio"
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        className="resize-none pr-14 text-sm"
      />
      <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums text-muted-foreground">{value.length}/{BIO_MAX}</span>
    </div>
  );
}

/* ---------- the sheet ---------- */
function Stat({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted/50 px-2 py-3">
      <span className="flex h-6 items-center">{icon}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function ProfileBody({ userId }: { userId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { sendRequest, respondRequest } = useFriends();
  const { data: p, isLoading } = usePublicProfile(userId);
  const isSelf = p?.friendship === "self" || userId === user?.id;
  const photos = useRecentPhotos(userId, !!p && (p.friendship === "accepted" || isSelf));
  const league = useMemo(() => getCurrentLeague(p?.trophies ?? 0), [p?.trophies]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["public-profile", userId] });
  const add = useMutation({
    mutationFn: () => sendRequest.mutateAsync(userId),
    onSuccess: () => { playSfx("create"); toast.success("Solicitud enviada"); refresh(); },
    onError: (e: Error) => toast.error(e.message || "No se pudo enviar"),
  });
  const accept = () => p?.friendship_id && respondRequest.mutate(
    { friendshipId: p.friendship_id, accept: true },
    { onSuccess: () => { playSfx("complete"); refresh(); } },
  );

  if (isLoading || !p) {
    return (
      <div className="flex flex-col items-center gap-3 py-6" aria-busy>
        <SheetTitle className="sr-only">Perfil</SheetTitle>
        <div className="h-24 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const name = p.display_name || p.username || "Usuario";
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <CharacterPortrait url={p.avatar_url} seed={p.user_id} frame={p.equipped_frame} size={96} />
      <SheetTitle className="mt-3 font-serif text-2xl font-medium">{name}</SheetTitle>
      <SheetDescription className="text-sm text-muted-foreground">@{p.username || "—"} · Nv.{p.level}</SheetDescription>
      {isSelf ? (
        <div className="mt-3 w-full"><BioEditor /></div>
      ) : p.bio ? (
        <p className="mt-3 max-w-xs text-sm leading-relaxed">“{p.bio}”</p>
      ) : null}

      <div className="mt-5 grid w-full grid-cols-4 gap-2">
        <Stat icon={<span className="text-sm font-bold text-primary">XP</span>} value={p.xp.toLocaleString("es-MX")} label="XP" />
        <Stat icon={<TrophyIcon size={20} />} value={p.trophies.toLocaleString("es-MX")} label="Trofeos" />
        <Stat icon={<StreakComet streak={p.daily_streak} size={22} />} value={p.daily_streak} label="Racha" />
        <Stat icon={<LeagueEmblem family={league.family} division={league.divisionNumber} size={22} animated={false} />} value={leagueLabel(league)} label="Liga" />
      </div>

      {!isSelf && (
        <div className="mt-5 w-full">
          {p.friendship === "none" && (
            <Button className="h-11 w-full rounded-full" onClick={() => add.mutate()} disabled={add.isPending}><UserPlus className="mr-2 h-4 w-4" />Agregar amigo</Button>
          )}
          {p.friendship === "pending_out" && (
            <Button className="h-11 w-full rounded-full" variant="outline" disabled><Clock className="mr-2 h-4 w-4" />Solicitud enviada</Button>
          )}
          {p.friendship === "pending_in" && (
            <Button className="h-11 w-full rounded-full" onClick={accept}><Check className="mr-2 h-4 w-4" />Aceptar solicitud</Button>
          )}
          {p.friendship === "accepted" && (
            <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary"><Check className="h-4 w-4" />Amigos</p>
          )}
        </div>
      )}

      {!!photos.data?.length && (
        <div className="mt-5 grid w-full grid-cols-3 gap-1.5">
          {photos.data.map((ph) => (
            <img key={ph.id} src={ph.url} alt="" loading="lazy" className="aspect-[4/5] w-full rounded-xl object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
