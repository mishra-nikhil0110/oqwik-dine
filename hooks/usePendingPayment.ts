// hooks/usePendingPayment.ts - the payment started from this tab for a table,
// read after mount (sessionStorage is not available during server rendering).
"use client";

import { useEffect, useState } from "react";
import { getPendingPayment, type PendingPayment } from "@/services/pendingPayment";

/**
 * The table's pending payment while it can still be completed (before its
 * `expiresAt`); null otherwise. Past expiry the payment page settles it.
 */
export function usePendingPayment(qrSlug: string): PendingPayment | null {
  const [pending, setPending] = useState<PendingPayment | null>(null);
  useEffect(() => {
    const stored = getPendingPayment();
    const live = stored && stored.qrSlug === qrSlug && Date.parse(stored.expiresAt) > Date.now();
    setPending(live ? stored : null);
  }, [qrSlug]);
  return pending;
}
