import { useEffect } from "react";
import { useState } from "react";
import { Palette, Check, Sparkles, Sun, Moon, Zap } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { WALLPAPERS } from "@/lib/wallpapers";
import { APP_THEMES } from "@/lib/themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WallpaperSelectorProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
  embedded?: boolean;
}

const WallpaperSelector = ({ open: openProp, onOpenChange, hideTrigger, embedded = false }: WallpaperSelectorProps = {}) => {
  const { profile, updateProfile } = useProfile();
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => { if (onOpenChange) onOpenChange(v); else setOpenInternal(v); };
  const currentWallpaper = profile?.wallpaper || "default";
  const currentTheme = (profile as any)?.theme || "system-cyan";
  const mode: "dark" | "light" = ((profile as any)?.mode === "light" ? "light" : "dark");
  const bgAnimations: boolean = (profile as any)?.bg_animations ?? true;

  const setMode = async (m: "dark" | "light") => {
    try {
      await updateProfile.mutateAsync({ mode: m } as any);
    } catch {}
  };

  const setBgAnimations = async (v: boolean) => {
    try {
      await updateProfile.mutateAsync({ bg_animations: v } as any);
    } catch {}
  };

  const handleSelect = async (wallpaperId: string) => {
    try {
      await updateProfile.mutateAsync({ wallpaper: wallpaperId } as any);
    } catch {}
  };

  const handleSelectTheme = async (themeId: string) => {
    try {
      await updateProfile.mutateAsync({ theme: themeId } as any);
    } catch {}
  };

  const body = (
      <Tabs defaultValue="theme" className="mt-2">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="theme" className="font-pixel text-[8px]">
            <Sparkles className="mr-1 h-3 w-3" /> Tema
          </TabsTrigger>
          <TabsTrigger value="wallpaper" className="font-pixel text-[8px]">
            <Palette className="mr-1 h-3 w-3" /> Fondos
          </TabsTrigger>
          <TabsTrigger value="mode" className="font-pixel text-[8px]">
            {mode === "dark" ? <Moon className="mr-1 h-3 w-3" /> : <Sun className="mr-1 h-3 w-3" />} Modo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="theme" className="mt-3">
          <p className="text-[9px] font-pixel text-muted-foreground mb-2">Color principal de la app</p>
          <div className="grid grid-cols-3 gap-2">
            {APP_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTheme(t.id)}
                className={cn(
                  "relative rounded-lg border-2 p-3 transition-all text-left",
                  currentTheme === t.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                )}
              >
                <div
                  className="h-8 w-full rounded-md mb-2"
                  style={{ background: t.swatch, boxShadow: `0 0 12px ${t.swatch}` }}
                />
                <p className="text-[8px] font-pixel truncate">{t.name}</p>
                {currentTheme === t.id && (
                  <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
                )}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="wallpaper" className="mt-3">
          <p className="text-[9px] font-pixel text-muted-foreground mb-2">Fondos abstractos que combinan con tu tema</p>
          <div className="grid grid-cols-3 gap-2">
            {WALLPAPERS.map((wp) => (
          <button
            key={wp.id}
            onClick={() => handleSelect(wp.id)}
            className={cn(
              "relative rounded-lg overflow-hidden border-2 transition-all aspect-video",
              currentWallpaper === wp.id
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
          >
            <div
              className="w-full h-full"
              style={wp.background ? { background: wp.background } : { background: "hsl(var(--background))" }}
            />
            {currentWallpaper === wp.id && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-1 py-0.5">
              <p className="text-[7px] font-pixel text-center truncate">{wp.name}</p>
            </div>
          </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mode" className="mt-3">
          <p className="text-[9px] font-pixel text-muted-foreground mb-2">Apariencia general de la interfaz</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("dark")}
              className={cn(
                "relative rounded-lg border-2 p-4 transition-all flex flex-col items-center gap-2",
                mode === "dark" ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
              )}
            >
              <div className="h-16 w-full rounded-md flex items-center justify-center" style={{ background: "hsl(222 47% 6%)", border: "1px solid hsl(195 100% 60% / 0.4)" }}>
                <Moon className="h-6 w-6" style={{ color: "hsl(195 100% 60%)" }} />
              </div>
              <p className="text-[9px] font-pixel">Oscuro</p>
              {mode === "dark" && <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />}
            </button>
            <button
              onClick={() => setMode("light")}
              className={cn(
                "relative rounded-lg border-2 p-4 transition-all flex flex-col items-center gap-2",
                mode === "light" ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
              )}
            >
              <div className="h-16 w-full rounded-md flex items-center justify-center" style={{ background: "hsl(210 30% 96%)", border: "1px solid hsl(195 80% 45% / 0.5)" }}>
                <Sun className="h-6 w-6" style={{ color: "hsl(35 95% 55%)" }} />
              </div>
              <p className="text-[9px] font-pixel">Claro</p>
              {mode === "light" && <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[9px] font-pixel">Animar fondo</p>
                <p className="text-[8px] text-muted-foreground">Desactiva para máxima fluidez</p>
              </div>
            </div>
            <Switch checked={bgAnimations} onCheckedChange={setBgAnimations} />
          </div>
        </TabsContent>
      </Tabs>
  );

  if (embedded) {
    return (
      <div className="mx-auto w-full max-w-lg pb-24">
        <div className="mb-3 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h1 className="font-pixel text-xs">Personalización</h1>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50">
          <Palette className="h-4 w-4" />
          <span className="font-pixel text-[9px]">Personalización</span>
        </button>
      </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-pixel text-xs flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Personalización
          </DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default WallpaperSelector;
