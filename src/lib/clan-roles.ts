export type ClanRole = "leader" | "co_leader" | "veteran" | "member";

export const CLAN_ROLE_ORDER: ClanRole[] = ["leader", "co_leader", "veteran", "member"];

export const CLAN_ROLE_RANK: Record<ClanRole, number> = {
  leader: 4,
  co_leader: 3,
  veteran: 2,
  member: 1,
};

export const CLAN_ROLE_LABEL: Record<ClanRole, string> = {
  leader: "Líder",
  co_leader: "Co-líder",
  veteran: "Veterano",
  member: "Miembro",
};

/** Tailwind classes per role badge: text + ring + bg tint. */
export const CLAN_ROLE_STYLE: Record<ClanRole, string> = {
  leader: "text-yellow-300 ring-yellow-400/60 bg-yellow-400/10",
  co_leader: "text-slate-200 ring-slate-300/60 bg-slate-300/10",
  veteran: "text-amber-300 ring-amber-400/60 bg-amber-400/10",
  member: "text-muted-foreground ring-border bg-muted/40",
};

export function normalizeRole(r: string | null | undefined): ClanRole {
  if (r === "leader" || r === "co_leader" || r === "veteran" || r === "member") return r;
  // Legacy single-role rows used "member" already; treat unknown as member.
  return "member";
}

export type ClanAction =
  | "edit_clan"
  | "delete_clan"
  | "kick_member"
  | "kick_co_leader"
  | "promote_to_co_leader"
  | "promote_to_veteran"
  | "demote"
  | "accept_request"
  | "invite"
  | "transfer_leadership";

export function canDo(role: ClanRole, action: ClanAction): boolean {
  switch (action) {
    case "edit_clan":
    case "delete_clan":
    case "transfer_leadership":
    case "promote_to_co_leader":
    case "kick_co_leader":
      return role === "leader";
    case "promote_to_veteran":
    case "demote":
      return role === "leader" || role === "co_leader";
    case "accept_request":
      return role === "leader" || role === "co_leader";
    case "kick_member":
      return role === "leader" || role === "co_leader";
    case "invite":
      return role !== "member";
    default:
      return false;
  }
}