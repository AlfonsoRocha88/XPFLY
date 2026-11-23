import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ChevronLeft, ClipboardPaste, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoTip, InfoRow } from "@/components/ui/info-tip";
import { playSfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { useCalendarFeeds, type CalendarProvider } from "@/hooks/useCalendarFeeds";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* ---------------- Brand-ish icons (inline, no assets) ---------------- */

const GoogleCalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden>
    <rect x="6" y="6" width="36" height="36" rx="5" fill="#fff" />
    <path d="M6 14V11a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v3z" fill="#4285F4" />
    <path d="M6 34v3a5 5 0 0 0 5 5h3v-8z" fill="#188038" />
    <path d="M34 42h3a5 5 0 0 0 5-5v-3h-8z" fill="#EA4335" />
    <path d="M42 34V14h-8v20z" fill="#FBBC04" />
    <text x="20" y="34" textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif" fill="#4285F4">31</text>
  </svg>
);

const AppleCalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden>
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#fff" />
    <text x="24" y="17" textAnchor="middle" fontSize="8" fontWeight="600" fontFamily="system-ui, sans-serif" fill="#FF3B30" letterSpacing="0.5">LUN</text>
    <text x="24" y="38" textAnchor="middle" fontSize="20" fontWeight="300" fontFamily="system-ui, sans-serif" fill="#1c1c1e">23</text>
  </svg>
);

const OutlookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden>
    <rect x="18" y="8" width="26" height="32" rx="3" fill="#28A8EA" />
    <rect x="18" y="8" width="26" height="10" rx="3" fill="#0364B8" />
    <path d="M18 24h26v13a3 3 0 0 1-3 3H18z" fill="#0078D4" />
    <rect x="4" y="13" width="24" height="24" rx="4" fill="#0F6CBD" />
    <ellipse cx="16" cy="25" rx="6" ry="7" fill="none" stroke="#fff" strokeWidth="3" />
  </svg>
);

type ProviderInfo = { id: CalendarProvider; name: string; icon: (p: { className?: string }) => ReactNode; link?: string; steps: string[] };

const PROVIDERS: ProviderInfo[] = [
  {
    id: "google", name: "Google", icon: GoogleCalIcon,
    link: "https://calendar.google.com/calendar/r/settings",
    steps: ["Abre Configuración", "Elige tu calendario", "Copia la Dirección secreta en formato iCal"],
  },
  {
    id: "iphone", name: "iPhone", icon: AppleCalIcon,
    steps: ["Calendario → Calendarios", "Toca ⓘ junto al calendario", "Calendario público → Compartir enlace"],
  },
  {
    id: "outlook", name: "Outlook", icon: OutlookIcon,
    link: "https://outlook.live.com/calendar/0/options/calendar/SharedCalendars",
    steps: ["Abre Calendarios compartidos", "Publica tu calendario", "Copia el link ICS"],
  },
];

const looksLikeCalendarLink = (s: string) => /^(https?|webcals?):\/\//i.test(s.trim());

/* ---------------- Sheet ---------------- */

