import { useNavigate } from "react-router-dom";
import { ChevronRight, Coins, Flame, LogOut, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import PlayerHUD from "@/components/PlayerHUD";

/** Profile summary at the top of the Perfil section. */
const ProfileOverview = () => {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const stats = [
    { icon: Flame, label: "Racha", value: profile?.daily_streak ?? 0, className: "text-warning" },
    { icon: Trophy, label: "Trofeos", value: profile?.trophies ?? 0, className: "text-primary" },
    { icon: Coins, label: "Monedas", value: profile?.coins ?? 0, className: "text-xp" },
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

      <div className="flex gap-2">
        <button
          onClick={() => navigate("/character")}
          className="flex flex-1 items-center justify-between rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          Personaje y atributos <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => signOut()}
          className="rounded-xl bg-muted/60 px-3 text-muted-foreground transition-colors hover:text-destructive md:hidden"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ProfileOverview;
