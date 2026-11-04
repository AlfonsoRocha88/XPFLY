import { Check } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { AVATARS, avatarSrc } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";

/** Grid of catalog avatars; picking one saves it to the profile right away. */
const AvatarPicker = () => {
  const { profile, updateProfile } = useProfile();
  const current = avatarSrc(profile?.avatar_url, profile?.user_id);

  const choose = async (src: string) => {
    if (src === current) return;
    playSfx("toggle");
    try {
      await updateProfile.mutateAsync({ avatar_url: src });
    } catch {
      toast.error("No se pudo cambiar el avatar");
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">Elige el animal que te representa. Tus amigos y tu clan lo verán.</p>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6">
        {AVATARS.map((a) => {
          const active = a.src === current;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => choose(a.src)}
              aria-pressed={active}
              className="group flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "relative block rounded-full ring-offset-2 ring-offset-card transition-all duration-200",
                  active ? "ring-[3px] ring-primary" : "group-hover:scale-105",
                )}
              >
                <img src={a.src} alt="" loading="lazy" className="aspect-square w-full rounded-full object-cover" />
                {active && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className={cn("text-xs", active ? "font-semibold text-primary" : "text-muted-foreground")}>{a.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AvatarPicker;
