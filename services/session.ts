// services/session.ts - the guest session token (guide §3).
//
// One token, valid 45 minutes, not renewable and not tied to a table. Stored in
// localStorage as { token, expires_at, customer } and treated as expired 30 s
// before `expires_at`, so a request never leaves with a token that dies in flight.
//
// The API client clears the session on any 401; listeners (the Redux store, see
// store/StoreProvider.tsx) are told so the UI flips to "signed out" immediately.

import type { GuestCustomer, GuestSessionPayload } from "@/types/api";
import { SESSION_EXPIRY_SKEW_MS, SESSION_STORAGE_KEY } from "./config";
import { readJson, removeKey, writeJson } from "./storage";

export interface StoredSession {
  token: string;
  expires_at: string;
  customer: GuestCustomer;
}

type Listener = (session: StoredSession | null) => void;
const listeners = new Set<Listener>();

function notify(session: StoredSession | null): void {
  listeners.forEach((listener) => listener(session));
}

/** True while the session has more than the safety margin left. */
export function isSessionAlive(session: Pick<StoredSession, "expires_at"> | null): boolean {
  if (!session) return false;
  const expiresAt = Date.parse(session.expires_at);
  return Number.isFinite(expiresAt) && expiresAt - SESSION_EXPIRY_SKEW_MS > Date.now();
}

/** The stored session, or null when there is none or it is (about to be) expired. */
export function getSession(): StoredSession | null {
  const stored = readJson<StoredSession>("local", SESSION_STORAGE_KEY);
  if (!stored || typeof stored.token !== "string" || typeof stored.expires_at !== "string" || !stored.customer) {
    return null;
  }
  return isSessionAlive(stored) ? stored : null;
}

export function saveSession(payload: GuestSessionPayload): StoredSession {
  const session: StoredSession = {
    token: payload.token,
    expires_at: payload.expires_at,
    customer: payload.customer,
  };
  writeJson("local", SESSION_STORAGE_KEY, session);
  notify(session);
  return session;
}

/** Refreshes the stored profile / expiry after GET /guest/me, keeping the token. */
export function updateSessionProfile(customer: GuestCustomer, expiresAt: string): StoredSession | null {
  const current = readJson<StoredSession>("local", SESSION_STORAGE_KEY);
  if (!current) return null;
  const next = { ...current, customer, expires_at: expiresAt };
  writeJson("local", SESSION_STORAGE_KEY, next);
  notify(next);
  return next;
}

export function clearSession(): void {
  const hadSession = readJson<StoredSession>("local", SESSION_STORAGE_KEY) !== null;
  removeKey("local", SESSION_STORAGE_KEY);
  if (hadSession) notify(null);
}

/** Subscribe to session changes made by this tab. Returns an unsubscribe function. */
export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
