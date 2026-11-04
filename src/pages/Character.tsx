import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, Save, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import CharacterPortrait from "@/components/CharacterPortrait";
import StatusWindow from "@/components/StatusWindow";
import AvatarEditor from "@/components/AvatarEditor";
import TitlesPanel from "@/components/TitlesPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarConfig, DEFAULT_AVATAR, DEFAULT_STATS, PlayerStats, detectClass, CLASSES } from "@/lib/avatar-presets";
import { getTitle, DEFAULT_TITLE_PROGRESS, TitleProgress } from "@/lib/titles";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const Character = () => {
  const navigate = useNavigate();
  const { profile, updateAvatar, allocateStat, equipTitle, buyStreakFreeze, isLoading } = useProfile();
  const queryClient = useQueryClient();

  const [draftAvatar, setDraftAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [dirty, setDirty] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (profile?.avatar_config) {
      setDraftAvatar({ ...DEFAULT_AVATAR, ...(profile.avatar_config as Partial<AvatarConfig>) });
    }
  }, [profile?.avatar_config]);

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
  const unlockedOutfits = (profile?.unlocked_outfits as string[] | undefined) ?? ["hunter", "casual"];
  const unlockedTitles = (profile?.unlocked_titles as string[] | undefined) ?? [];
  const titleProgress: TitleProgress = {
    ...DEFAULT_TITLE_PROGRESS,
    ...((profile?.title_progress as Partial<TitleProgress>) ?? {}),
  };
  const streak = profile?.daily_streak ?? 0;
  const freezes = profile?.streak_freezes ?? 0;
  const freezeMax = profile?.streak_freeze_max ?? 3;
  const classInfo = useMemo(() => detectClass(stats, spent), [stats, spent]);
  const classGlow = classInfo.classId ? CLASSES[classInfo.classId].glow : null;

  const handleAvatarChange = (next: AvatarConfig) => {
    setDraftAvatar(next);
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateAvatar.mutateAsync(draftAvatar);
      setDirty(false);
      await regeneratePortrait(draftAvatar);
    } catch {
      toast.error("Error al guardar");
    }
  };

  const regeneratePortrait = async (cfg: AvatarConfig) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: {
          config: cfg,
          className: classInfo.label,
          title: equippedTitle?.name ?? null,
          gender: profile?.pyro_gender ?? null,
        },
      });
      if (error) throw error;
      if ((data as any)?.avatar_url) {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    } catch (e: any) {
      toast.error("No se pudo generar el retrato", { description: e?.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    if (profile?.avatar_config) {
      setDraftAvatar({ ...DEFAULT_AVATAR, ...(profile.avatar_config as Partial<AvatarConfig>) });
    } else {
      setDraftAvatar(DEFAULT_AVATAR);
    }
    setDirty(false);
  };

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
          <h1 className="text-2xl font-black tracking-tight">Personaje</h1>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button variant="ghost" size="sm" className="rounded-full" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Deshacer
            </Button>
          )}
          <Button size="sm" className="rounded-full font-extrabold" onClick={handleSave} disabled={!dirty || updateAvatar.isPending}>
            <Save className="mr-1.5 h-4 w-4" /> Guardar
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-2 md:px-8 lg:grid-cols-[380px_1fr]">
        {/* Avatar showcase */}
        <div className="space-y-4">
          <div className="character-showcase">
            <div className="character-showcase-grid" />
            <div className="relative z-10 flex flex-col items-center">
              <CharacterPortrait
                url={profile?.avatar_url}
                size={260}
                glow={classGlow}
                loading={generating}
              />
              <Button
                size="sm"
                variant="outline"
                className="mt-4 rounded-full bg-card font-bold"
                onClick={() => regeneratePortrait(draftAvatar)}
                disabled={generating}
              >
                {generating ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generando…</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Regenerar retrato</>
                )}
              </Button>
              <div className="mt-4 text-center">
                <div className="text-xl font-black">{profile?.display_name ?? "Jugador"}</div>
                <div className="mt-0.5 text-sm font-bold text-primary">Nivel {level} · {classInfo.label}</div>
                {equippedTitle && (
                  <div className="mt-0.5 text-sm font-bold text-muted-foreground">
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
              <TabsTrigger value="appearance">Apariencia</TabsTrigger>
              <TabsTrigger value="titles">Títulos</TabsTrigger>
              <TabsTrigger value="info">Detalles</TabsTrigger>
            </TabsList>

            <TabsContent value="appearance">
              <AvatarEditor config={draftAvatar} onChange={handleAvatarChange} unlockedOutfits={unlockedOutfits} />
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
                  <span className="text-sm font-bold text-muted-foreground">Proteger racha</span>
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
                <InfoRow label="Outfits desbloqueados" value={String(unlockedOutfits.length)} />
              </div>
              <p className="text-xs text-muted-foreground pt-4 border-t border-border">
                Ganas <span className="text-primary font-semibold">3 puntos de atributo</span> por cada nivel que subas.
                Distribúyelos como quieras entre HP, MP, Fuerza, Inteligencia, Velocidad y Defensa. Cuando un stat alcance el <span className="text-primary font-semibold">60%</span> de tus puntos asignados, desbloquearás una <span className="text-accent font-semibold">clase</span> con un atuendo único. Los hitos de 6, 18 y 36 puntos suben el rango (Novato → Adepto → Maestro).
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
    <span className="text-sm font-bold text-muted-foreground">{label}</span>
    <span className={highlight ? "font-extrabold text-primary" : "font-extrabold"}>{value}</span>
  </div>
);

export default Character;
