import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { AVATARS, PHOTO_PREFIX, avatarSrc, isUploadedPhoto } from "@/lib/avatars";
import PhotoCropDialog from "@/components/PhotoCropDialog";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";

const MAX_FILE_MB = 15;

/** Pick a catalog avatar, or upload your own photo from the gallery or camera. */
const AvatarPicker = () => {
  const { profile, updateProfile } = useProfile();
  const current = avatarSrc(profile?.avatar_url, profile?.user_id);
  const uid = profile?.user_id;
  const queryClient = useQueryClient();

  // The user's uploaded photo stays selectable even after switching to an animal.
  const { data: savedPhoto } = useQuery({
    queryKey: ["avatar-photo", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.storage.from("avatars").list(uid!, { search: PHOTO_PREFIX });
      const name = data?.find((f) => f.name.startsWith(PHOTO_PREFIX))?.name;
      return name ? supabase.storage.from("avatars").getPublicUrl(`${uid}/${name}`).data.publicUrl : null;
    },
  });
  const photo = isUploadedPhoto(profile?.avatar_url) ? profile!.avatar_url : savedPhoto ?? null;

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const choose = async (src: string) => {
    if (src === current) return;
    playSfx("toggle");
    try {
      await updateProfile.mutateAsync({ avatar_url: src });
    } catch {
      toast.error("No se pudo cambiar el avatar");
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Elige una imagen");
    if (file.size > MAX_FILE_MB * 1024 * 1024) return toast.error(`La imagen pesa más de ${MAX_FILE_MB} MB`);
    setPending(file);
  };

  const upload = async (blob: Blob) => {
    if (!uid) return;
    setSaving(true);
    try {
      const path = `${uid}/${PHOTO_PREFIX}${Date.now()}.webp`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile.mutateAsync({ avatar_url: data.publicUrl });

      // Keep only the new photo in the user's folder (drops older photos and old AI portraits).
      const { data: files } = await supabase.storage.from("avatars").list(uid);
      const stale = (files ?? []).map((f) => `${uid}/${f.name}`).filter((p) => p !== path);
      if (stale.length) await supabase.storage.from("avatars").remove(stale);

      queryClient.setQueryData(["avatar-photo", uid], data.publicUrl);
      playSfx("create");
      toast.success("Foto actualizada");
      setPending(null);
    } catch {
      toast.error("No se pudo subir la foto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Tu foto</h3>
        <div className="flex items-center gap-3">
          {photo && (
            <button
              type="button"
              onClick={() => choose(photo)}
              aria-pressed={current === photo}
              className={cn(
                "relative shrink-0 rounded-full ring-offset-2 ring-offset-card",
                current === photo && "ring-[3px] ring-primary",
              )}
            >
              <img src={photo} alt="Tu foto" className="h-16 w-16 rounded-full object-cover" />
            </button>
          )}
          <div className="grid flex-1 grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ImageUp className="h-4 w-4 text-primary" /> Galería
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Camera className="h-4 w-4 text-primary" /> Cámara
            </button>
          </div>
        </div>
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">O elige un animal</h3>
        <p className="mb-4 text-sm text-muted-foreground">Tus amigos y tu clan verán el que elijas.</p>
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
      </section>

      <PhotoCropDialog file={pending} saving={saving} onCancel={() => setPending(null)} onConfirm={upload} />
    </div>
  );
};

export default AvatarPicker;
