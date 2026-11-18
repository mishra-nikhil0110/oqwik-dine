// /pay/[paymentId] - payment confirmation page (guide §2). Razorpay ends here
// after its popup; it is also where "Payment in progress" links point.
"use client";

import { useParams } from "next/navigation";
import { PaymentStatusScreen } from "@/components/payment/PaymentStatusScreen";

export default function PaymentPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  return <PaymentStatusScreen key={paymentId} paymentId={paymentId} />;
}
