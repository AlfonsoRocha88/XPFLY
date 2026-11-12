import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { isIos } from "@/lib/pwa";
import { statusUrl, useFocus } from "@/hooks/useFocus";
import { SILENCE_KEY } from "./FocusCard";

const read = (k: string) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };
const write = (k: string, on: boolean) => { try { localStorage.setItem(k, on ? "1" : "0"); } catch { /* ignore */ } };

/** One step of the Shortcuts recipe. `name` is the exact label to search for in Atajos. */
const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{n}</span>
    <span className="text-sm leading-relaxed">{children}</span>
  </li>
);
const Name = ({ children }: { children: React.ReactNode }) => <span className="font-semibold">{children}</span>;

const Row = ({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-start justify-between gap-4 rounded-2xl bg-foreground/[0.04] p-4">
    <span>
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
    </span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
);

const FocusSetupSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { settings, setLockUntilDailies, pause, regenerateLink } = useFocus();
  const [silence, setSilence] = useState(() => read(SILENCE_KEY));
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const link = settings ? statusUrl(settings.token) : "";
  const ios = isIos();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar. Mantén presionado el enlace para copiarlo.");
    }
  };

  // Calls the same link the shortcut uses, so the user sees exactly what their phone will get.
  const test = async () => {
    setTesting(true);
    try {
      const reply = (await (await fetch(link, { cache: "no-store" })).text()).trim();
      write("focusShortcutReady", true);
      toast(reply === "ok" ? "Ahora mismo tus apps abrirían normal." : reply, { duration: 6000 });
    } catch {
      toast.error("No hay conexión para probar el enlace.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-[1.75rem] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" aria-hidden />
        <SheetHeader className="text-left">
          <SheetTitle className="font-serif text-2xl font-medium">Bloqueo de apps</SheetTitle>
          <SheetDescription>
            Cuando abras Instagram, TikTok o la app que elijas, tu iPhone te regresa a la pantalla de inicio hasta que termines tus diarias o acabe tu modo enfoque.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          <Row
            title="Bloquear hasta terminar mis diarias"
            desc="Como Duolingo: primero tus tareas del día, luego tus apps."
            checked={!!settings?.lock_until_dailies}
            onChange={setLockUntilDailies}
          />
          <Row
            title="Silenciar notificaciones en modo enfoque"
            desc="Activa No molestar mientras dura la sesión (necesita el atajo del paso 3)."
            checked={silence}
            onChange={(v) => { setSilence(v); write(SILENCE_KEY, v); }}
          />
        </div>

        {!ios && (
          <p className="mt-5 rounded-2xl bg-warning/10 p-4 text-sm text-foreground">
            El bloqueo de apps funciona en iPhone, con la app Atajos. En este dispositivo puedes usar el modo enfoque como temporizador.
          </p>
        )}

        <h3 className="mt-7 text-sm font-semibold text-muted-foreground">1. Tu enlace privado</h3>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-foreground/[0.05] px-3 py-2.5 text-xs" title={link}>{link || "Cargando…"}</code>
          <button type="button" onClick={copy} disabled={!link} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground" aria-label="Copiar enlace">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">No lo compartas: con él, cualquiera podría ver si tienes apps bloqueadas.</p>

        <h3 className="mt-7 text-sm font-semibold text-muted-foreground">2. Crea la automatización (una sola vez)</h3>
        <ol className="mt-3 space-y-3">
          <Step n={1}>Abre <Name>Atajos</Name> → pestaña <Name>Automatización</Name> → <Name>+</Name> → <Name>App</Name>.</Step>
          <Step n={2}>Elige las apps que quieres bloquear, marca <Name>Se abre</Name> y selecciona <Name>Ejecutar de inmediato</Name>.</Step>
          <Step n={3}>Toca <Name>Siguiente</Name> → <Name>Nueva automatización en blanco</Name> y agrega <Name>Obtener contenido de URL</Name>. Pega tu enlace.</Step>
          <Step n={4}>Agrega <Name>Si</Name>: «Contenido de URL» <Name>no es</Name> <code className="rounded bg-foreground/[0.06] px-1">ok</code>.</Step>
          <Step n={5}>Dentro del <Name>Si</Name>, agrega <Name>Mostrar notificación</Name> con «Contenido de URL» y después <Name>Ir a la pantalla de inicio</Name>.</Step>
        </ol>

        <h3 className="mt-7 text-sm font-semibold text-muted-foreground">3. Opcional: silenciar notificaciones</h3>
        <ol className="mt-3 space-y-3">
          <Step n={1}>En <Name>Atajos</Name>, crea un atajo nuevo llamado exactamente <Name>XPFly Enfoque</Name>.</Step>
          <Step n={2}>Agrega <Name>Ajustar fecha</Name>: sumar «Entrada del atajo» minutos a «Fecha actual».</Step>
          <Step n={3}>Agrega <Name>Definir concentración</Name>: <Name>No molestar</Name>, activado hasta «Fecha ajustada».</Step>
        </ol>

        <div className="mt-7 grid gap-2">
          <button type="button" onClick={test} disabled={!link || testing} className="h-12 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {testing ? "Probando…" : "Probar mi enlace"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { pause(15); toast("Bloqueo en pausa por 15 minutos."); }} className="h-11 rounded-2xl bg-foreground/[0.05] text-sm font-semibold">
              Pausar 15 min
            </button>
            <button
              type="button"
              onClick={() => { regenerateLink(); toast("Enlace nuevo creado. Pégalo en tu automatización."); }}
              className={cn("flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-foreground/[0.05] text-sm font-semibold")}
            >
              <RefreshCw className="h-4 w-4" /> Enlace nuevo
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusSetupSheet;
