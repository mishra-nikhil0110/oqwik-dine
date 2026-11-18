// hooks/useCheckout.ts - start checkout and hand over to the gateway (guide §6).
//
//   1. If this tab already has a payment in flight, settle it first: never create
//      a second payment while one is pending (guide §6.3).
//   2. POST /guest/tables/:qrSlug/checkout (signs the customer in first if needed).
//      No order exists yet; it is created once the payment succeeds.
//   3. Remember the payment (sessionStorage) and switch on checkout.provider,
//      which the restaurant chooses in its payment settings (never hard-coded here):
//        phonepe  -> redirect; PhonePe returns to /pay/return?payment=<id>
//        razorpay -> popup; on success POST .../verify, then /pay/<id>
//      The customer picks UPI / card / netbanking on the gateway's own screen.
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CheckoutData, CheckoutRequest, PhonePeCheckout, RazorpayCheckout } from "@/types/api";
import { ApiError, LoginRequiredError, errorMessage } from "@/services/apiClient";
import { guestApi } from "@/services/guestApi";
import { withLogin } from "@/services/loginGate";
import { clearPendingPayment, getPendingPayment, savePendingPayment } from "@/services/pendingPayment";
import { toast } from "@/services/toast";
import { openRazorpay } from "@/lib/razorpay";
import { useAppDispatch } from "@/store/hooks";
import { loadTable } from "@/store/thunks/tableThunks";

export const paymentPath = (paymentId: string) => `/pay/${encodeURIComponent(paymentId)}`;

function brandColor(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return getComputedStyle(document.documentElement).getPropertyValue("--color-brand").trim() || undefined;
}

/**
 * Opens the gateway for an existing payment. Used right after checkout and by
 * "Continue payment" on the payment screen (same gateway order, no new payment).
 * `onDone` runs when control comes back to the app (Razorpay success or close);
 * a PhonePe redirect leaves the app instead.
 */
export async function launchGateway({
  paymentId,
  checkout,
  onDone,
}: {
  paymentId: string;
  checkout: CheckoutData;
  onDone: () => void;
}): Promise<void> {
  if (checkout.provider === "phonepe") {
    const url = (checkout as PhonePeCheckout).redirect_url;
    if (typeof url === "string" && /^https:\/\//i.test(url)) {
      window.location.assign(url);
      return;
    }
    throw new Error("The payment page link is invalid. Please try again.");
  }

  if (checkout.provider === "razorpay") {
    await openRazorpay({
      checkout: checkout as RazorpayCheckout,
      themeColor: brandColor(),
      onSuccess: async (result) => {
        try {
          // Confirms with the gateway straight away; the status page polls anyway.
          await guestApi.verifyPayment(paymentId, { ...result });
        } catch {
          // ignore: /pay/<id> polls GET /guest/payments/:id and the webhook also confirms
        }
        onDone();
      },
      onDismiss: onDone,
    });
    return;
  }

  throw new Error("This payment method isn't supported yet. Please ask the staff.");
}

export function useCheckout(qrSlug: string) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  /** Why the last attempt failed (shown on the checkout screen); null when fine. */
  const [error, setError] = useState<string | null>(null);

  // Coming back from the PhonePe page with the browser's Back button restores this
  // page from the back/forward cache with the button still busy: release it.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const refreshMenu = useCallback(() => {
    void dispatch(loadTable({ qrSlug, silent: true }));
  }, [dispatch, qrSlug]);

  /**
   * Returns true when it is safe to start a new payment. Otherwise sends the
   * customer to the payment already in flight.
   */
  const settlePreviousPayment = useCallback(async (): Promise<boolean> => {
    const previous = getPendingPayment();
    if (!previous) return true;
    try {
      const view = await withLogin(() => guestApi.getPayment(previous.paymentId));
      if (!view) return false; // closed the login sheet
      if (view.status === "failed" || view.status === "expired") {
        clearPendingPayment(previous.paymentId);
        return true;
      }
      toast.info(view.status === "paid" ? "Your last payment went through." : "Finish your current payment first.");
      router.push(paymentPath(previous.paymentId));
      return false;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // Not this customer's payment (e.g. another number signed in): forget it.
        clearPendingPayment(previous.paymentId);
        return true;
      }
      toast.error(errorMessage(error));
      return false;
    }
  }, [router]);

  const pay = useCallback(
    async (request: CheckoutRequest) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      let handedOver = false;
      try {
        if (!(await settlePreviousPayment())) return;

        const result = await withLogin(() => guestApi.checkout(qrSlug, request));
        if (!result) return; // closed the login sheet

        const { payment, checkout } = result;
        savePendingPayment({
          paymentId: payment.documentId,
          qrSlug,
          amount: payment.amount,
          currency: payment.currency,
          expiresAt: payment.expires_at,
          checkout,
          createdAt: Date.now(),
        });

        try {
          await launchGateway({
            paymentId: payment.documentId,
            checkout,
            onDone: () => router.push(paymentPath(payment.documentId)),
          });
          // PhonePe: the page is navigating away; keep the button busy until it does.
          handedOver = checkout.provider === "phonepe";
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Couldn't open the payment window.");
          router.push(paymentPath(payment.documentId));
        }
      } catch (caught) {
        let message: string;
        if (caught instanceof LoginRequiredError) {
          message = "Please verify your number to pay.";
        } else if (caught instanceof ApiError && caught.status === 404) {
          // The table was switched off or its QR code replaced.
          message = "This table's QR code has changed. Please scan the QR code on your table again.";
          refreshMenu();
        } else if (caught instanceof ApiError && (caught.status === 400 || caught.status === 403)) {
          // A dish sold out, ordering paused, payment not set up, number blocked...
          // The server's message says which; the refreshed menu flags sold-out dishes.
          message = caught.message;
          refreshMenu();
        } else if (caught instanceof ApiError && caught.status >= 500) {
          message = "Couldn't reach the payment provider. Please try again.";
        } else {
          message = errorMessage(caught);
        }
        setError(message);
        toast.error(message);
      } finally {
        if (!handedOver) setBusy(false);
      }
    },
    [busy, settlePreviousPayment, qrSlug, router, refreshMenu],
  );

  return { pay, busy, error };
}
