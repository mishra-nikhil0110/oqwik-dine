// hooks/useTableLoader.ts - keeps the scanned table's menu loaded and fresh.
//
//  - Loads GET /guest/tables/:qrSlug when the slug changes (or was never loaded).
//  - Refreshes it in the background when the customer comes back to the tab
//    (dishes can sell out while they browse), at most once a minute.
//  - Remembers the slug for this tab so the payment/bill pages can link back.
//  - Loads the table's stored cart.
"use client";

import { useCallback, useEffect } from "react";
import { CURRENT_TABLE_KEY, MENU_REFRESH_MIN_INTERVAL_MS } from "@/services/config";
import { writeString } from "@/services/storage";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { hydrateCart } from "@/store/thunks/cartThunks";
import { loadTable } from "@/store/thunks/tableThunks";

export function useTableLoader(qrSlug: string, { persist = true }: { persist?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  useEffect(() => {
    if (!qrSlug) return;
    if (persist) {
      writeString("session", CURRENT_TABLE_KEY, qrSlug);
      dispatch(hydrateCart(qrSlug));
    }
    const { table } = store.getState();
    if (table.qrSlug !== qrSlug || table.status === "idle" || table.status === "error") {
      void dispatch(loadTable({ qrSlug }));
    }
  }, [qrSlug, persist, dispatch, store]);

  /** Background refresh, throttled. `force` skips the throttle (e.g. after a sold-out error). */
  const refresh = useCallback(
    (force = false) => {
      if (!qrSlug) return;
      const { table } = store.getState();
      if (table.qrSlug !== qrSlug || !table.data) return;
      if (!force && Date.now() - table.loadedAt < MENU_REFRESH_MIN_INTERVAL_MS) return;
      void dispatch(loadTable({ qrSlug, silent: true }));
    },
    [qrSlug, dispatch, store],
  );

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  return { refresh };
}
