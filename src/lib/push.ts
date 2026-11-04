import { supabase } from "@/integrations/supabase/client";
import { registerServiceWorker } from "./pwa";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("push-config", { body: {} });
    if (error) throw error;
    return data?.publicKey || null;
  } catch (e) {
    console.error("push-config fetch failed", e);
    return null;
  }
}

/** Request permission, subscribe to push, and persist to push_subscriptions. Returns true on success. */
export async function enablePushNotifications(userId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;

  // iOS requires the app to be installed (standalone) for push
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return false;

  const publicKey = await getVapidPublicKey();
  if (!publicKey) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (e) {
      console.error("pushManager.subscribe failed", e);
      return false;
    }
  }

  const raw = sub.toJSON();
  const p256dh = raw.keys?.p256dh;
  const auth = raw.keys?.auth;
  if (!sub.endpoint || !p256dh || !auth) return false;

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: "endpoint" }
    );
  if (error) {
    console.error("save push subscription failed", error);
    return false;
  }
  return true;
}