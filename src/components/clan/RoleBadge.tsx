import { Crown, Star, Award, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLAN_ROLE_LABEL, CLAN_ROLE_STYLE, normalizeRole, type ClanRole } from "@/lib/clan-roles";

const ICONS: Record<ClanRole, typeof Crown> = {
  leader: Crown,
  co_leader: Star,
  veteran: Award,
  member: User,
};

const RoleBadge = ({ role, className }: { role: string | null | undefined; className?: string }) => {
  const r = normalizeRole(role);
  const Icon = ICONS[r];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1",
        CLAN_ROLE_STYLE[r],
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {CLAN_ROLE_LABEL[r]}
    </span>
  );
};

export default RoleBadge;