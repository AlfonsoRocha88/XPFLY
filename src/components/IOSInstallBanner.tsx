import { useEffect, useState } from "react";
import { isIos, isStandalone } from "@/lib/pwa";
import { X, Share } from "lucide-react";
import { Button } from "./ui/button";

const STORAGE_KEY = "xpfly_ios_install_banner_dismissed";

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isIos() || isStandalone()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {}
    const t = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[200] animate-fade-in" role="dialog" aria-live="polite">
      <div className="relative rounded-3xl bg-card backdrop-blur-md p-3 pr-9 shadow-lift">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-2">
          <Share className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-foreground">
            <span className="font-pixel text-xs text-primary">Instala XPFly</span>
            <br />
            toca compartir y selecciona <strong>'Añadir a pantalla de inicio'</strong> 🔥
          </p>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="ghost" onClick={dismiss} className="font-pixel text-xs h-7">
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}