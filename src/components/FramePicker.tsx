import { Check, Lock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { CONSTELLATIONS } from "@shared/achievements";
import { SHOP_FRAMES, frameById } from "@/components/achievements/frames";
import CharacterPortrait from "@/components/CharacterPortrait";

/** Avatar frames earned by completing a constellation in gold. Equipping goes through the server. */
const FramePicker = () => {
  const { profile } = useProfile();
  const qc = useQueryClient();
  const unlocked = new Set(profile?.unlocked_frames ?? []);
  const equipped = profile?.equipped_frame ?? null;

  const equip = useMutation({
    mutationFn: async (frameId: string | null) => {
      const { error } = await supabase.functions.invoke("equip-frame", { body: { frameId } });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
    onError: () => toast.error("No se pudo cambiar el marco"),
  });

  return (
    <section className="surface p-4">
      <h2 className="section-title">Marcos de avatar</h2>
      <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Gana marcos completando constelaciones de Logros en oro, o consíguelos en la Tienda.</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => equip.mutate(null)}
          className={cn("flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 text-xs font-medium transition-colors", !equipped ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
        >
          <CharacterPortrait url={profile?.avatar_url} seed={profile?.user_id} size={44} />
          Sin marco
        </button>
        {[...CONSTELLATIONS.map((c) => c.id as string), ...Object.keys(SHOP_FRAMES)].map((id) => {
          const has = unlocked.has(id);
          const on = equipped === id;
          return (
            <button
              key={id}
              type="button"
              disabled={!has || equip.isPending}
              onClick={() => equip.mutate(id)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 text-xs font-medium transition-colors",
                on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                has ? "hover:border-primary/40" : "opacity-50",
              )}
              aria-label={`${frameById(id)?.name}${has ? "" : ", bloqueado"}`}
            >
              <CharacterPortrait url={profile?.avatar_url} seed={profile?.user_id} size={38} frame={id} />
              <span className="truncate">{frameById(id)?.name}</span>
              {on && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />}
              {!has && <Lock className="absolute right-1.5 top-1.5 h-3 w-3" />}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default FramePicker;
