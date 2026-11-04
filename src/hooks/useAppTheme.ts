import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useProfile } from "@/hooks/useProfile";
import { getThemeClass, THEME_CLASS_NAMES } from "@/lib/themes";

export type ColorMode = "light" | "dark";

const MODE_KEY = "app-mode";
const listeners = new Set<() => void>();

function readMode(): ColorMode {
  try {
    return localStorage.getItem(MODE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyMode(mode: ColorMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

/** Light is the default; dark is an opt-in stored per device. */
export function useColorMode() {
  const mode = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    readMode,
  );
  const setMode = useCallback((m: ColorMode) => {
    try { localStorage.setItem(MODE_KEY, m); } catch {}
    applyMode(m);
    listeners.forEach((l) => l());
  }, []);
  return { mode, setMode };
}

/** Applies the user's accent theme + color mode to <html>. */
export function useAppTheme() {
  const { profile } = useProfile();
  const theme = profile?.theme;

  useEffect(() => {
    const root = document.documentElement;
    THEME_CLASS_NAMES.forEach((c) => root.classList.remove(c));
    root.classList.add(getThemeClass(theme));
    try { if (theme) localStorage.setItem("lastTheme", theme); } catch {}
  }, [theme]);

  useEffect(() => { applyMode(readMode()); }, []);
}
