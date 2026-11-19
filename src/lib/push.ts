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

function sameKey(a: ArrayBuffer | null | undefined, b: BufferSource): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  const y = new Uint8Array(b instanceof ArrayBuffer ? b : (b as ArrayBufferView).buffer);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/**
 * Subscribe this device (reusing a live subscription) and save it to push_subscriptions.
 * Permission must already be granted. A subscription made with an old VAPID key can't receive
 * pushes anymore, so it's replaced.
 */
async function subscribeAndSave(reg: ServiceWorkerRegistration, userId: string): Promise<boolean> {
  const publicKey = await getVapidPublicKey();
  if (!publicKey) return false;
  const serverKey = urlBase64ToUint8Array(publicKey);

  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options?.applicationServerKey, serverKey)) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });
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
      { user_id: userId, endpoint: sub.endpoint, p256dh, auth, user_agent: navigator.userAgent },
      { onConflict: "endpoint" }
    );
  if (error) {
    console.error("save push subscription failed", error);
    return false;
  }
  return true;
}

function pushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

/** Request permission, subscribe to push, and persist to push_subscriptions. Returns true on success. */
export async function enablePushNotifications(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;

  // Ask first, straight from the tap: Safari (iOS) only shows the prompt while the user gesture
  // is still active, and awaiting other work first can lose it.
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;
  await navigator.serviceWorker.ready;
  return subscribeAndSave(reg, userId);
}

/**
 * Silent re-sync on app open when permission is already granted: makes sure this device's
 * subscription is saved for the signed-in user (rows get removed when the push service reports
 * them expired, and the endpoint can rotate). Never prompts. Returns whether it's subscribed.
 */
export async function syncPushSubscription(userId: string): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  return subscribeAndSave(reg, userId);
}

/** Ask the server to push a test notification to the signed-in user's devices. */
export async function sendTestPush(): Promise<{ sent: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke("dispatch-event", { body: { event: "test_push" } });
  if (error) return { sent: 0, error: error.message };
  if (data?.error) return { sent: 0, error: String(data.error) };
  return { sent: Number(data?.sent ?? 0) };
}
