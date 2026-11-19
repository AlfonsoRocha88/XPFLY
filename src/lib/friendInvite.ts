/**
 * Friend invites travel as a link: https://app/?add=CODE.KEY
 * The same link is what the QR encodes and what WhatsApp sends, so the phone's own camera works
 * too: scanning opens the app and the invite is applied. The link is captured on boot (before any
 * redirect to sign-in) and applied once a session exists.
 */
const STORE = "pending-friend-invite";

export interface Invite { code: string; key: string }

export const inviteLink = (code: string, key: string) =>
  `${window.location.origin}/?add=${encodeURIComponent(`${code}.${key}`)}`;

/** Accepts a full link, a bare "CODE.KEY", or anything a QR may hold. */
export function parseInvite(text: string): Invite | null {
  let raw = text.trim();
  try {
    const u = new URL(raw);
    raw = u.searchParams.get("add") ?? "";
  } catch { /* not a URL: treat as the bare value */ }
  const m = /^([A-Za-z0-9]{4,16})\.([a-f0-9]{16,64})$/.exec(raw);
  return m ? { code: m[1].toUpperCase(), key: m[2] } : null;
}

/** Called once from main.tsx: moves ?add=… out of the URL into storage. */
export function captureInviteFromUrl() {
  const url = new URL(window.location.href);
  const add = url.searchParams.get("add");
  if (!add) return;
  const inv = parseInvite(add);
  if (inv) try { localStorage.setItem(STORE, JSON.stringify(inv)); } catch { /* storage blocked */ }
  url.searchParams.delete("add");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

export function takePendingInvite(): Invite | null {
  try {
    const v = localStorage.getItem(STORE);
    localStorage.removeItem(STORE);
    return v ? (JSON.parse(v) as Invite) : null;
  } catch { return null; }
}

export const whatsappLink = (link: string, name?: string | null) =>
  `https://wa.me/?text=${encodeURIComponent(`${name ? `${name} te invita` : "Te invito"} a Constela ✨ Toca para ser mi amigo: ${link}`)}`;
