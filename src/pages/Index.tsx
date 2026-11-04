import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { CalendarClock, Plus, Search, Sparkles, Swords, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useParty } from "@/hooks/useParty";
import { useFriends } from "@/hooks/useFriends";
import { useChests, type ChestReward } from "@/hooks/useChests";
import { usePyroSuggestionsBus } from "@/hooks/usePyro";
import SideNav from "@/components/layout/SideNav";
import BottomNav from "@/components/layout/BottomNav";
import SectionHeader from "@/components/layout/SectionHeader";
import { SECTIONS, type SectionId } from "@/components/layout/sections";
import PlayerHUD from "@/components/PlayerHUD";
import TaskDialog from "@/components/TaskDialog";
import ListView from "@/components/ListView";
import DailyQuestPanel from "@/components/DailyQuestPanel";
import XpPopup from "@/components/XpPopup";
import LevelUpToast from "@/components/LevelUpToast";
import ChestOpenOverlay from "@/components/ChestOpenOverlay";
import PyroLevelUpCutscene from "@/components/PyroLevelUpCutscene";
import PyroOnboarding from "@/components/PyroOnboarding";
import PyroSprite from "@/components/PyroSprite";
import { WALLPAPERS } from "@/lib/wallpapers";
import type { Task } from "@/lib/types";
import { playSfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

// Heavier sections load on first visit to keep startup fast.
const CalendarView = lazy(() => import("@/components/CalendarView"));
const AchievementsView = lazy(() => import("@/components/AchievementsView"));
const Leagues = lazy(() => import("@/pages/Leagues"));
const SocialPanel = lazy(() => import("@/components/SocialPanel"));
const ClansPanel = lazy(() => import("@/components/ClansPanel"));
const Shop = lazy(() => import("@/pages/Shop"));
const WallpaperSelector = lazy(() => import("@/components/WallpaperSelector"));
const ProfileOverview = lazy(() => import("@/components/ProfileOverview"));
const PyroChat = lazy(() => import("@/components/PyroChat"));
const PyroSuggestionsPanel = lazy(() => import("@/components/PyroSuggestionsPanel"));
const ScheduleBlockDialog = lazy(() => import("@/components/ScheduleBlockDialog"));

type ProgressTab = "stats" | "achievements" | "leagues";
type CommunityTab = "friends" | "party" | "clans";
type ProfileTab = "shop" | "style";

const ONE_HOUR = 60 * 60 * 1000;

const SectionFallback = () => (
  <div className="flex justify-center py-16">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

const Index = () => {
  const { profile, addXp, claimDailyBonus } = useProfile();
  const { chests: unopenedChests, openChest } = useChests();
  const { projects } = useProjects();
  const { party, partyInvites } = useParty();
  const { pendingRequests } = useFriends();
  const { tasks, dailyTasks, subtasks, allTasks, createTask, updateTask, deleteTask } = useTasks();
  const queryClient = useQueryClient();

  const [section, setSection] = useState<SectionId>("tasks");
  const [progressTab, setProgressTab] = useState<ProgressTab>("stats");
  const [communityTab, setCommunityTab] = useState<CommunityTab>("friends");
  const [profileTab, setProfileTab] = useState<ProfileTab>("shop");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [calendarDefaultDate, setCalendarDefaultDate] = useState<Date | null>(null);
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [pyroChatOpen, setPyroChatOpen] = useState(false);

  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [chestOverlay, setChestOverlay] = useState<{ open: boolean; reward: ChestReward | null; opening: boolean }>({
    open: false,
    reward: null,
    opening: false,
  });

  usePyroSuggestionsBus(useCallback(() => setSuggestionsOpen(true), []));

  const hasPartyBonus = !!party && party.members.some((m) => m.status === "accepted");
  const friendRequests = pendingRequests?.length ?? 0;
  const partyRequests = partyInvites?.length ?? 0;
  const socialBadge = friendRequests + partyRequests;

  // ---------------- Derived task lists ----------------
  const todayDow = new Date().getDay();
  const dailyMissions = useMemo(
    () => dailyTasks.filter((t) => !t.daily_days?.length || t.daily_days.includes(todayDow)),
    [dailyTasks, todayDow],
  );
  const allDailyCompleted = dailyMissions.length > 0 && dailyMissions.every((t) => t.status === "done");
  const today = new Date().toISOString().split("T")[0];
  const dailyBonusClaimed = profile?.daily_completed_at === today;

  const visibleTasks = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== "done");
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [tasks, searchQuery]);

  const calendarTasks = useMemo(() => allTasks.filter((t) => !t.is_daily && !t.parent_task_id), [allTasks]);

  // ---------------- Actions ----------------
  const openNewTask = (date: Date | null = null) => {
    playSfx("open");
    setEditingTask(null);
    setCalendarDefaultDate(date);
    setDialogOpen(true);
  };

  const openEditTask = useCallback((t: Task) => {
    setEditingTask(t);
    setCalendarDefaultDate(null);
    setDialogOpen(true);
  }, []);

  const triggerOpenChest = useCallback(async () => {
    setChestOverlay({ open: true, reward: null, opening: true });
    await new Promise((r) => setTimeout(r, 1100)); // let the shake animation play
    try {
      const reward = await openChest.mutateAsync();
      setChestOverlay({ open: true, reward, opening: false });
    } catch {
      setChestOverlay({ open: false, reward: null, opening: false });
    }
  }, [openChest]);

  const handleToggleComplete = useCallback(async (task: Task) => {
    const completing = task.status !== "done";
    if (completing && !task.is_daily) {
      const ageMs = Date.now() - new Date(task.created_at).getTime();
      if (ageMs < ONE_HOUR) {
        playSfx("error");
        toast.error(`Espera ${Math.ceil((ONE_HOUR - ageMs) / 60000)} min para completar esta misión recién creada.`);
        return;
      }
    }

    playSfx(completing ? "complete" : "toggle");
    try {
      await updateTask.mutateAsync({
        id: task.id,
        status: completing ? "done" : "todo",
        completed_at: completing ? new Date().toISOString() : null,
      });
      if (!completing || task.xp_awarded) return;

      const result = await addXp.mutateAsync({
        taskId: task.id,
        priority: task.is_daily ? "urgent" : task.priority,
        partyBonus: hasPartyBonus,
      });
      playSfx("xp");
      setXpPopup(result.xpGained);
      if (result.bonusTrophyAwarded) {
        toast("+1 Trofeo 🏆", { duration: 2500, className: "pyro-trophy-toast" });
      }
      if (result.leveledUp) {
        setTimeout(() => playSfx("levelUp"), 600);
        setTimeout(() => setLevelUp(result.level), 800);
        if (result.pointsGained > 0) toast.success(`¡+${result.pointsGained} puntos de atributo!`);
      }
    } catch {
      toast.error("No se pudo actualizar la misión");
    }
  }, [updateTask, addXp, hasPartyBonus]);

  const handleClaimDailyBonus = async () => {
    try {
      const result = await claimDailyBonus.mutateAsync();
      setXpPopup(result.xpGained);
      if (result.leveledUp) setTimeout(() => setLevelUp(result.level), 800);
      toast.success(`¡Racha de ${result.streak} días! +${result.xpGained} XP`);
      // The claim grants a chest; refresh before opening it.
      await queryClient.refetchQueries({ queryKey: ["profile"] });
      setTimeout(triggerOpenChest, 600);
    } catch {
      toast.error("No se pudo reclamar la recompensa");
    }
  };

  const handleSaveTask = async (data: Partial<Task>) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, ...data });
        toast.success("Misión actualizada");
      } else {
        await createTask.mutateAsync({ ...data, title: data.title ?? "", position: tasks.length });
        playSfx("create");
        toast.success("Misión creada");
      }
      setEditingTask(null);
    } catch {
      toast.error("No se pudo guardar la misión");
    }
  };

  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      playSfx("delete");
      await deleteTask.mutateAsync(id);
    } catch {
      toast.error("No se pudo eliminar la misión");
    }
  }, [deleteTask]);

  const handleReorder = useCallback(async (taskId: string, newPosition: number) => {
    try {
      await updateTask.mutateAsync({ id: taskId, position: newPosition });
    } catch {
      toast.error("No se pudo reordenar");
    }
  }, [updateTask]);

  const handleAddSubtask = async (title: string) => {
    if (!editingTask) return;
    try {
      await createTask.mutateAsync({
        title,
        parent_task_id: editingTask.id,
        project_id: editingTask.project_id,
        position: subtasks.filter((s) => s.parent_task_id === editingTask.id).length,
      });
    } catch {
      toast.error("No se pudo crear la subtarea");
    }
  };

  // ---------------- Section swipe (mobile) ----------------
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (section === "calendar" || target.closest("[data-no-swipe]")) { touchRef.current = null; return; }
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const idx = SECTIONS.findIndex((s) => s.id === section);
    const next = SECTIONS[idx + (dx < 0 ? 1 : -1)];
    if (next) { playSfx("nav"); setSection(next.id); }
  };

  // ---------------- Wallpaper ----------------
  const wallpaper = WALLPAPERS.find((w) => w.id === (profile?.wallpaper || "default"));
  const wallpaperAnimated = (profile?.bg_animations ?? true) && !!wallpaper?.background;

  // ---------------- Sections ----------------
  const fab = (onClick: () => void, label: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lift transition-transform active:scale-90 md:bottom-8 md:right-8 md:h-auto md:w-auto md:gap-2 md:px-5 md:py-3.5"
    >
      <Plus className="h-7 w-7 md:h-5 md:w-5" strokeWidth={2.75} />
      <span className="hidden text-[15px] font-extrabold md:inline">{label}</span>
    </button>
  );

  const pyroButton = (
    <button
      type="button"
      onClick={() => { playSfx("open"); setPyroChatOpen(true); }}
      className="rounded-full p-1 transition-transform active:scale-90"
      title="Hablar con Pyro"
      aria-label="Hablar con Pyro"
    >
      <PyroSprite size={40} mood="idle" />
    </button>
  );

  let content: React.ReactNode;
  if (section === "tasks") {
    content = (
      <>
        <SectionHeader
          title={`${greeting()}${profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}`}
          subtitle={new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
          actions={pyroButton}
        />
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 md:px-8">
          <div className="surface p-4 md:hidden">
            <PlayerHUD showStreak={dailyMissions.length === 0} />
          </div>

          <DailyQuestPanel
            dailyTasks={dailyMissions}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
            onEditTask={openEditTask}
            dailyStreak={profile?.daily_streak ?? 0}
            allCompleted={allDailyCompleted}
            bonusClaimed={dailyBonusClaimed}
            onClaimBonus={handleClaimDailyBonus}
            unopenedChests={unopenedChests}
            onOpenChest={triggerOpenChest}
          />

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              {searchOpen ? (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar misiones…"
                    className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-9 text-sm font-semibold outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Cerrar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="section-title">
                    Mis misiones <span className="text-muted-foreground">{visibleTasks.length || ""}</span>
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { playSfx("open"); setSuggestionsOpen(true); }}
                      className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary/15"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Ideas de Pyro
                    </button>
                    <button
                      onClick={() => setSearchOpen(true)}
                      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Buscar misiones"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
            <ListView
              tasks={visibleTasks}
              subtasks={subtasks}
              projects={projects}
              onToggleComplete={handleToggleComplete}
              onEdit={openEditTask}
              onDelete={handleDeleteTask}
              onToggleSubtask={handleToggleComplete}
              onReorder={handleReorder}
              emptyMessage={searchQuery ? "Ninguna misión coincide con tu búsqueda." : undefined}
            />
          </section>
        </div>
        {fab(() => openNewTask(), "Nueva misión")}
      </>
    );
  } else if (section === "calendar") {
    content = (
      <>
        <div className="h-full">
          <CalendarView
            tasks={calendarTasks}
            projects={projects}
            onCreateAt={(d) => openNewTask(d)}
            onEditTask={openEditTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
        {fab(() => { playSfx("open"); setCreateChoiceOpen(true); }, "Crear")}
      </>
    );
  } else if (section === "progress") {
    content = (
      <>
        <SectionHeader<ProgressTab>
          title="Progreso"
          tabs={[{ id: "stats", label: "Estadísticas" }, { id: "achievements", label: "Logros" }, { id: "leagues", label: "Ligas" }]}
          activeTab={progressTab}
          onTabChange={setProgressTab}
        />
        <div className="mx-auto w-full max-w-3xl px-4 md:px-8">
          {progressTab === "leagues" ? <Leagues /> : <AchievementsView tasks={allTasks} view={progressTab} />}
        </div>
      </>
    );
  } else if (section === "community") {
    content = (
      <>
        <SectionHeader<CommunityTab>
          title="Comunidad"
          tabs={[
            { id: "friends", label: friendRequests ? `Amigos (${friendRequests})` : "Amigos" },
            { id: "party", label: partyRequests ? `Party (${partyRequests})` : "Party" },
            { id: "clans", label: "Clanes" },
          ]}
          activeTab={communityTab}
          onTabChange={setCommunityTab}
        />
        <div className="mx-auto w-full max-w-3xl px-4 md:px-8">
          {communityTab === "clans" ? <ClansPanel /> : <SocialPanel view={communityTab} />}
        </div>
      </>
    );
  } else {
    content = (
      <>
        <SectionHeader title="Perfil" />
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 md:px-8">
          <ProfileOverview />
          <div className="flex rounded-full bg-muted p-1">
            {([["shop", "Tienda"], ["style", "Estilo"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => { playSfx("nav"); setProfileTab(id); }}
                className={cn(
                  "flex-1 rounded-full py-1.5 text-sm font-bold transition-all",
                  profileTab === id ? "bg-card shadow-soft" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {profileTab === "shop" ? <Shop /> : <WallpaperSelector />}
        </div>
      </>
    );
  }

  return (
    <div
      className={cn("flex h-full overflow-hidden", wallpaperAnimated && "wp-animated")}
      style={wallpaper?.background ? { background: wallpaper.background } : undefined}
    >
      <SideNav current={section} onChange={setSection} badges={{ community: socialBadge }} />

      <main
        className="relative flex-1 overflow-y-auto overscroll-contain"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          key={section}
          className={cn("section-enter min-h-full", section === "calendar" ? "pb-20 md:pb-0" : "pb-32 md:pb-12")}
        >
          <Suspense fallback={<SectionFallback />}>{content}</Suspense>
        </div>
      </main>

      <BottomNav current={section} onChange={setSection} badges={{ community: socialBadge }} />

      {/* ---------------- Overlays ---------------- */}
      {xpPopup !== null && <XpPopup amount={xpPopup} onComplete={() => setXpPopup(null)} />}
      {levelUp !== null && <LevelUpToast level={levelUp} onComplete={() => setLevelUp(null)} />}
      <PyroLevelUpCutscene />
      <PyroOnboarding />

      <Suspense fallback={null}>
        {suggestionsOpen && <PyroSuggestionsPanel open={suggestionsOpen} onOpenChange={setSuggestionsOpen} />}
        {pyroChatOpen && <PyroChat onClose={() => setPyroChatOpen(false)} />}
        {scheduleOpen && <ScheduleBlockDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />}
      </Suspense>

      {createChoiceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-[2px] animate-in fade-in md:items-center"
          onClick={() => setCreateChoiceOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-lift animate-in slide-in-from-bottom-4 md:rounded-3xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted md:hidden" />
            <p className="mb-3 text-center text-base font-extrabold">¿Qué quieres crear?</p>
            <div className="flex flex-col gap-2">
              {[
                { icon: Swords, title: "Nueva misión", desc: "Gana XP al completarla", onClick: () => openNewTask() },
                { icon: CalendarClock, title: "Bloque de horario", desc: "Solo en el calendario, sin XP", onClick: () => { playSfx("open"); setScheduleOpen(true); } },
              ].map(({ icon: Icon, title, desc, onClick }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => { setCreateChoiceOpen(false); onClick(); }}
                  className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 text-left transition-colors hover:bg-muted active:scale-[0.99]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-extrabold">{title}</span>
                    <span className="block text-sm text-muted-foreground">{desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <TaskDialog
        key={editingTask?.id ?? (dialogOpen ? "new" : "closed")}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { playSfx("close"); setEditingTask(null); setCalendarDefaultDate(null); }
        }}
        task={editingTask}
        projects={projects}
        defaultProjectId={null}
        defaultDate={calendarDefaultDate}
        onSave={handleSaveTask}
        onAddSubtask={editingTask ? handleAddSubtask : undefined}
        subtasks={editingTask ? subtasks.filter((s) => s.parent_task_id === editingTask.id) : []}
      />

      <ChestOpenOverlay
        open={chestOverlay.open}
        reward={chestOverlay.reward}
        opening={chestOverlay.opening}
        onClose={() => setChestOverlay({ open: false, reward: null, opening: false })}
      />
    </div>
  );
};

export default Index;
