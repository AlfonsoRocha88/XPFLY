import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/**
 * Camera QR reader. Uses the native BarcodeDetector where it exists (Android Chrome) and falls
 * back to jsQR (loaded only when needed) on iOS and desktop. Scans ~6 times a second, not every
 * frame, to keep the phone cool. Stops the camera as soon as it closes.
 */
export function QrScanner({ open, onOpenChange, onResult }: { open: boolean; onOpenChange: (v: boolean) => void; onResult: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    setError(null);

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const BD = (window as unknown as { BarcodeDetector?: new (o: object) => Detector }).BarcodeDetector;
        const native = BD ? new BD({ formats: ["qr_code"] }) : null;
        const jsQR = native ? null : (await import("jsqr")).default;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

        const tick = async () => {
          if (stopped) return;
          if (video.readyState >= 2) {
            let text: string | null = null;
            if (native) {
              const codes = await native.detect(video).catch(() => []);
              text = codes[0]?.rawValue ?? null;
            } else if (jsQR) {
              const w = Math.min(640, video.videoWidth), h = Math.round((w / video.videoWidth) * video.videoHeight);
              canvas.width = w; canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);
              text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
            }
            if (text) { navigator.vibrate?.(30); onResult(text); return; }
          }
          timer = window.setTimeout(tick, 160);
        };
        tick();
      } catch {
        setError("No pude abrir la cámara. Revisa el permiso, o escanea el QR con la cámara de tu celular.");
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onResult]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden p-0">
        <div className="px-5 pt-5">
          <DialogTitle>Escanear QR</DialogTitle>
          <DialogDescription className="sr-only">Escanea el QR de tu amigo</DialogDescription>
        </div>
        <div className="relative mx-5 mb-5 aspect-square overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          {/* Viewfinder: four corners and a sweeping line */}
          <div className="pointer-events-none absolute inset-10">
            {["left-0 top-0 border-l-2 border-t-2 rounded-tl-xl", "right-0 top-0 border-r-2 border-t-2 rounded-tr-xl", "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-xl", "right-0 bottom-0 border-r-2 border-b-2 rounded-br-xl"].map((c) => (
              <span key={c} className={`absolute h-8 w-8 border-white/90 ${c}`} />
            ))}
            <span className="qr-sweep absolute inset-x-2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_hsl(var(--primary))]" />
          </div>
          {error && <p className="absolute inset-x-4 bottom-4 rounded-xl bg-black/70 p-3 text-center text-xs text-white">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
