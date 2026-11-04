import { useState } from "react";
import { Plus, FolderKanban, BarChart3, LayoutList, Columns3, Search, LogOut, User, ChevronDown, Sword, Scroll, CalendarDays, ShoppingBag, Shield, Lock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SocialPanel from "@/components/SocialPanel";
import ClansPanel from "@/components/ClansPanel";
import WallpaperSelector from "@/components/WallpaperSelector";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useProjects } from "@/hooks/useProjects";
import { usePyroProgression } from "@/hooks/usePyroProgression";
import PlayerHUD from "@/components/PlayerHUD";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playSfx } from "@/lib/sfx";

const PROJECT_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4"];

/** Wraps a sidebar entry with a chains/padlock overlay + tooltip when locked. */
function LockedShell({ locked, message, children }: { locked: boolean; message: string; children: React.ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="pyro-locked relative cursor-help select-none"
            role="button"
            tabIndex={0}
            aria-label={message}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="pointer-events-none opacity-50 grayscale">{children}</div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-lg border-2 border-dashed border-primary/40"
              style={{ backgroundImage: "repeating-linear-gradient(45deg, hsl(var(--primary)/0.08) 0 4px, transparent 4px 8px)" }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary drop-shadow-[0_0_6px_hsl(var(--primary))]" aria-hidden="true" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-pixel text-[9px] max-w-[220px] leading-relaxed">
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const LOCK_MSG = {
  social: "Pyro necesita llegar al nivel 2 para despertar las conexiones sociales 🔥",
  clans: "Pyro necesita llegar al nivel 3 para forjar alianzas 🔥",
  leagues: "Pyro necesita llegar al nivel 4 para competir en las grandes ligas 🔥",
};

interface AppSidebarProps {
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  view: "list" | "kanban";
  onViewChange: (view: "list" | "kanban") => void;
  currentPage: "tasks" | "stats" | "calendar";
  onPageChange: (page: "tasks" | "stats" | "calendar") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const AppSidebar = ({
  selectedProjectId,
  onSelectProject,
  view,
  onViewChange,
  currentPage,
  onPageChange,
  searchQuery,
  onSearchChange,
}: AppSidebarProps) => {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { projects, createProject, deleteProject } = useProjects();
  const { isUnlocked } = usePyroProgression();
  const navigate = useNavigate();
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await createProject.mutateAsync({ name: newProjectName.trim(), color: newProjectColor, position: projects.length });
      setNewProjectName("");
      setDialogOpen(false);
      toast.success("Proyecto creado");
    } catch {
      toast.error("Error al crear proyecto");
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* Player HUD */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-start justify-between mb-3">
          <PlayerHUD className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground shrink-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tareas..."
            className="pl-9 h-9 bg-sidebar-accent border-0 text-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Nav */}
      <div className="px-3 space-y-1">
        <button
          onClick={() => { playSfx("nav"); onPageChange("tasks"); onSelectProject(null); }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            currentPage === "tasks" && !selectedProjectId ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Sword className="h-4 w-4" /> <span className="font-pixel text-[9px]">Misiones</span>
        </button>
        {isUnlocked("calendar") && <button
          onClick={() => { playSfx("nav"); onPageChange("calendar"); onSelectProject(null); }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            currentPage === "calendar" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <CalendarDays className="h-4 w-4" /> <span className="font-pixel text-[9px]">Calendario</span>
        </button>}
        <button
          onClick={() => { playSfx("nav"); onPageChange("stats"); }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            currentPage === "stats" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Scroll className="h-4 w-4" /> <span className="font-pixel text-[9px]">Logros</span>
        </button>
        {isUnlocked("shop") && <button
          onClick={() => { playSfx("nav"); navigate("/shop"); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <ShoppingBag className="h-4 w-4" /> <span className="font-pixel text-[9px]">Tienda</span>
        </button>}
        <LockedShell locked={!isUnlocked("leagues")} message={LOCK_MSG.leagues}>
          <button
            onClick={() => { playSfx("nav"); navigate("/leagues"); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <Shield className="h-4 w-4" /> <span className="font-pixel text-[9px]">Ligas</span>
          </button>
        </LockedShell>
      </div>

      {/* View toggle removed - only list view available */}

      {/* Social & Wallpapers */}
      <div className="px-3 space-y-1 mt-2">
        <LockedShell locked={!isUnlocked("social")} message={LOCK_MSG.social}>
          {isUnlocked("social") ? <SocialPanel /> : (
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50">
              <Users className="h-4 w-4" /> <span className="font-pixel text-[9px]">Social</span>
            </button>
          )}
        </LockedShell>
        <LockedShell locked={!isUnlocked("clans")} message={LOCK_MSG.clans}>
          {isUnlocked("clans") ? <ClansPanel /> : (
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50">
              <Shield className="h-4 w-4" /> <span className="font-pixel text-[9px]">Clanes</span>
            </button>
          )}
        </LockedShell>
        <WallpaperSelector />
      </div>

      <div className="flex-1" />
    </div>
  );
};

export default AppSidebar;
