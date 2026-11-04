import { useEffect, useState } from "react";

export type PyroMood =
  | "idle"
  | "happy"
  | "thinking"
  | "alert"
  | "eating"
  | "dying"
  | "revival"
  | "celebrating"
  | "sleeping";

type Listener = (msg: string, mood: PyroMood) => void;
const listeners = new Set<Listener>();

export function pyroSay(message: string, mood: PyroMood = "happy") {
  listeners.forEach((l) => l(message, mood));
}

export function usePyroBus(handler: Listener) {
  useEffect(() => {
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, [handler]);
}

/* --------- Feeding event bus (Phase 2) --------- */
export type PyroFeedPayload = {
  taskId?: string;
  taskTitle?: string;
  /** DOMRect of the source card so PyroAssistant can clone+fly an element to Pyro */
  sourceRect?: { x: number; y: number; width: number; height: number };
};
type FeedListener = (p: PyroFeedPayload) => void;
const feedListeners = new Set<FeedListener>();

export function pyroFeed(payload: PyroFeedPayload = {}) {
  feedListeners.forEach((l) => l(payload));
}
export function usePyroFeedBus(handler: FeedListener) {
  useEffect(() => {
    feedListeners.add(handler);
    return () => {
      feedListeners.delete(handler);
    };
  }, [handler]);
}

/* --------- Suggestions panel open bus (Phase 7) --------- */
type SuggestionsListener = () => void;
const suggestionsListeners = new Set<SuggestionsListener>();
export function openPyroSuggestions() {
  suggestionsListeners.forEach((l) => l());
}
export function usePyroSuggestionsBus(handler: SuggestionsListener) {
  useEffect(() => {
    suggestionsListeners.add(handler);
    return () => {
      suggestionsListeners.delete(handler);
    };
  }, [handler]);
}

/**
 * Source-rect cache. UI components (TaskCard, etc.) stash the rect of the
 * card just before triggering the parent's "complete" handler, so the
 * downstream feed event (fired by useTasks.onSuccess) can pick it up and
 * animate the ghost card flying to Pyro.
 */
const sourceRectCache = new Map<string, { x: number; y: number; width: number; height: number }>();
export function stashPyroSourceRect(taskId: string, rect: { x: number; y: number; width: number; height: number }) {
  sourceRectCache.set(taskId, rect);
  // Auto-expire after 1.5s in case the mutation never fires.
  window.setTimeout(() => sourceRectCache.delete(taskId), 1500);
}
export function consumePyroSourceRect(taskId: string) {
  const r = sourceRectCache.get(taskId);
  if (r) sourceRectCache.delete(taskId);
  return r;
}

const MIN_KEY = "pyro_minimized";
const HIST_KEY = "pyro_chat_history";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export const PYRO_KEYS = { MIN_KEY, HIST_KEY };