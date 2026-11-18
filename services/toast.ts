// services/toast.ts - framework-agnostic toast bus (same pattern as oqwik-admin).
// Callable from anywhere (thunks, event handlers) without touching the Redux
// store; <ToastViewport> subscribes and renders.

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

const DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  error: 5500,
};
/** Never stack more than this; the oldest goes first. */
const MAX_VISIBLE = 3;

let toasts: ToastItem[] = [];
let counter = 0;
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function notify(): void {
  listeners.forEach((listener) => listener([...toasts]));
}

function push(type: ToastType, message: string): string {
  // The same message twice in a row (e.g. a double tap) is shown once.
  const duplicate = toasts.find((t) => t.type === type && t.message === message);
  if (duplicate) return duplicate.id;

  const id = `t${++counter}`;
  toasts = [...toasts, { id, type, message }].slice(-MAX_VISIBLE);
  notify();
  timers.set(
    id,
    setTimeout(() => toast.dismiss(id), DURATIONS[type]),
  );
  return id;
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),

  dismiss(id: string): void {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener([...toasts]);
    return () => {
      listeners.delete(listener);
    };
  },
};
