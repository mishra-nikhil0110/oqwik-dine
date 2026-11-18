// lib/razorpay.ts - Razorpay Standard Checkout (guide §6.2b).
// The script is loaded on demand, once, and only when the restaurant's gateway
// is Razorpay.

import type { RazorpayCheckout } from "@/types/api";

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { contact?: string; name?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: unknown) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;

/** Loads checkout.js once. Rejects if it cannot be fetched (offline, blocked). */
export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay needs a browser"));
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve() : reject(new Error("Razorpay did not load")));
    script.onerror = () => {
      script.remove();
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  }).catch((error) => {
    loading = null; // allow a retry
    throw error;
  });
  return loading;
}

interface OpenOptions {
  checkout: RazorpayCheckout;
  themeColor?: string;
  onSuccess: (response: RazorpaySuccess) => void;
  onDismiss: () => void;
}

/** Opens the Razorpay popup for an existing gateway order. */
export async function openRazorpay({ checkout, themeColor, onSuccess, onDismiss }: OpenOptions): Promise<void> {
  await loadRazorpay();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Razorpay did not load");

  // Exactly one of handler / ondismiss settles the flow.
  let settled = false;
  const once = (fn: () => void) => () => {
    if (settled) return;
    settled = true;
    fn();
  };

  const instance = new Razorpay({
    key: checkout.key_id,
    order_id: checkout.order_id,
    amount: checkout.amount,
    currency: checkout.currency,
    name: checkout.name,
    description: checkout.description,
    prefill: checkout.prefill,
    theme: themeColor ? { color: themeColor } : undefined,
    handler: (response) => once(() => onSuccess(response))(),
    modal: { ondismiss: once(onDismiss) },
  });
  instance.open();
}
