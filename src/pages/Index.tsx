import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useParty } from "@/hooks/useParty";
import { useFriends } from "@/hooks/useFriends";
import AppSidebar from "@/components/AppSidebar";
import TaskDialog from "@/components/TaskDialog";
import TaskFilters from "@/components/TaskFilters";
import ListView from "@/components/ListView";
import KanbanView from "@/components/KanbanView";
import AchievementsView from "@/components/AchievementsView";
import CalendarView from "@/components/CalendarView";
import DailyQuestPanel from "@/components/DailyQuestPanel";
import XpPopup from "@/components/XpPopup";
import LevelUpToast from "@/components/LevelUpToast";
import MobileBottomNav from "@/components/MobileBottomNav";
import type { BottomNavPage } from "@/components/MobileBottomNav";
import PlayerHUD from "@/components/PlayerHUD";
import SocialPanel from "@/components/SocialPanel";
import ClansPanel from "@/components/ClansPanel";
import WallpaperSelector from "@/components/WallpaperSelector";
import Shop from "@/pages/Shop";
import Leagues from "@/pages/Leagues";
import ChestOpenOverlay from "@/components/ChestOpenOverlay";
import { useChests, type ChestReward } from "@/hooks/useChests";
import PyroLevelUpCutscene from "@/components/PyroLevelUpCutscene";
import { usePyroProgression } from "@/hooks/usePyroProgression";
import PyroOnboarding from "@/components/PyroOnboarding";
import PyroSuggestionsPanel from "@/components/PyroSuggestionsPanel";
import PyroSprite from "@/components/PyroSprite";
import PyroChat from "@/components/PyroChat";
import ScheduleBlockDialog from "@/components/ScheduleBlockDialog";
import { usePyroSuggestionsBus } from "@/hooks/usePyro";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { WALLPAPERS } from "@/lib/wallpapers";
import { getThemeClass, THEME_CLASS_NAMES } from "@/lib/themes";
import type { Task, TaskStatus } from "@/lib/types";
import { playSfx } from "@/lib/sfx";

