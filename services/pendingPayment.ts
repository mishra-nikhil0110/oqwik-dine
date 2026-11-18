// services/pendingPayment.ts - the payment started from this tab (guide §6.1).
//
// Kept in sessionStorage so the status can be recovered after the PhonePe
// redirect, a reload, or the Razorpay popup being closed. Holding on to the
// gateway checkout data lets "Continue payment" reopen the SAME gateway order
// instead of creating a second payment while one is still pending (guide §6.3:
// never create a second payment while one is pending).

import type { CheckoutData } from "@/types/api";
import { PENDING_PAYMENT_KEY } from "./config";
import { readJson, removeKey, writeJson } from "./storage";

export interface PendingPayment {
  paymentId: string;
  qrSlug: string;
  amount: number;
  currency: string;
  expiresAt: string;
  checkout: CheckoutData;
  createdAt: number;
}

export function getPendingPayment(): PendingPayment | null {
  const stored = readJson<PendingPayment>("session", PENDING_PAYMENT_KEY);
  return stored && typeof stored.paymentId === "string" && typeof stored.qrSlug === "string" ? stored : null;
}

export function savePendingPayment(payment: PendingPayment): void {
  writeJson("session", PENDING_PAYMENT_KEY, payment);
}

/** Forgets the pending payment, only if it is still the one given (when an id is passed). */
export function clearPendingPayment(paymentId?: string): void {
  if (paymentId) {
    const current = getPendingPayment();
    if (current && current.paymentId !== paymentId) return;
  }
  removeKey("session", PENDING_PAYMENT_KEY);
}
