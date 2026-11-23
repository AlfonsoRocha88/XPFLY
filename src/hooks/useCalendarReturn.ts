import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** Google consent reopens the app at /?calendar=google-ok|google-error|google-cancel. */
export function useCalendarReturn() {
  const qc = useQueryClient();
  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("calendar");
    if (!status) return;
    if (status === "google-ok") {
      toast.success("Google Calendar conectado");
      qc.invalidateQueries({ queryKey: ["calendar-feeds"] });
      qc.invalidateQueries({ queryKey: ["external-events"] });
    } else if (status === "google-error") {
      toast.error("No se pudo conectar Google");
    }
    url.searchParams.delete("calendar");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [qc]);
}
