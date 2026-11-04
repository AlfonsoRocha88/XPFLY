import { Check, Moon, Sun, Wind } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useColorMode } from "@/hooks/useAppTheme";
import { WALLPAPERS } from "@/lib/wallpapers";
import { APP_THEMES } from "@/lib/themes";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Appearance settings: accent color, background and light/dark mode. */
const WallpaperSelector = () => {
  const { profile, updateProfile } = useProfile();
  const { mode, setMode } = useColorMode();
  const currentWallpaper = profile?.wallpaper || "default";
  const currentTheme = profile?.theme || "system-cyan";
  const bgAnimations = profile?.bg_animations ?? true;

  const save = (patch: { wallpaper?: string; theme?: string; bg_animations?: boolean }) =>
    updateProfile.mutateAsync(patch).catch(() => {});

  return (
    <div className="space-y-6">
      <section className="surface p-4">
        <h2 className="section-title mb-3">Apariencia</h2>
        <div className="grid grid-cols-2 gap-2">
          {([["light", "Claro", Sun], ["dark", "Oscuro", Moon]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-extrabold transition-colors",
                mode === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="section-title">Color</h2>
        <p className="mb-3 text-sm text-muted-foreground">El color principal de botones, barras y detalles.</p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {APP_THEMES.map((t) => {
            const active = currentTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => save({ theme: t.id })}
                className="flex flex-col items-center gap-1.5"
                aria-pressed={active}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-all",
                    active ? "ring-2 ring-foreground/70" : "hover:scale-105",
                  )}
                  style={{ background: t.swatch }}
                >
                  {active && <Check className="h-5 w-5 text-white drop-shadow" strokeWidth={3} />}
                </span>
                <span className="w-full truncate text-center text-[11px] font-bold text-muted-foreground">{t.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="section-title">Fondo</h2>
        <p className="mb-3 text-sm text-muted-foreground">Fondos suaves que combinan con tu color.</p>
        <div className="grid grid-cols-3 gap-2">
          {WALLPAPERS.map((wp) => {
            const active = currentWallpaper === wp.id;
            return (
              <button
                key={wp.id}
                onClick={() => save({ wallpaper: wp.id })}
                className={cn(
                  "relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition-colors",
                  active ? "border-primary" : "border-border hover:border-primary/40",
                )}
              >
                <div className="h-full w-full" style={{ background: wp.background || "hsl(var(--background))" }} />
                {active && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-card/85 py-1 text-center text-[11px] font-bold">{wp.name}</span>
              </button>
            );
          })}
        </div>
        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
          <span className="flex items-center gap-2.5">
            <Wind className="h-4 w-4 text-primary" />
            <span>
              <span className="block text-sm font-bold">Animar fondo</span>
              <span className="block text-xs text-muted-foreground">Desactívalo para máxima fluidez</span>
            </span>
          </span>
          <Switch checked={bgAnimations} onCheckedChange={(v) => save({ bg_animations: v })} />
        </label>
      </section>
    </div>
  );
};

export default WallpaperSelector;
