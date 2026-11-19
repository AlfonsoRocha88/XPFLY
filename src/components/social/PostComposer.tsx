import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useFeed } from "@/hooks/useFeed";
import { playSfx } from "@/lib/sfx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const CAPTION_MAX = 200;
const LONG_EDGE = 1080;
const RATIO = 4 / 5; // width / height

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

/** Center-crops to 4:5, scales so the long edge is ≤1080px, encodes webp. */
async function compress(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const sw0 = img.naturalWidth, sh0 = img.naturalHeight;
  if (!sw0 || !sh0) throw new Error("decode");
  let sw = sw0, sh = sh0;
  if (sw0 / sh0 > RATIO) sw = Math.round(sh0 * RATIO); else sh = Math.round(sw0 / RATIO);
  const sx = Math.round((sw0 - sw) / 2), sy = Math.round((sh0 - sh) / 2);
  const outH = Math.min(LONG_EDGE, sh);
  const outW = Math.round(outH * RATIO);
  const canvas = document.createElement("canvas");
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
  if (!blob || blob.type !== "image/webp") throw new Error("encode");
  return blob;
}

export function PostComposer({ open, onOpenChange, task }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: { id: string; title: string } | null;
}) {
  const reduce = useReducedMotion();
  const { createPost, isCreating } = useFeed();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [processing, setProcessing] = useState(false);

  // release the preview URL when it changes / on unmount
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // reset when closed
  useEffect(() => {
    if (open) return;
    setBlob(null); setPreview(null); setCaption(""); setProcessing(false);
  }, [open]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProcessing(true);
    try {
      const out = await compress(file);
      setBlob(out);
      setPreview(URL.createObjectURL(out));
    } catch {
      const heic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
      toast.error(heic ? "Formato HEIC no compatible. Usa JPG o PNG" : "No se pudo leer la foto");
    } finally {
      setProcessing(false);
    }
  };

  const clear = () => { setBlob(null); setPreview(null); };

  const publish = async () => {
    if (!blob || isCreating) return;
    try {
      await createPost({ blob, caption: caption.trim() || null, task: task ?? null });
      playSfx("create");
      toast.success("Publicado");
      onOpenChange(false);
    } catch {
      toast.error("No se pudo publicar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isCreating) onOpenChange(v); }}>
      <DialogContent aria-describedby={undefined} className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl p-5">
        <DialogTitle className="text-lg font-semibold">Nueva publicación</DialogTitle>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted/60">
          <AnimatePresence mode="wait" initial={false}>
            {preview ? (
              <m.img
                key={preview}
                src={preview}
                alt=""
                className="h-full w-full object-cover"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : (
              <m.div
                key="pick"
                className="flex h-full w-full flex-col items-center justify-center gap-3 p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {processing ? (
                  <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                ) : (
                  <div className="grid w-full max-w-[16rem] grid-cols-2 gap-3">
                    <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl" onClick={() => cameraRef.current?.click()}>
                      <Camera className="h-6 w-6" />Cámara
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl" onClick={() => galleryRef.current?.click()}>
                      <ImageIcon className="h-6 w-6" />Galería
                    </Button>
                  </div>
                )}
              </m.div>
            )}
          </AnimatePresence>
          {preview && !isCreating && (
            <button
              type="button"
              onClick={clear}
              aria-label="Quitar foto"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {task?.title && (
          <span className="w-fit max-w-full truncate rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            ✓ {task.title}
          </span>
        )}

        <div className="relative">
          <Input
            value={caption}
            maxLength={CAPTION_MAX}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Descripción"
            aria-label="Descripción"
            className="h-11 rounded-xl pr-16 text-base sm:text-sm"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">
            {caption.length}/{CAPTION_MAX}
          </span>
        </div>

        <Button className="h-11 w-full rounded-full" disabled={!blob || isCreating} onClick={publish}>
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default PostComposer;
