// services/loginGate.ts - "sign in again, then carry on" (guide §3).
//
// Customers sign in when they open the table (see components/layout/TableGate).
// The 45-minute session can still end while they order; any code can then
// `await requestLogin()`: the <LoginSheet> (mounted once in the root layout)
// subscribes to this bus, opens, and resolves the promise with true after a
// successful verify, or false if the customer closes it. Concurrent callers
// share the same open sheet and promise.
//
// `withLogin(fn)` wraps a signed-in call: on LoginRequiredError it opens the sheet
// and retries `fn` once after sign-in, returning null if the customer gave up.

import { LoginRequiredError } from "./apiClient";

type Listener = (open: boolean) => void;

let open = false;
let pending: Promise<boolean> | null = null;
let settle: ((ok: boolean) => void) | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener(open));
}

/** Opens the login sheet (or joins the one already open). Resolves true once signed in. */
export function requestLogin(): Promise<boolean> {
  if (pending) return pending;
  pending = new Promise<boolean>((resolve) => {
    settle = resolve;
  });
  open = true;
  emit();
  return pending;
}

/** Called by the sheet: true after a successful verify, false when dismissed. */
export function finishLogin(ok: boolean): void {
  const resolve = settle;
  pending = null;
  settle = null;
  open = false;
  emit();
  resolve?.(ok);
}

/** Whether the login sheet is open right now (snapshot for useSyncExternalStore). */
export function isLoginOpen(): boolean {
  return open;
}

export function subscribeLoginGate(listener: Listener): () => void {
  listeners.add(listener);
  listener(open);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Runs a signed-in call. If the session is missing or over, asks the customer to
 * sign in and retries once. Returns null when they close the login sheet.
 */
export async function withLogin<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (!(error instanceof LoginRequiredError)) throw error;
  }
  const signedIn = await requestLogin();
  if (!signedIn) return null;
  return fn();
}
