import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Plus, Search, Sparkles, Swords } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useParty } from "@/hooks/useParty";
import { useFriends } from "@/hooks/useFriends";
import { useChests, type ChestReward } from "@/hooks/useChests";
import SideNav from "@/components/layout/SideNav";
import BottomNav from "@/components/layout/BottomNav";
import SectionHeader from "@/components/layout/SectionHeader";
import { SECTIONS, type SectionId } from "@/components/layout/sections";
import PlayerHUD from "@/components/PlayerHUD";
import SleepCheckIn from "@/components/SleepCheckIn";
import ListView from "@/components/ListView";
import DailyQuestPanel from "@/components/DailyQuestPanel";
import XpPopup from "@/components/XpPopup";
import LevelUpToast from "@/components/LevelUpToast";
import ChestOpenOverlay from "@/components/ChestOpenOverlay";
import { WALLPAPERS } from "@/lib/wallpapers";
import type { Task } from "@/lib/types";
import { playSfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { useAchievements } from "@/hooks/useAchievements";
import { m } from "motion/react";
import { PageTransition, TabTransition, useDirection } from "@/components/layout/Transitions";

// Heavier sections load on first visit to keep startup fast.
const CalendarView = lazy(() => import("@/components/CalendarView"));
const AchievementsView = lazy(() => import("@/components/achievements/AchievementsView"));
const StatsView = lazy(() => import("@/components/stats/StatsView"));
const Leagues = lazy(() => import("@/pages/Leagues"));
const SocialPanel = lazy(() => import("@/components/SocialPanel"));
const ClansPanel = lazy(() => import("@/components/ClansPanel"));
const Shop = lazy(() => import("@/pages/Shop"));
const WallpaperSelector = lazy(() => import("@/components/WallpaperSelector"));
// The editor (date picker, selects, popovers) is only needed once a task is opened.
const loadTaskEditor = () => import("@/components/task-editor/TaskEditor");
const TaskEditor = lazy(loadTaskEditor);
const ProfileOverview = lazy(() => import("@/components/ProfileOverview"));
const SignOutLink = lazy(() => import("@/components/ProfileOverview").then((m) => ({ default: m.SignOutLink })));
const ScheduleBlockDialog = lazy(() => import("@/components/ScheduleBlockDialog"));

type ProgressTab = "stats" | "achievements" | "leagues";
type CommunityTab = "friends" | "party" | "clans";
type ProfileTab = "shop" | "style";

const ONE_HOUR = 60 * 60 * 1000;
const UNDO_MS = 4500;

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
  const sectionDir = useDirection(section, SECTIONS.map((s) => s.id));
  const progressDir = useDirection<ProgressTab>(progressTab, ["stats", "achievements", "leagues"]);
  const communityDir = useDirection<CommunityTab>(communityTab, ["friends", "party", "clans"]);
  const profileDir = useDirection<ProfileTab>(profileTab, ["shop", "style"]);
  // Logros is a full-screen scene behind the page: the page lets touches through to it.
  const galaxyMode = section === "progress" && progressTab === "achievements";

  const [pendingDelete, setPendingDelete] = useState<ReadonlySet<string>>(new Set());
  const deleteTimers = useRef(new Map<string, { timer: number; commit: () => Promise<void> }>());

  const [dialogOpen, setDialogOpen] = useState(false);
  // Mount the editor the first time it opens and keep it mounted so its close animation still plays.
  const [editorUsed, setEditorUsed] = useState(false);
  useEffect(() => { if (dialogOpen) setEditorUsed(true); }, [dialogOpen]);
  // Fetch its code while the phone is idle, so the first tap on + opens it without a wait.
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => { void loadTaskEditor(); });
  }, []);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [calendarDefaultDate, setCalendarDefaultDate] = useState<Date | null>(null);
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [chestOverlay, setChestOverlay] = useState<{ open: boolean; reward: ChestReward | null; opening: boolean }>({
    open: false,
    reward: null,
    opening: false,
  });

  const hasPartyBonus = !!party && party.members.some((m) => m.status === "accepted");
  const friendRequests = pendingRequests?.length ?? 0;
  const partyRequests = partyInvites?.length ?? 0;
  const socialBadge = friendRequests + partyRequests;
  const { claimableCount } = useAchievements();

  // ---------------- Derived task lists ----------------
  const todayDow = new Date().getDay();
  const dailyMissions = useMemo(
    () => dailyTasks.filter((t) => !pendingDelete.has(t.id) && (!t.daily_days?.length || t.daily_days.includes(todayDow))),
    [dailyTasks, todayDow, pendingDelete],
  );
  const allDailyCompleted = dailyMissions.length > 0 && dailyMissions.every((t) => t.status === "done");
  const today = new Date().toISOString().split("T")[0];
  const dailyBonusClaimed = profile?.daily_completed_at === today;

  const visibleTasks = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== "done" && !pendingDelete.has(t.id));
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [tasks, searchQuery, pendingDelete]);

  const calendarTasks = useMemo(() => allTasks.filter((t) => !t.is_daily && !t.parent_task_id && !pendingDelete.has(t.id)), [allTasks, pendingDelete]);

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
        toast.error(`Espera ${Math.ceil((ONE_HOUR - ageMs) / 60000)} min para completar esta tarea recién creada.`);
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
        toast("+1 trofeo", { duration: 2500, className: "trophy-toast" });
      }
      if (result.leveledUp) {
        setTimeout(() => playSfx("levelUp"), 600);
        setTimeout(() => setLevelUp(result.level), 800);
      }
    } catch {
      toast.error("No se pudo actualizar la tarea");
    }
  }, [updateTask, addXp, hasPartyBonus]);

  const handleClaimDailyBonus = async () => {
    try {
      const result = await claimDailyBonus.mutateAsync();
      setXpPopup(result.xpGained);
      if (result.leveledUp) setTimeout(() => setLevelUp(result.level), 800);
      toast.success(`Racha de ${result.streak} días · +${result.xpGained} XP`);
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
        toast.success("Tarea actualizada");
      } else {
        await createTask.mutateAsync({ ...data, title: data.title ?? "", position: tasks.length });
        playSfx("create");
        toast.success("Tarea creada");
      }
      setEditingTask(null);
    } catch {
      toast.error("No se pudo guardar la tarea");
    }
  };

  // Deleting hides the task at once and commits after a grace period, so there is
  // no "are you sure?" step: a mistaken swipe is undone from the toast instead.
  const handleDeleteTask = useCallback((id: string) => {
    playSfx("delete");
    setPendingDelete((s) => new Set(s).add(id));
    const restore = () => setPendingDelete((s) => { const n = new Set(s); n.delete(id); return n; });
    const commit = async () => {
      deleteTimers.current.delete(id);
      try {
        await deleteTask.mutateAsync(id);
      } catch {
        restore();
        toast.error("No se pudo eliminar la tarea");
      }
    };
    deleteTimers.current.set(id, { timer: window.setTimeout(commit, UNDO_MS), commit });
    toast("Tarea eliminada", {
      duration: UNDO_MS,
      action: {
        label: "Deshacer",
        onClick: () => {
          const pending = deleteTimers.current.get(id);
          if (!pending) return;
          window.clearTimeout(pending.timer);
          deleteTimers.current.delete(id);
          restore();
        },
      },
    });
  }, [deleteTask]);

  // Leaving the app inside the undo window still deletes what was swiped away.
  useEffect(() => {
    const flush = () => {
      for (const { timer, commit } of deleteTimers.current.values()) { window.clearTimeout(timer); void commit(); }
    };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);

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
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lift ring-1 ring-inset ring-white/25 animate-in zoom-in-75 fade-in duration-300 md:bottom-8 md:right-8 md:h-auto md:w-auto md:gap-2 md:px-5 md:py-3.5"
    >
      <Plus className="h-7 w-7 md:h-5 md:w-5" strokeWidth={2.75} />
      <span className="hidden text-[15px] font-semibold md:inline">{label}</span>
    </button>
  );

  let content: React.ReactNode;
  if (section === "tasks") {
    content = (
      <>
        <SectionHeader
          title={`${greeting()}${profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}`}
          subtitle={new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
        />
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 md:px-8">
          <div className="surface p-4 md:hidden">
            <PlayerHUD showStreak={dailyMissions.length === 0} />
          </div>

          <SleepCheckIn />

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
                  {/* No close button: an empty field closes itself when it loses focus. */}
                  <input
                    autoFocus
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery.trim()) setSearchOpen(false); }}
                    onKeyDown={(e) => { if (e.key === "Escape") { setSearchQuery(""); setSearchOpen(false); } }}
                    placeholder="Buscar tareas…"
                    aria-label="Buscar tareas"
                    className="glass h-10 w-full rounded-full pl-9 pr-4 text-sm font-semibold outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <>
                  <h2 className="section-title">
                    Mis tareas <span className="text-muted-foreground">{visibleTasks.length || ""}</span>
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSearchOpen(true)}
                      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Buscar tareas"
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
              emptyMessage={searchQuery ? "Ninguna tarea coincide con tu búsqueda." : undefined}
            />
          </section>
        </div>
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
      </>
    );
  } else if (section === "progress") {
    content = (
      <>
        <SectionHeader<ProgressTab>
          title="Progreso"
          tabs={[{ id: "stats", label: "Estadísticas" }, { id: "achievements", label: claimableCount ? `Logros (${claimableCount})` : "Logros" }, { id: "leagues", label: "Ligas" }]}
          activeTab={progressTab}
          onTabChange={setProgressTab}
          overlay={galaxyMode}
        />
        <TabTransition id={progressTab} dir={progressDir} className="mx-auto w-full max-w-3xl px-4 md:px-8">
          {progressTab === "leagues" ? <Leagues /> : progressTab === "stats" ? <StatsView habits={dailyTasks} /> : <AchievementsView />}
        </TabTransition>
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
        <TabTransition id={communityTab} dir={communityDir} className="mx-auto w-full max-w-3xl px-4 md:px-8">
          {communityTab === "clans" ? <ClansPanel /> : <SocialPanel view={communityTab} />}
        </TabTransition>
      </>
    );
  } else {
    content = (
      <>
        <SectionHeader title="Perfil" />
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 md:px-8">
          <ProfileOverview />
          <div className="glass flex rounded-full p-1" role="tablist">
            {([["shop", "Tienda"], ["style", "Estilo"]] as const).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={profileTab === id}
                onClick={() => { if (profileTab !== id) { playSfx("nav"); setProfileTab(id); } }}
                className={cn("relative flex-1 rounded-full py-1.5 text-sm font-medium transition-colors", profileTab === id ? "text-foreground" : "text-muted-foreground")}
              >
                {profileTab === id && (
                  <m.span layoutId="profile-pill" className="absolute inset-0 rounded-full bg-card shadow-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <TabTransition id={profileTab} dir={profileDir}>
            {profileTab === "shop" ? <Shop /> : <><WallpaperSelector /><SignOutLink /></>}
          </TabTransition>
        </div>
      </>
    );
  }

  return (
    <div
      className={cn("flex h-full overflow-hidden", wallpaperAnimated && "wp-animated", !wallpaper?.background && "ambient-bg")}
      style={wallpaper?.background ? { background: wallpaper.background } : undefined}
    >
      <SideNav current={section} onChange={setSection} badges={{ community: socialBadge, progress: claimableCount }} />

      <main
        className="relative flex-1 overflow-y-auto overscroll-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <PageTransition
          id={section}
          dir={sectionDir}
          className={cn(
            "relative z-10 min-h-full",
            section === "calendar" ? "pb-24 md:pb-0" : "pb-32 md:pb-12",
            galaxyMode && "pointer-events-none",
          )}
        >
          <Suspense fallback={<SectionFallback />}>{content}</Suspense>
        </PageTransition>
      </main>

      {/* The add button sits outside the animated page so its fixed position never shifts mid-transition. */}
      {section === "tasks" && fab(() => openNewTask(), "Nueva tarea")}
      {section === "calendar" && fab(() => { playSfx("open"); setCreateChoiceOpen(true); }, "Crear")}

      <BottomNav current={section} onChange={setSection} badges={{ community: socialBadge, progress: claimableCount }} />

      {/* ---------------- Overlays ---------------- */}
      {xpPopup !== null && <XpPopup amount={xpPopup} onComplete={() => setXpPopup(null)} />}
      {levelUp !== null && <LevelUpToast level={levelUp} onComplete={() => setLevelUp(null)} />}

      <Suspense fallback={null}>
        {scheduleOpen && <ScheduleBlockDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />}
      </Suspense>

      {createChoiceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-[2px] animate-in fade-in md:items-center"
          onClick={() => setCreateChoiceOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-md rounded-t-3xl p-5 shadow-lift animate-in slide-in-from-bottom-4 md:rounded-3xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted md:hidden" />
            <p className="mb-3 text-center text-base font-semibold">¿Qué quieres crear?</p>
            <div className="flex flex-col gap-2">
              {[
                { icon: Swords, title: "Nueva tarea", desc: "Gana XP al completarla", onClick: () => openNewTask() },
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
                    <span className="block text-[15px] font-semibold">{title}</span>
                    <span className="block text-sm text-muted-foreground">{desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {editorUsed && (
      <Suspense fallback={null}>
      <TaskEditor
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
      </Suspense>
      )}

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
