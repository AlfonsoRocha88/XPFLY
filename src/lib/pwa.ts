/* Registers the service worker only on production-like hosts and outside iframes. */

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS-specific
  if ((window.navigator as any).standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
}

function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (isPreviewOrIframe()) {
    // Make sure no stale SW is registered in preview contexts
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {}
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (e) {
    console.error("SW register failed", e);
    return null;
  }
}