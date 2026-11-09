import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { enablePushNotifications } from "@/lib/push";
import { isIos } from "@/lib/pwa";
import { Button } from "@/components/ui/button";

type PushStatus = "on" | "off" | "denied" | "unsupported" | "needs-install";

/** Why push isn't available (or not yet on) on this device. */
function detectStatus(subscribed: boolean): PushStatus {
  if (typeof window === "undefined") return "unsupported";
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  if (isIos() && !standalone) return "needs-install";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return subscribed ? "on" : "off";
}

/**
 * What to tell the player when notifications can't be turned on.
 * Each status needs a short, friendly line (es-MX) that says what happened and what to do.
 */
function describeStatus(status: Exclude<PushStatus, "on" | "off">): string {
  switch (status) {
    case "denied":
      return "Bloqueaste las notificaciones. Actívalas en la configuración de tu navegador para este sitio.";
    case "needs-install":
      return "En iPhone, primero agrega XPFly a tu pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí.";
    case "unsupported":
      return "Este navegador no admite notificaciones. Prueba con Chrome, Edge o Safari actualizado.";
  }
}

/** Opt-in for task reminders and friend / clan alerts. */
const NotificationSettings = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>("off");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      const sub = reg ? await reg.pushManager?.getSubscription() : null;
      if (!cancelled) setStatus(detectStatus(!!sub));
    })().catch(() => setStatus(detectStatus(false)));
    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    if (!user) return;
    setBusy(true);
    const ok = await enablePushNotifications(user.id).catch(() => false);
    setBusy(false);
    const next = detectStatus(ok);
    setStatus(next);
    if (ok) toast.success("Notificaciones activadas");
    else if (next !== "on" && next !== "off") toast.error(describeStatus(next));
    else toast.error("No se pudieron activar. Intenta de nuevo.");
  };

  return (
    <section className="surface p-4">
      <h2 className="section-title">Notificaciones</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Recordatorios de tareas y solicitudes de amigos o de tu clan.
      </p>
      {status === "on" ? (
        <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-semibold text-success">
          <BellRing className="h-4 w-4" /> Activadas en este dispositivo
        </div>
      ) : status === "off" ? (
        <Button onClick={enable} disabled={busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Activar notificaciones
        </Button>
      ) : (
        <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">{describeStatus(status)}</p>
      )}
    </section>
  );
};

export default NotificationSettings;
