import { useState } from "react";
import { Copy, Users, Lock, Unlock, MailQuestion, MoreVertical, Share2, LogOut, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmblemSVG from "./EmblemSVG";
import type { Clan } from "@/hooks/useClans";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClanRole } from "@/lib/clan-roles";

const JOIN_LABEL = {
  open: { label: "Abierto", icon: Unlock, cls: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40" },
  request: { label: "Por solicitud", icon: MailQuestion, cls: "bg-amber-400/15 text-amber-300 ring-amber-400/40" },
  closed: { label: "Cerrado", icon: Lock, cls: "bg-rose-400/15 text-rose-300 ring-rose-400/40" },
} as const;

interface ClanHeaderProps {
  clan: Clan;
  viewerRole?: ClanRole | null;
  onShare?: () => void;
  onLeave?: () => void;
  onDissolve?: () => void;
  onEdit?: () => void;
}

const ClanHeader = ({ clan, viewerRole, onShare, onLeave, onDissolve, onEdit }: ClanHeaderProps) => {
  const join = JOIN_LABEL[clan.join_type];
  const JoinIcon = join.icon;
  const isLeader = viewerRole === "leader";
  const xpForNext = clan.level * 100;
  const xpInLevel = clan.xp % xpForNext;
  const pct = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));
  const [copied, setCopied] = useState(false);

  const copyTag = async () => {
    try {
      await navigator.clipboard.writeText(clan.tag);
      setCopied(true);
      toast.success(`Código #${clan.tag} copiado`);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-md">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{ background: `radial-gradient(120% 80% at 0% 0%, ${clan.emblem_config.primary}40, transparent 60%)` }}
      />
      <div className="absolute right-2 top-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Más opciones" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onShare && (
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="mr-2 h-4 w-4" /> Compartir clan
              </DropdownMenuItem>
            )}
            {onLeave && (
              <DropdownMenuItem onClick={onLeave}>
                <LogOut className="mr-2 h-4 w-4" /> Salir del clan
              </DropdownMenuItem>
            )}
            {isLeader && onDissolve && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDissolve} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar clan
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="relative flex items-start gap-4">
        <div className="shrink-0">
          <EmblemSVG config={clan.emblem_config} size={92} glow />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <h2 className="truncate text-2xl font-serif font-medium tracking-tight text-foreground">{clan.name}</h2>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1", join.cls)}>
              <JoinIcon className="h-3 w-3" /> {join.label}
            </span>
            {isLeader && onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/30 transition-colors hover:bg-primary/25"
              >
                <Pencil className="h-3 w-3" /> Modificar
              </button>
            )}
          </div>
          <button
            onClick={copyTag}
            className="mt-1 inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-xs font-mono text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Copiar código del clan"
          >
            <span>#{clan.tag}</span>
            <Copy className={cn("h-3 w-3", copied && "text-emerald-400")} />
          </button>
          {clan.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{clan.description}</p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-xs tracking-wide text-muted-foreground">
                <span>Nivel {clan.level}</span>
                <span>{xpInLevel}/{xpForNext} XP</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex items-end justify-end gap-1.5 text-sm font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{clan.member_count}</span>
              <span className="text-muted-foreground">/ {clan.max_members}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClanHeader;

/** Minimal one-row header for non-Members tabs. */
export const ClanHeaderCompact = ({
  clan,
  viewerRole,
  onShare,
  onLeave,
  onDissolve,
}: ClanHeaderProps) => {
  const isLeader = viewerRole === "leader";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/70 px-3 py-2">
      <EmblemSVG config={clan.emblem_config} size={36} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{clan.name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Más opciones" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onShare && (
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" /> Compartir clan
            </DropdownMenuItem>
          )}
          {onLeave && (
            <DropdownMenuItem onClick={onLeave}>
              <LogOut className="mr-2 h-4 w-4" /> Salir del clan
            </DropdownMenuItem>
          )}
          {isLeader && onDissolve && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDissolve} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar clan
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};