const Index = () => {
  const { user } = useAuth();
  const { profile, addXp, claimDailyBonus } = useProfile();
  const { isUnlocked } = usePyroProgression();
  const { chests: unopenedChests, openChest } = useChests();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [currentPage, setCurrentPage] = useState<BottomNavPage>("tasks");
  const [calendarDefaultDate, setCalendarDefaultDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [xpPopup, setXpPopup] = useState<{ amount: number } | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [chestOverlay, setChestOverlay] = useState<{ open: boolean; reward: ChestReward | null; opening: boolean }>({
    open: false,
    reward: null,
    opening: false,
  });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [pyroChatOpen, setPyroChatOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calendarCreateChoiceOpen, setCalendarCreateChoiceOpen] = useState(false);

  // Tabs mounted side-by-side, Clash Royale style swipe. Linear, no wrap.
  // Order: Misiones → Calendario → Logros → Tienda → Ligas → Social → Clanes → Estilo.
  const availablePages = useMemo<BottomNavPage[]>(() => {
    const pages: BottomNavPage[] = ["tasks"];
    if (isUnlocked("calendar")) pages.push("calendar");
    pages.push("stats");
    if (isUnlocked("shop")) pages.push("shop");
    if (isUnlocked("leagues")) pages.push("leagues");
    if (isUnlocked("social")) pages.push("social");
    if (isUnlocked("clans")) pages.push("clans");
    pages.push("wallpaper");
    return pages;
  }, [isUnlocked]);
  const N = availablePages.length;
  const swipeIdx = Math.max(0, availablePages.indexOf(currentPage));

  // Real-time horizontal drag state.
  const swipeRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [snapping, setSnapping] = useState<null | "next" | "prev" | "back">(null);
  const dragXRef = useRef(0);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    locked: "x" | "y" | null;
    width: number;
    startIdx: number;
    maxIdx: number;
  } | null>(null);

  const updateDragX = useCallback((x: number) => {
    dragXRef.current = x;
    setDragX(x);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (snapping) return;
    const t = e.touches[0];
    dragStateRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      locked: null,
      width: swipeRef.current?.offsetWidth ?? window.innerWidth,
      startIdx: swipeIdx,
      maxIdx: N - 1,
    };
  }, [snapping, swipeIdx, N]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const s = dragStateRef.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.startX;
    const dy = t.clientY - s.startY;
    if (!s.locked) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) s.locked = "x";
      else if (Math.abs(dy) > 8) s.locked = "y";
      else return;
    }
    if (s.locked !== "x") return;
    let clamped = dx;
    if (s.startIdx === 0 && dx > 0) clamped = 0;
    if (s.startIdx === s.maxIdx && dx < 0) clamped = 0;
    updateDragX(clamped);
  }, [updateDragX]);

  const handleTouchEnd = useCallback(() => {
    const s = dragStateRef.current;
    dragStateRef.current = null;
    if (!s || s.locked !== "x") {
      updateDragX(0);
      return;
    }
    const dx = dragXRef.current;
    const w = s.width;
    if (dx <= -50 && s.startIdx < s.maxIdx) {
      setSnapping("next");
      updateDragX(-w);
      window.setTimeout(() => {
        setCurrentPage(availablePages[s.startIdx + 1]);
        updateDragX(0);
        // Skip the transition on the reset to 0 since the index changed.
        requestAnimationFrame(() => setSnapping(null));
      }, 250);
    } else if (dx >= 50 && s.startIdx > 0) {
      setSnapping("prev");
      updateDragX(w);
      window.setTimeout(() => {
        setCurrentPage(availablePages[s.startIdx - 1]);
        updateDragX(0);
        requestAnimationFrame(() => setSnapping(null));
      }, 250);
    } else {
      setSnapping("back");
      updateDragX(0);
      window.setTimeout(() => setSnapping(null), 200);
    }
  }, [availablePages, updateDragX]);

  // For the bottom nav indicator: smooth lerp between current and target page.
  const containerW = swipeRef.current?.offsetWidth ?? 1;
  const swipeProgress = Math.min(1, Math.abs(dragX) / containerW);
  const swipeTargetPage: BottomNavPage | null =
    dragX < 0 && swipeIdx < N - 1
      ? availablePages[swipeIdx + 1]
      : dragX > 0 && swipeIdx > 0
        ? availablePages[swipeIdx - 1]
        : null;

  // Open suggestions panel when the persistent Pyro widget requests it.
  usePyroSuggestionsBus(useCallback(() => setSuggestionsOpen(true), []));

  const triggerOpenChest = useCallback(async () => {
    setChestOverlay({ open: true, reward: null, opening: true });
    // suspense delay for the animation
    await new Promise((r) => setTimeout(r, 1100));
    try {
      const r = await openChest.mutateAsync();
      setChestOverlay({ open: true, reward: r, opening: false });
    } catch {
      setChestOverlay({ open: false, reward: null, opening: false });
    }
  }, [openChest]);

  const { projects } = useProjects();
  const { party } = useParty();
  const { pendingRequests } = useFriends();
  const { partyInvites } = useParty();
  const { tasks, subtasks, allTasks, createTask, updateTask, deleteTask } = useTasks(
    selectedProjectId && currentPage === "tasks" ? selectedProjectId : undefined
  );

  // Daily tasks from ALL tasks (not filtered by project)
  const { dailyTasks } = useTasks(undefined);
  const todayDow = new Date().getDay();
  const dailyMissionsToday = useMemo(
    () =>
      dailyTasks.filter((t: any) => {
        const days = (t.daily_days as number[] | undefined) ?? [];
        return days.length === 0 || days.includes(todayDow);
      }),
    [dailyTasks, todayDow]
  );
  const dailyMissions = dailyMissionsToday;

  const today = new Date().toISOString().split("T")[0];
  const dailyBonusClaimed = profile?.daily_completed_at === today;

  const allDailyCompleted =
    dailyMissionsToday.length > 0 && dailyMissionsToday.every((t) => t.status === "done");

  const filteredTasks = useMemo(() => {
    let filtered = currentPage !== "tasks" ? [] : tasks.filter((t) => !t.is_daily && t.status !== "done");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (priorityFilter !== "all") filtered = filtered.filter((t) => t.priority === priorityFilter);
    if (projectFilter !== "all") {
      if (projectFilter === "none") filtered = filtered.filter((t) => !t.project_id);
      else filtered = filtered.filter((t) => t.project_id === projectFilter);
    }
    return filtered;
  }, [tasks, searchQuery, priorityFilter, projectFilter, currentPage]);

  // All non-daily, non-subtask items for calendar (includes completed + recurring)
  const calendarTasks = useMemo(
    () => allTasks.filter((t) => !t.is_daily && !t.parent_task_id),
    [allTasks]
  );

  const handleToggleComplete = useCallback(async (task: Task) => {
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    if (newStatus === "done" && !task.is_daily) {
      const ageMs = Date.now() - new Date(task.created_at).getTime();
      const ONE_HOUR = 60 * 60 * 1000;
      if (ageMs < ONE_HOUR) {
        playSfx("error");
        const minsLeft = Math.ceil((ONE_HOUR - ageMs) / 60000);
        toast.error(`Espera ${minsLeft} min para completar esta misión recién creada.`);
        return;
      }
    }
    const alreadyAwarded = (task as any).xp_awarded === true;
    try {
      await updateTask.mutateAsync({
        id: task.id,
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
      } as any);

      if (newStatus === "done" && !alreadyAwarded) {
        const effectivePriority = task.is_daily ? "urgent" : task.priority;
        const result = await addXp.mutateAsync({ taskId: task.id, priority: effectivePriority, partyBonus: hasPartyBonus });
        playSfx("complete");
        playSfx("xp");
        setXpPopup({ amount: result.xpGained });
        if ((result as any).bonusTrophyAwarded) {
          toast("+1 Trofeo 🏆", {
            duration: 2500,
            className: "pyro-trophy-toast",
          });
        }
        if (result.leveledUp) {
          setTimeout(() => playSfx("levelUp"), 600);
          setTimeout(() => setLevelUp(result.level), 800);
          if (result.pointsGained > 0) toast.success(`¡+${result.pointsGained} puntos de atributo!`);
        }
      } else if (newStatus === "done" && alreadyAwarded) {
        playSfx("toggle");
      }
    } catch {
      toast.error("Error al actualizar tarea");
    }
  }, [updateTask, addXp]);

  const handleClaimDailyBonus = async () => {
    try {
      const result = await claimDailyBonus.mutateAsync();
      setXpPopup({ amount: result.xpGained });
      if (result.leveledUp) {
        setTimeout(() => setLevelUp(result.level), 800);
      }
      toast.success(`¡Racha de ${result.streak} días! +${result.xpGained} XP`);
      // Make sure the freshly granted chest is reflected in the cache before opening
      await queryClient.refetchQueries({ queryKey: ["profile"] });
      // Auto-open the reward chest with animation
      setTimeout(() => {
        triggerOpenChest();
      }, 600);
    } catch {
      toast.error("Error al reclamar recompensa");
    }
  };

  const handleSaveTask = async (data: any) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, ...data });
        toast.success("Tarea actualizada");
      } else {
        await createTask.mutateAsync({ ...data, position: tasks.length });
        playSfx("create");
        toast.success("Tarea creada");
      }
      setEditingTask(null);
    } catch {
      toast.error("Error al guardar tarea");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      playSfx("delete");
      await deleteTask.mutateAsync(id);
      toast.success("Tarea eliminada");
    } catch {
      toast.error("Error al eliminar tarea");
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    try {
      await updateTask.mutateAsync({
        id: taskId,
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
      });

      if (newStatus === "done" && task && task.status !== "done") {
        if (!task.is_daily) {
          const ageMs = Date.now() - new Date(task.created_at).getTime();
          if (ageMs < 60 * 60 * 1000) {
            playSfx("error");
            const minsLeft = Math.ceil((60 * 60 * 1000 - ageMs) / 60000);
            toast.error(`Espera ${minsLeft} min para completar esta misión.`);
            await updateTask.mutateAsync({ id: taskId, status: task.status, completed_at: task.completed_at });
            return;
          }
        }
        const alreadyAwarded = (task as any).xp_awarded === true;
        if (alreadyAwarded) { playSfx("toggle"); return; }
        const effectivePriority = task.is_daily ? "urgent" : task.priority;
        const result = await addXp.mutateAsync({ taskId: taskId, priority: effectivePriority, partyBonus: hasPartyBonus });
        playSfx("complete");
        playSfx("xp");
        setXpPopup({ amount: result.xpGained });
        if ((result as any).bonusTrophyAwarded) {
          toast("+1 Trofeo 🏆", {
            duration: 2500,
            className: "pyro-trophy-toast",
          });
        }
        if (result.leveledUp) {
          setTimeout(() => playSfx("levelUp"), 600);
          setTimeout(() => setLevelUp(result.level), 800);
          if (result.pointsGained > 0) toast.success(`¡+${result.pointsGained} puntos de atributo!`);
        }
      }
    } catch {
      toast.error("Error al mover tarea");
    }
  };

  const handleReorder = async (taskId: string, newPosition: number) => {
    try {
      await updateTask.mutateAsync({ id: taskId, position: newPosition });
    } catch {
      toast.error("Error al reordenar");
    }
  };

  const handleAddSubtask = async (title: string) => {
    if (!editingTask) return;
    try {
      await createTask.mutateAsync({
        title,
        parent_task_id: editingTask.id,
        project_id: editingTask.project_id,
        position: subtasks.filter((s) => s.parent_task_id === editingTask.id).length,
      });
      toast.success("Subtarea añadida");
    } catch {
      toast.error("Error al crear subtarea");
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const hasPartyBonus = !!party && party.members.some(m => m.status === "accepted");

  const currentWallpaper = WALLPAPERS.find(w => w.id === (profile?.wallpaper || "default"));
  const wallpaperStyle: React.CSSProperties = currentWallpaper?.background
    ? { background: currentWallpaper.background, backgroundAttachment: "fixed" }
    : {};
  const bgAnimations: boolean = (profile as any)?.bg_animations ?? true;
  const wallpaperAnimated = bgAnimations && !!currentWallpaper?.background && currentWallpaper.id !== "default";

  useEffect(() => {
    const cls = getThemeClass((profile as any)?.theme);
    const root = document.documentElement;
    THEME_CLASS_NAMES.forEach((c) => root.classList.remove(c));
    root.classList.add(cls);
    try { if ((profile as any)?.theme) localStorage.setItem("lastTheme", (profile as any).theme); } catch {}
  }, [profile?.theme]);

  useEffect(() => {
    const m = (profile as any)?.mode;
    if (!m) return;
    const root = document.documentElement;
    if (m === "light") root.classList.add("light");
    else root.classList.remove("light");
    try { localStorage.setItem("lastMode", m); } catch {}
  }, [profile?.mode]);

  useEffect(() => {
    try {
      if (profile?.wallpaper) localStorage.setItem("lastWallpaper", profile.wallpaper);
      localStorage.setItem("lastBgAnimations", String(bgAnimations));
    } catch {}
  }, [profile?.wallpaper, bgAnimations]);

  // Hide the floating Pyro assistant on calendar — Pyro lives in the header there.
  useEffect(() => {
    const cls = "hide-pyro-assistant";
    if (currentPage === "calendar") document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [currentPage]);

  return (
    <div className={`flex h-full overflow-hidden ${wallpaperAnimated ? "wp-animated" : ""}`} style={wallpaperStyle}>
      {xpPopup && (
        <XpPopup amount={xpPopup.amount} onComplete={() => setXpPopup(null)} />
      )}
      {levelUp && (
        <LevelUpToast level={levelUp} onComplete={() => setLevelUp(null)} />
      )}

      <PyroLevelUpCutscene />
      <PyroOnboarding />
      <PyroSuggestionsPanel open={suggestionsOpen} onOpenChange={setSuggestionsOpen} />
      {pyroChatOpen && <PyroChat onClose={() => setPyroChatOpen(false)} />}
      <ScheduleBlockDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />

      {currentPage === "calendar" && (
        <button
          type="button"
          onClick={() => { playSfx("open"); setCalendarCreateChoiceOpen(true); }}
          aria-label="Crear en el calendario"
          className="fixed right-4 bottom-24 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      {calendarCreateChoiceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade-in"
          onClick={() => setCalendarCreateChoiceOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl border border-border bg-card p-4 pb-8 shadow-2xl animate-slide-in-up"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/40" />
            <p className="mb-3 text-center font-pixel text-[10px] text-muted-foreground">¿Qué quieres crear?</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setCalendarCreateChoiceOpen(false);
                  playSfx("open");
                  setEditingTask(null);
                  setCalendarDefaultDate(null);
                  setDialogOpen(true);
                }}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-left hover:bg-muted active:scale-[0.99] transition"
              >
                <span className="text-2xl">⚔️</span>
                <div className="flex-1">
                  <div className="font-pixel text-[11px] text-foreground">Nueva Misión</div>
                  <div className="text-[11px] text-muted-foreground">XP, prioridad y racha</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalendarCreateChoiceOpen(false);
                  playSfx("open");
                  setScheduleOpen(true);
                }}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-left hover:bg-muted active:scale-[0.99] transition"
              >
                <span className="text-2xl">📅</span>
                <div className="flex-1">
                  <div className="font-pixel text-[11px] text-foreground">Bloque de Horario</div>
                  <div className="text-[11px] text-muted-foreground">Sólo en el calendario, sin XP</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block md:relative">
        <AppSidebar
          selectedProjectId={selectedProjectId}
          onSelectProject={(id) => { setSelectedProjectId(id); }}
          view={view}
          onViewChange={setView}
          currentPage={
            currentPage === "tasks" || currentPage === "stats" || currentPage === "calendar"
              ? currentPage
              : "tasks"
          }
          onPageChange={(p) => {
            if (p === "calendar" && !isUnlocked("calendar")) return;
            setCurrentPage(p);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      <div
        className="flex flex-1 flex-col overflow-hidden"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div ref={swipeRef} className="relative flex-1 overflow-hidden">
          <div
            className="flex h-full"
            style={{
              width: `${N * 100}%`,
              transform: `translateX(calc(${-swipeIdx * (100 / N)}% + ${dragX}px))`,
              transition: snapping
                ? `transform ${snapping === "back" ? 200 : 250}ms ease-out`
                : "none",
              willChange: "transform",
            }}
          >
            {availablePages.map((page) => {
              const isCal = page === "calendar";
              return (
                <div
                  key={page}
                  className="flex h-full flex-col"
                  style={{ width: `${100 / N}%`, flex: "0 0 auto" }}
                >
                  {page === "tasks" && (
                    <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6 backdrop-blur-sm">
                      <div className="md:hidden flex-1 min-w-0 max-w-[280px] [&_.font-pixel]:!text-[10px] [&_.h-10]:h-12 [&_.w-10]:w-12">
                        <PlayerHUD />
                      </div>
                      <div className="hidden md:block flex-1" />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { playSfx("open"); setPyroChatOpen(true); }}
                          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title="Hablar con Pyro"
                          aria-label="Abrir chat de Pyro"
                        >
                          <PyroSprite size={36} mood="idle" />
                        </button>
                        <Button size="sm" onClick={() => { playSfx("open"); setEditingTask(null); setCalendarDefaultDate(null); setDialogOpen(true); }} onMouseEnter={() => playSfx("hover")} className="font-pixel text-[9px]">
                          <Plus className="mr-1 h-4 w-4" /> Nueva misión
                        </Button>
                      </div>
                    </header>
                  )}
                  <div
                    className={`flex-1 overflow-auto ${isCal ? "p-0 pb-20" : "p-4 pb-24 md:p-6 md:pb-6"}`}
                  >
                    {page === "shop" ? (
                      <Shop embedded />
                    ) : page === "leagues" ? (
                      <Leagues embedded />
                    ) : page === "social" ? (
                      <SocialPanel embedded />
                    ) : page === "clans" ? (
                      <ClansPanel embedded />
                    ) : page === "wallpaper" ? (
                      <WallpaperSelector embedded />
                    ) : page === "stats" ? (
                      <AchievementsView tasks={allTasks} />
                    ) : page === "calendar" ? (
                      <div className="relative h-full w-full">
                        <CalendarView
                          tasks={calendarTasks}
                          projects={projects}
                          onCreateAt={(d) => { setEditingTask(null); setCalendarDefaultDate(d); setDialogOpen(true); }}
                          onEditTask={(t) => { setEditingTask(t); setCalendarDefaultDate(null); setDialogOpen(true); }}
                          onDeleteTask={handleDeleteTask}
                        />
                      </div>
                    ) : (
                      <>
                        {!selectedProjectId && (
                          <DailyQuestPanel
                            dailyTasks={dailyMissions}
                            onToggleComplete={handleToggleComplete}
                            onDeleteTask={handleDeleteTask}
                            onEditTask={(t) => { setEditingTask(t); setDialogOpen(true); }}
                            dailyStreak={profile?.daily_streak ?? 0}
                            allCompleted={allDailyCompleted}
                            bonusClaimed={dailyBonusClaimed}
                            onClaimBonus={handleClaimDailyBonus}
                            unopenedChests={unopenedChests}
                            onOpenChest={triggerOpenChest}
                          />
                        )}
                        {view === "kanban" ? (
                          <KanbanView
                            tasks={filteredTasks}
                            subtasks={subtasks}
                            projects={projects}
                            onToggleComplete={handleToggleComplete}
                            onEdit={(t) => { setEditingTask(t); setDialogOpen(true); }}
                            onDelete={handleDeleteTask}
                            onToggleSubtask={handleToggleComplete}
                            onMoveTask={handleMoveTask}
                          />
                        ) : (
                          <ListView
                            tasks={filteredTasks}
                            subtasks={subtasks}
                            projects={projects}
                            onToggleComplete={handleToggleComplete}
                            onEdit={(t) => { setEditingTask(t); setDialogOpen(true); }}
                            onDelete={handleDeleteTask}
                            onToggleSubtask={handleToggleComplete}
                            onReorder={handleReorder}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TaskDialog
        key={editingTask?.id ?? (dialogOpen ? "new" : "closed")}
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) { playSfx("close"); setEditingTask(null); setCalendarDefaultDate(null); } }}
        task={editingTask}
        projects={projects}
        defaultProjectId={selectedProjectId}
        defaultDate={calendarDefaultDate}
        onSave={handleSaveTask}
        onAddSubtask={editingTask ? handleAddSubtask : undefined}
        subtasks={editingTask ? subtasks.filter((s) => s.parent_task_id === editingTask.id) : []}
      />

      <MobileBottomNav
        currentPage={currentPage}
        onPageChange={(p) => {
          if (p === "calendar" && !isUnlocked("calendar")) return;
          setCurrentPage(p);
          setSelectedProjectId(null);
        }}
        socialBadge={(pendingRequests?.length ?? 0) + (partyInvites?.length ?? 0)}
        swipeTargetPage={swipeTargetPage}
        swipeProgress={swipeProgress}
        unlocked={{
          calendar: isUnlocked("calendar"),
          stats: true,
          shop: isUnlocked("shop"),
          leagues: isUnlocked("leagues"),
          social: isUnlocked("social"),
          clans: isUnlocked("clans"),
        }}
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
