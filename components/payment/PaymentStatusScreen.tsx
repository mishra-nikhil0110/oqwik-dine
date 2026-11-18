// components/payment/PaymentStatusScreen.tsx - payment confirmation (guide §6.3),
// used by /pay/[paymentId] (Razorpay ends here) and /pay/return (PhonePe returns here).
//
// Polls GET /guest/payments/:id every 2.5 s for about 2 minutes while the status
// is "pending" (the server also asks the gateway each time), then shows
// "Still confirming…" with a Check again button. The session is needed for the
// status call, so an expired session is renewed first (login sheet).
//
//   pending -> design screen 9 (countdown to expiry, Continue payment)
//   paid    -> design screen 10 (OrderPlaced)
//   failed  -> failure_reason + Try again (a new checkout)
//   expired -> "Payment timed out" + Try again
//
// Reloading this page is safe: everything is re-read from the server.
"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, LogIn, SearchX, XCircle } from "lucide-react";
import type { PaymentView } from "@/types/api";
import { ApiError, LoginRequiredError, errorMessage } from "@/services/apiClient";
import { CURRENT_TABLE_KEY, PAYMENT_POLL_INTERVAL_MS, PAYMENT_POLL_WINDOW_MS } from "@/services/config";
import { guestApi } from "@/services/guestApi";
import { requestLogin } from "@/services/loginGate";
import { clearPendingPayment, getPendingPayment, type PendingPayment } from "@/services/pendingPayment";
import { getSession } from "@/services/session";
import { readString } from "@/services/storage";
import { toast } from "@/services/toast";
import { fmtPrice } from "@/lib/format";
import { launchGateway } from "@/hooks/useCheckout";
import { useNow } from "@/hooks/useNow";
import { useTableLoader } from "@/hooks/useTableLoader";
import { tablePath } from "@/hooks/useTableSlug";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCartFor } from "@/store/thunks/cartThunks";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/IconButton";
import { PoweredBy } from "@/components/ui/Brand";
import { Screen, ScreenHeader, StateMessage } from "@/components/ui/Layout";
import { Spinner } from "@/components/ui/Spinner";
import { CountdownRing } from "./CountdownRing";
import { OrderPlaced } from "./OrderPlaced";

type Phase = "checking" | "polling" | "stalled" | "settled" | "needsLogin" | "signedOut" | "notFound";

/** Payments expire after 15 minutes (server default), used when the start time is unknown. */
const DEFAULT_PAYMENT_WINDOW_S = 15 * 60;

const GATEWAY_NAMES: Record<string, string> = { phonepe: "PhonePe", razorpay: "Razorpay" };

