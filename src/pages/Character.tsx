import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import CharacterPortrait from "@/components/CharacterPortrait";
import AvatarPicker from "@/components/AvatarPicker";
import TitlesPanel from "@/components/TitlesPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTitle, DEFAULT_TITLE_PROGRESS, TitleProgress } from "@/lib/titles";

const FREEZE_COST_XP = 100;

/** Profile detail: avatar, titles and account stats. */
const Character = () => {
  const navigate = useNavigate();
  const { profile, equipTitle, buyStreakFreeze, isLoading } = useProfile();

  const level = profile?.level ?? 1;
  const equippedTitleId = profile?.equipped_title as string | null;
  const equippedTitle = getTitle(equippedTitleId);
  const unlockedTitles = (profile?.unlocked_titles as string[] | undefined) ?? [];
  const titleProgress: TitleProgress = {
    ...DEFAULT_TITLE_PROGRESS,
    ...((profile?.title_progress as Partial<TitleProgress>) ?? {}),
  };
  const streak = profile?.daily_streak ?? 0;
  const freezes = profile?.streak_freezes ?? 0;
  const freezeMax = profile?.streak_freeze_max ?? 3;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background">
      <header className="sticky top-0 z-50 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur-md md:px-8">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/")} aria-label="Volver">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight">Mi perfil</h1>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-2 md:px-8 lg:grid-cols-[340px_1fr]">
        <div className="character-showcase">
          <div className="character-showcase-grid" />
          <div className="relative z-10 flex flex-col items-center">
            <CharacterPortrait url={profile?.avatar_url} seed={profile?.user_id} frame={profile?.equipped_frame} size={180} className="shadow-lift ring-4 ring-card" />
            <div className="mt-4 text-center">
              <div className="font-serif text-2xl font-medium">{profile?.display_name ?? profile?.username}</div>
              {profile?.username && <div className="text-sm text-muted-foreground">@{profile.username}</div>}
              <div className="mt-1 text-sm font-medium text-primary">Nivel {level}</div>
              {equippedTitle && <div className="mt-0.5 text-sm text-muted-foreground">{equippedTitle.name}</div>}
            </div>
          </div>
        </div>

        <div className="surface p-4 md:p-6">
          <Tabs defaultValue="avatar">
            <TabsList className="mb-4 grid w-full grid-cols-3">
              <TabsTrigger value="avatar">Avatar</TabsTrigger>
              <TabsTrigger value="titles">Títulos</TabsTrigger>
              <TabsTrigger value="info">Detalles</TabsTrigger>
            </TabsList>

            <TabsContent value="avatar">
              <AvatarPicker />
            </TabsContent>

            <TabsContent value="titles">
              <TitlesPanel
                unlocked={unlockedTitles}
                equipped={equippedTitleId}
                progress={titleProgress}
                streak={streak}
                onEquip={(id) => equipTitle.mutate(id)}
                isPending={equipTitle.isPending}
              />
            </TabsContent>

            <TabsContent value="info" className="space-y-1 text-sm">
              <InfoRow label="Nivel" value={String(level)} />
              <InfoRow label="XP total" value={String(profile?.xp ?? 0)} />
              <InfoRow label="Racha actual" value={`${streak} ${streak === 1 ? "día" : "días"}`} />
              <InfoRow label="Títulos desbloqueados" value={String(unlockedTitles.length)} />
              <InfoRow label="Protectores de racha" value={`${freezes} de ${freezeMax}`} />
              <div className="flex items-center justify-between gap-3 pt-3">
                <span className="text-muted-foreground">
                  Un protector conserva tu racha si un día no completas tus tareas.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={freezes >= freezeMax || (profile?.xp ?? 0) < FREEZE_COST_XP || buyStreakFreeze.isPending}
                  onClick={() => buyStreakFreeze.mutate()}
                >
                  Comprar ({FREEZE_COST_XP} XP)
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-border/60 py-2.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold tabular-nums">{value}</span>
  </div>
);

export default Character;