export default function ConnectCalendar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { connectByLink, connectGoogle } = useCalendarFeeds();
  const reduce = useReducedMotion();
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start fresh each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setProvider(null); setManual(false); setValue(""); setError(null); setBusy(false); setGoogleBusy(false);
  }, [open]);

  useEffect(() => { if (manual) inputRef.current?.focus(); }, [manual]);

  const pick = async (p: ProviderInfo) => {
    setError(null); setManual(false); setValue("");
    if (p.id !== "google") { setProvider(p); return; }
    setGoogleBusy(true);
    try {
      const r = await connectGoogle();
      if (r === "not_configured") setProvider(p); // no OAuth yet: paste the secret iCal link instead
    } catch {
      setProvider(p);
    } finally {
      setGoogleBusy(false);
    }
  };

  const connect = async (raw: string) => {
    if (!provider) return;
    const url = raw.trim();
    if (!looksLikeCalendarLink(url)) { setError("Ese no es un link válido"); setManual(true); return; }
    setBusy(true); setError(null);
    try {
      const { count } = await connectByLink(url, provider.id);
      playSfx("achievement");
      toast(`✓ ${count} eventos importados`);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar");
      setValue(url);
      setManual(true);
    } finally {
      setBusy(false);
    }
  };

  // Must run inside the tap handler: iOS only allows clipboard reads from a user gesture.
  const paste = async () => {
    let text = "";
    try { text = (await navigator.clipboard.readText()).trim(); } catch { /* denied or unsupported */ }
    if (text && looksLikeCalendarLink(text)) { void connect(text); return; }
    if (text) setValue(text);
    setManual(true);
  };

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : (dir: number) => ({ initial: { opacity: 0, x: 24 * dir }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 * dir } });
  const motionFor = (dir: number) => (typeof slide === "function" ? slide(dir) : slide);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[88dvh] max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:bottom-4 sm:rounded-3xl">
        <div className="mb-4 flex items-center gap-2 pr-8">
          {provider && (
            <button
              onClick={() => { setProvider(null); setError(null); setManual(false); }}
              className="-ml-1.5 flex h-8 w-8 touch-manipulation select-none items-center justify-center rounded-full text-muted-foreground transition-[color,transform] duration-150 hover:text-foreground active:scale-90"
              aria-label="Volver"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <SheetTitle className="text-lg font-semibold">{provider ? provider.name : "Conectar calendario"}</SheetTitle>
          {!provider && (
            <InfoTip title="Calendarios" align="start">
              <InfoRow icon="👀">Solo lectura: tus eventos aparecen junto a tus tareas.</InfoRow>
              <InfoRow icon="🔄">Se actualizan solos cada pocas horas.</InfoRow>
            </InfoTip>
          )}
          <SheetDescription className="sr-only">Elige de dónde importar tus eventos</SheetDescription>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!provider ? (
            <m.div key="pick" {...motionFor(-1)} transition={{ duration: 0.22, ease: EASE_OUT }} className="grid grid-cols-3 gap-2.5">
              {PROVIDERS.map((p) => {
                const Icon = p.icon;
                const loading = p.id === "google" && googleBusy;
                return (
                  <button
                    key={p.id}
                    onClick={() => void pick(p)}
                    disabled={googleBusy}
                    className="glass flex touch-manipulation select-none flex-col items-center gap-2 rounded-2xl px-2 py-4 text-sm font-medium transition-[transform,opacity] duration-150 active:scale-[0.96] disabled:opacity-60"
                  >
                    <span className="relative flex h-12 w-12 items-center justify-center">
                      <Icon className={cn("h-12 w-12 drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-opacity", loading && "opacity-30")} />
                      {loading && <Loader2 className="absolute h-5 w-5 animate-spin text-foreground" />}
                    </span>
                    {p.name}
                  </button>
                );
              })}
            </m.div>
          ) : (
            <m.div key={provider.id} {...motionFor(1)} transition={{ duration: 0.22, ease: EASE_OUT }} className="space-y-4">
              <ol className="space-y-2">
                {provider.steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold tabular-nums text-primary ring-1 ring-primary/30">{i + 1}</span>
                    <span className="min-w-0">{s}</span>
                  </li>
                ))}
              </ol>

              {provider.link && (
                <Button asChild variant="outline" className="w-full rounded-xl">
                  <a href={provider.link} target="_blank" rel="noreferrer noopener">
                    <ExternalLink className="h-4 w-4" /> Abrir {provider.name}
                  </a>
                </Button>
              )}

              {!manual ? (
                <Button onClick={() => void paste()} disabled={busy} className="h-12 w-full touch-manipulation rounded-xl text-base font-semibold active:scale-[0.98]">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ClipboardPaste className="h-5 w-5" />} Pegar link
                </Button>
              ) : (
                <m.form
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  onSubmit={(e) => { e.preventDefault(); void connect(value); }}
                  className="flex gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(null); }}
                    placeholder="https://…"
                    type="url"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    aria-invalid={!!error}
                    className={cn("h-12 rounded-xl text-base", error && "border-destructive focus-visible:ring-destructive/50")}
                  />
                  <Button type="submit" disabled={busy || !value.trim()} className="h-12 shrink-0 rounded-xl px-4 font-semibold">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
                  </Button>
                </m.form>
              )}

              <AnimatePresence>
                {error && (
                  <m.p
                    key={error}
                    role="alert"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, x: [6, -4, 2, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm font-medium text-destructive"
                  >
                    {error}
                  </m.p>
                )}
              </AnimatePresence>
            </m.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
