// store/StoreProvider.tsx - per-tab store instance (App Router safe) plus the
// two bridges between the store and browser storage:
//   1. session.ts -> Redux: a token cleared by a 401 (or saved by the login
//      sheet) flips the session slice straight away.
//   2. Redux -> localStorage: the cart is written back whenever it changes.
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Provider } from "react-redux";
import { cartStorageKey } from "@/services/config";
import { subscribeSession } from "@/services/session";
import { removeKey, writeJson } from "@/services/storage";
import { makeStore, type AppStore } from "./store";
import { sessionEnded, sessionStarted } from "./slices/sessionSlice";

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) storeRef.current = makeStore();

  useEffect(() => {
    const store = storeRef.current!;

    const unsubscribeSession = subscribeSession((session) => {
      if (session) store.dispatch(sessionStarted({ customer: session.customer, expiresAt: session.expires_at }));
      else store.dispatch(sessionEnded());
    });

    let lastCart = store.getState().cart;
    const unsubscribeStore = store.subscribe(() => {
      const cart = store.getState().cart;
      if (cart === lastCart) return;
      lastCart = cart;
      // Never write before hydration, or an empty cart would overwrite the stored one.
      if (!cart.hydrated || !cart.qrSlug) return;
      const key = cartStorageKey(cart.qrSlug);
      if (cart.lines.length === 0 && !cart.note) removeKey("local", key);
      else writeJson("local", key, { lines: cart.lines, note: cart.note, updatedAt: Date.now() });
    });

    return () => {
      unsubscribeSession();
      unsubscribeStore();
    };
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
