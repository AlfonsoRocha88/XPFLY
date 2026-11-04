import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import CharacterPortrait from "@/components/CharacterPortrait";
import StatusWindow from "@/components/StatusWindow";
import AvatarPicker from "@/components/AvatarPicker";
import TitlesPanel from "@/components/TitlesPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_STATS, PlayerStats, detectClass } from "@/lib/avatar-presets";
import { getTitle, DEFAULT_TITLE_PROGRESS, TitleProgress } from "@/lib/titles";
import { toast } from "sonner";

const Character = () => {
  const navigate = useNavigate();
  const { profile, allocateStat, equipTitle, buyStreakFreeze, isLoading } = useProfile();

  const stats: PlayerStats = useMemo(
    () => ({ ...DEFAULT_STATS, ...((profile?.stats as Partial<PlayerStats>) ?? {}) }),
    [profile?.stats]
  );

  const level = profile?.level ?? 1;
  const equippedTitleId = profile?.equipped_title as string | null;
  const equippedTitle = getTitle(equippedTitleId);
  const title = equippedTitle?.name ?? "Sin título";
  const pointsAvailable = profile?.stat_points_available ?? 0;
  const spent = profile?.stat_points_spent ?? 0;
  const unlockedTitles = (profile?.unlocked_titles as string[] | undefined) ?? [];
  const titleProgress: TitleProgress = {
    ...DEFAULT_TITLE_PROGRESS,
    ...((profile?.title_progress as Partial<TitleProgress>) ?? {}),
  };
  const streak = profile?.daily_streak ?? 0;
  const freezes = profile?.streak_freezes ?? 0;
  const freezeMax = profile?.streak_freeze_max ?? 3;
  const classInfo = useMemo(() => detectClass(stats, spent), [stats, spent]);

  const handleAllocate = async (stat: keyof PlayerStats) => {
    try {
      await allocateStat.mutateAsync(stat);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al asignar punto");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-background/90 px-4 py-3 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/")} aria-label="Volver">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-[28px] leading-tight font-serif font-medium tracking-tight">Personaje</h1>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-2 md:px-8 lg:grid-cols-[380px_1fr]">
        {/* Avatar showcase */}
        <div className="space-y-4">
          <div className="character-showcase">
            <div className="character-showcase-grid" />
            <div className="relative z-10 flex flex-col items-center">
              <CharacterPortrait url={profile?.avatar_url} seed={profile?.user_id} size={200} className="shadow-lift ring-4 ring-card" />
              <div className="mt-4 text-center">
                <div className="font-serif text-2xl font-medium">{profile?.display_name ?? "Jugador"}</div>
                <div className="mt-0.5 text-sm font-medium text-primary">Nivel {level} · {classInfo.label}</div>
                {equippedTitle && (
                  <div className="mt-0.5 text-sm font-medium text-muted-foreground">
                    {equippedTitle.icon} {equippedTitle.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status window — visible always */}
          <StatusWindow
            stats={stats}
            pointsAvailable={pointsAvailable}
            level={level}
            onAllocate={handleAllocate}
          />
        </div>

        {/* Editor */}
        <div className="surface p-4 md:p-6">
          <Tabs defaultValue="appearance">
            <TabsList className="mb-4 grid w-full grid-cols-3">
              <TabsTrigger value="appearance">Avatar</TabsTrigger>
              <TabsTrigger value="titles">Títulos</TabsTrigger>
              <TabsTrigger value="info">Detalles</TabsTrigger>
            </TabsList>

            <TabsContent value="appearance">
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

            <TabsContent value="info" className="space-y-4">
              <div className="space-y-3 text-sm">
                <InfoRow label="Nivel" value={String(level)} />
                <InfoRow label="Título equipado" value={title} highlight={!!equippedTitle} />
                <InfoRow label="Títulos desbloqueados" value={String(unlockedTitles.length)} />
                <InfoRow label="Clase" value={classInfo.label} highlight={!!classInfo.classId} />
                <InfoRow label="XP total" value={String(profile?.xp ?? 0)} />
                <InfoRow label="Racha diaria" value={`${profile?.daily_streak ?? 0} días`} />
                <InfoRow
                  label="Congeladores 🧊"
                  value={`${freezes}/${freezeMax}`}
                  highlight={freezes > 0}
                />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">Proteger racha</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      freezes >= freezeMax ||
                      (profile?.xp ?? 0) < 100 ||
                      buyStreakFreeze.isPending
                    }
                    onClick={() => buyStreakFreeze.mutate()}
                  >
                    Comprar 🧊 (100 XP)
                  </Button>
                </div>
                <InfoRow label="Puntos asignados" value={String(profile?.stat_points_spent ?? 0)} />
                <InfoRow label="Puntos disponibles" value={String(pointsAvailable)} highlight={pointsAvailable > 0} />
              </div>
              <p className="text-xs text-muted-foreground pt-4 border-t border-border">
                Ganas <span className="text-primary font-semibold">3 puntos de atributo</span> por cada nivel que subas.
                Distribúyelos como quieras entre HP, MP, Fuerza, Inteligencia, Velocidad y Defensa. Cuando un stat alcance el <span className="text-primary font-semibold">60%</span> de tus puntos asignados, desbloquearás una <span className="text-accent font-semibold">clase</span>. Los hitos de 6, 18 y 36 puntos suben el rango (Novato → Adepto → Maestro).
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className={highlight ? "font-semibold text-primary" : "font-semibold"}>{value}</span>
  </div>
);

export default Character;
