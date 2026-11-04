import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const VIEW = 260; // on-screen crop circle (px)
const OUT = 512; // exported image size (px)

interface PhotoCropDialogProps {
  file: File | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

/** Drag to position and slide to zoom; exports a square WebP of the circle area. */
const PhotoCropDialog = ({ file, saving, onCancel, onConfirm }: PhotoCropDialogProps) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const scale = img ? (VIEW / Math.min(img.naturalWidth, img.naturalHeight)) * zoom : 1;
  const w = img ? img.naturalWidth * scale : VIEW;
  const h = img ? img.naturalHeight * scale : VIEW;

  // Keep the image covering the whole circle.
  const clamp = (x: number, y: number) => ({
    x: Math.max(-(w - VIEW) / 2, Math.min((w - VIEW) / 2, x)),
    y: Math.max(-(h - VIEW) / 2, Math.min((h - VIEW) / 2, y)),
  });

  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setOffset(clamp(d.ox + e.clientX - d.x, d.oy + e.clientY - d.y));
  };
  const onPointerUp = () => { drag.current = null; };

  const confirm = () => {
    if (!img) return;
    const left = VIEW / 2 - w / 2 + offset.x;
    const top = VIEW / 2 - h / 2 + offset.y;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -left / scale, -top / scale, VIEW / scale, VIEW / scale, 0, 0, OUT, OUT);
    canvas.toBlob((blob) => blob && onConfirm(blob), "image/webp", 0.86);
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open && !saving) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-medium">Ajusta tu foto</DialogTitle>
        </DialogHeader>

        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-full bg-muted"
          style={{ width: VIEW, height: VIEW, cursor: drag.current ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img ? (
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ width: w, height: h, left: VIEW / 2 - w / 2 + offset.x, top: VIEW / 2 - h / 2 + offset.y }}
            />
          ) : (
            <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="px-2">
          <p className="mb-2 text-center text-xs text-muted-foreground">Arrastra para mover · desliza para acercar</p>
          <Slider value={[zoom]} min={1} max={3} step={0.01} onValueChange={([z]) => setZoom(z)} aria-label="Zoom" />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={confirm} disabled={!img || saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Revisando…</> : "Usar foto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoCropDialog;