export function PaymentStatusScreen({ paymentId }: { paymentId: string }) {
  const dispatch = useAppDispatch();
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [transientError, setTransientError] = useState<string | null>(null);
  /** Bumped to restart polling (Check again, after signing in). */
  const [pollRun, setPollRun] = useState(0);
  const [resuming, setResuming] = useState(false);

  /** The pending payment saved by checkout in this tab, and the table it belongs to. */
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [qrSlug, setQrSlug] = useState<string | null>(null);
  useEffect(() => {
    const stored = getPendingPayment();
    const mine = stored && stored.paymentId === paymentId ? stored : null;
    setPending(mine);
    setQrSlug(mine?.qrSlug ?? readString("session", CURRENT_TABLE_KEY));
  }, [paymentId]);

  // Table details (name, table label, theme) for the screens below.
  useTableLoader(qrSlug ?? "", { persist: false });
  const tableData = useAppSelector((s) => (qrSlug && s.table.qrSlug === qrSlug ? s.table.data : null));

  /* ---- polling ---- */
  useEffect(() => {
    if (!getSession()) {
      setPhase("needsLogin");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    setPhase((current) => (current === "settled" ? current : "polling"));

    const tick = async () => {
      if (cancelled) return;
      // Don't spend the polling window while the tab is in the background.
      if (document.hidden) {
        timer = setTimeout(tick, PAYMENT_POLL_INTERVAL_MS);
        return;
      }
      try {
        const view = await guestApi.getPayment(paymentId);
        if (cancelled) return;
        setPayment(view);
        setTransientError(null);
        if (view.status !== "pending") {
          setPhase("settled");
          return;
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof LoginRequiredError) {
          setPhase("needsLogin");
          return;
        }
        if (error instanceof ApiError && error.status === 404) {
          setPhase("notFound");
          return;
        }
        // Gateway busy / network blip: keep trying within the window.
        setTransientError(errorMessage(error));
      }
      if (Date.now() - startedAt >= PAYMENT_POLL_WINDOW_MS) {
        setPhase("stalled");
        return;
      }
      timer = setTimeout(tick, PAYMENT_POLL_INTERVAL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentId, pollRun]);

  /* ---- session needed: open the login sheet, then poll again ---- */
  const loginAsked = useRef(false);
  useEffect(() => {
    if (phase !== "needsLogin" || loginAsked.current) return;
    loginAsked.current = true;
    void requestLogin().then((ok) => {
      loginAsked.current = false;
      if (ok) setPollRun((n) => n + 1);
      else setPhase("signedOut");
    });
  }, [phase]);

  /* ---- settle the tab's pending payment and cart exactly once ---- */
  const settledId = useRef<string | null>(null);
  useEffect(() => {
    if (!payment || payment.status === "pending" || settledId.current === payment.documentId) return;
    settledId.current = payment.documentId;
    const stored = getPendingPayment();
    if (stored?.paymentId === payment.documentId) {
      // The cart was paid for: start the next order with an empty cart.
      if (payment.status === "paid") dispatch(clearCartFor(stored.qrSlug));
      clearPendingPayment(payment.documentId);
    }
  }, [payment, dispatch]);

  /* ---- reopen the same gateway order (no second payment) ---- */
  async function continuePayment() {
    if (!pending || resuming) return;
    setResuming(true);
    try {
      await launchGateway({
        paymentId,
        checkout: pending.checkout,
        onDone: () => {
          setResuming(false);
          setPollRun((n) => n + 1);
        },
      });
      // PhonePe navigates away; Razorpay resolves once its popup is open.
      if (pending.checkout.provider !== "phonepe") setResuming(false);
    } catch (error) {
      setResuming(false);
      toast.error(error instanceof Error ? error.message : "Couldn't open the payment window.");
    }
  }

  const menuHref = qrSlug ? tablePath(qrSlug) : "/";
  const back = <BackButton href={menuHref} label="Back to menu" />;

  /* ---- render ---- */

  if (payment?.status === "paid") {
    return <OrderPlaced payment={payment} qrSlug={qrSlug} table={tableData?.table ?? null} />;
  }

  if (phase === "notFound") {
    return (
      <Screen>
        <ScreenHeader back={back} title="Payment" />
        <StateMessage
          icon={<SearchX size={30} aria-hidden />}
          title="We couldn't find this payment"
          className="flex-1 justify-center"
          actions={<ButtonLink href={menuHref}>Back to menu</ButtonLink>}
        >
          It may have been made with a different mobile number. Sign in with that number to see it.
        </StateMessage>
        <PoweredBy />
      </Screen>
    );
  }

  if (phase === "signedOut") {
    return (
      <Screen>
        <ScreenHeader back={back} title="Payment" />
        <StateMessage
          icon={<LogIn size={30} aria-hidden />}
          title="Verify your number to see this payment"
          className="flex-1 justify-center"
          actions={<Button onClick={() => setPhase("needsLogin")}>Verify number</Button>}
        >
          Your session has ended. Your payment is safe: if it went through, your order has been placed.
        </StateMessage>
        <PoweredBy />
      </Screen>
    );
  }

  if (payment && (payment.status === "failed" || payment.status === "expired")) {
    const expired = payment.status === "expired";
    return (
      <Screen>
        <ScreenHeader back={back} title="Payment" />
        <StateMessage
          icon={expired ? <Clock3 size={30} aria-hidden /> : <XCircle size={30} aria-hidden />}
          title={expired ? "Payment timed out" : "Payment failed"}
          tone="danger"
          className="flex-1 justify-center"
          actions={
            <>
              {qrSlug && <ButtonLink href={tablePath(qrSlug, "/checkout")}>Try again</ButtonLink>}
              <ButtonLink href={menuHref} variant="secondary">
                Back to menu
              </ButtonLink>
            </>
          }
        >
          {expired
            ? "The payment wasn't completed in time. No order was placed and your cart is still saved."
            : `${payment.failure_reason || "The payment didn't go through."} No order was placed and your cart is still saved.`}
        </StateMessage>
        <PoweredBy />
      </Screen>
    );
  }

  return (
    <PendingView
      payment={payment}
      pending={pending}
      phase={phase}
      transientError={transientError}
      restaurantName={tableData?.restaurant.name ?? null}
      back={back}
      resuming={resuming}
      onContinue={pending ? continuePayment : undefined}
      onCheckAgain={() => setPollRun((n) => n + 1)}
      menuHref={menuHref}
    />
  );
}

/** Design screen 9 - waiting for the payment to be confirmed. */
function PendingView({
  payment,
  pending,
  phase,
  transientError,
  restaurantName,
  back,
  resuming,
  onContinue,
  onCheckAgain,
  menuHref,
}: {
  payment: PaymentView | null;
  pending: PendingPayment | null;
  phase: Phase;
  transientError: string | null;
  restaurantName: string | null;
  back: React.ReactNode;
  resuming: boolean;
  onContinue?: () => void;
  onCheckAgain: () => void;
  menuHref: string;
}) {
  const now = useNow(1000);
  const expiresAt = Date.parse(payment?.expires_at ?? pending?.expiresAt ?? "");
  const hasExpiry = Number.isFinite(expiresAt);
  const secondsLeft = hasExpiry ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;
  const totalSeconds =
    hasExpiry && pending ? Math.max(1, Math.round((expiresAt - pending.createdAt) / 1000)) : DEFAULT_PAYMENT_WINDOW_S;

  const amount = payment ? fmtPrice(payment.amount, payment.currency) : pending ? fmtPrice(pending.amount, pending.currency) : null;
  const gateway = GATEWAY_NAMES[payment?.gateway ?? pending?.checkout.provider ?? ""] ?? "the payment page";
  const stalled = phase === "stalled";

  if (!payment && phase === "checking") {
    return (
      <Screen className="items-center justify-center">
        <Spinner size={36} className="text-brand" label="Checking your payment" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader back={back} title="Payment" />

      <div className="mt-4">
        {hasExpiry ? (
          <CountdownRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
        ) : (
          <div className="flex justify-center py-16">
            <Spinner size={48} className="text-marigold" />
          </div>
        )}
      </div>

      <div className="mt-8 text-center" aria-live="polite">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.01em]">
          {stalled ? "Still confirming…" : amount ? `Waiting for your ${amount} payment` : "Waiting for payment…"}
        </h1>
        <p className="mt-2 text-[17px] text-ink-2">
          {stalled
            ? "This is taking longer than usual. If you've paid, your order will be placed automatically."
            : `We're confirming it with ${gateway}. This usually takes a few seconds.`}
        </p>
        {transientError && !stalled && <p className="mt-2 text-[14px] text-ink-3">{transientError}</p>}
      </div>

      <ol className="mt-8 space-y-4 rounded-[24px] bg-mist p-5 sm:p-6">
        {[
          `Approve ${amount ?? "the payment"} in your UPI app or on the ${gateway} page`,
          restaurantName ? `${restaurantName} gets your order the moment it's paid` : "The kitchen gets your order the moment it's paid",
          "Your bill arrives on WhatsApp",
        ].map((text, index) => (
          <li key={text} className="flex items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marigold text-[17px] font-bold text-ink">
              {index + 1}
            </span>
            <span className="text-[17px] leading-snug">{text}</span>
          </li>
        ))}
      </ol>

      <div className="min-h-8 flex-1" />

      <div className="flex flex-col gap-3">
        {stalled && (
          <Button onClick={onCheckAgain} fullWidth>
            Check again
          </Button>
        )}
        {onContinue && secondsLeft > 0 && (
          <Button onClick={onContinue} loading={resuming} variant={stalled ? "secondary" : "primary"} fullWidth>
            Continue payment
          </Button>
        )}
        <ButtonLink href={menuHref} variant="secondary" fullWidth>
          Back to menu
        </ButtonLink>
      </div>
      <PoweredBy />
    </Screen>
  );
}

