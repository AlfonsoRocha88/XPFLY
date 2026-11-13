import type { ReactNode } from "react";
import { AuthSky } from "./AuthSky";

/**
 * Scrollable full-height stage for every sign-in screen. The sky stays fixed behind; the
 * content centers itself and still scrolls when the keyboard takes half the screen.
 */
export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-white [color-scheme:dark] [&>*:not([data-auth-sky])]:relative [&>*:not([data-auth-sky])]:z-10 [&>*:not([data-auth-sky])]:m-auto">
      <AuthSky />
      {children}
    </div>
  );
}
