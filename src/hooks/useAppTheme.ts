import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { getThemeClass, THEME_CLASS_NAMES } from "@/lib/themes";

/**
 * Applies the user's active theme + light/dark mode to <html>.
 * Use at any top-level route so theme is consistent across pages.
 */
export function useAppTheme() {
  const { profile } = useProfile();

  useEffect(() => {
    const cls = getThemeClass((profile as any)?.theme);
    const root = document.documentElement;
    THEME_CLASS_NAMES.forEach((c) => root.classList.remove(c));
    root.classList.add(cls);
    try {
      if ((profile as any)?.theme) localStorage.setItem("lastTheme", (profile as any).theme);
    } catch {}
  }, [(profile as any)?.theme]);

  useEffect(() => {
    const m = (profile as any)?.mode;
    if (!m) return;
    const root = document.documentElement;
    if (m === "light") root.classList.add("light");
    else root.classList.remove("light");
    try { localStorage.setItem("lastMode", m); } catch {}
  }, [(profile as any)?.mode]);
}