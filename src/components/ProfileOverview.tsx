import { Flame, LogOut, Trophy } from "lucide-react";
import { Destello } from "@/components/currency/Destello";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import PlayerHUD from "@/components/PlayerHUD";

/** Profile summary at the top of the Perfil section. */
const ProfileOverview = () => {
  const { profile } = useProfile();

  const stats = [
    { icon: Flame, label: "Racha", value: profile?.daily_streak ?? 0, className: "text-warning" },
    { icon: Trophy, label: "Trofeos", value: profile?.trophies ?? 0, className: "text-primary" },
    { icon: ({ className }: { className?: string }) => <Destello size={20} twinkle className={className} />, label: "Destellos", value: profile?.coins ?? 0, className: "" },
  ];

  return (
    <div className="surface space-y-4 p-4">
      <PlayerHUD />

      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ icon: Icon, label, value, className }) => (
          <div key={label} className="rounded-xl bg-muted/60 px-2 py-2.5 text-center">
            <Icon className={`mx-auto h-5 w-5 ${className}`} />
            <p className="mt-1 font-serif text-xl font-medium leading-none tabular-nums">{value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Quiet sign-out at the end of Perfil → Estilo (desktop has it in the side bar). */
export const SignOutLink = () => {
  const { signOut } = useAuth();
  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="mx-auto mt-6 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive md:hidden"
    >
      <LogOut className="h-4 w-4" /> Cerrar sesión
    </button>
  );
};

export default ProfileOverview;
