// /pay/return?payment=<id> - where PhonePe sends the customer back (guide §6.2a).
// Renders the same polling screen as /pay/[paymentId], so reloading is safe.
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PoweredBy } from "@/components/ui/Brand";
import { Screen, StateMessage } from "@/components/ui/Layout";
import { PaymentStatusScreen } from "@/components/payment/PaymentStatusScreen";

/** Payment documentIds are short URL-safe strings; anything else is not a real return. */
const PAYMENT_ID = /^[A-Za-z0-9_-]{1,64}$/;

function PaymentReturn() {
  const paymentId = useSearchParams().get("payment") ?? "";

  if (!PAYMENT_ID.test(paymentId)) {
    return (
      <Screen className="justify-center">
        <StateMessage
          icon={<SearchX size={30} aria-hidden />}
          title="Payment link is incomplete"
          actions={<ButtonLink href="/">Go to start</ButtonLink>}
        >
          Scan the QR code on your table to get back to the menu. If you paid, your order has been placed.
        </StateMessage>
        <PoweredBy />
      </Screen>
    );
  }
  return <PaymentStatusScreen key={paymentId} paymentId={paymentId} />;
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentReturn />
    </Suspense>
  );
}
