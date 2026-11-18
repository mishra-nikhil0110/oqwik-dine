// components/order/OrderTracker.tsx - kitchen progress, two forms:
//   OrderTracker    vertical 3-step "Order status" card (design screen 10)
//   OrderProgress   compact 5-segment bar for the orders list (guide §7:
//                   placed -> accepted -> preparing -> ready -> served)
// A cancelled order shows "Cancelled, contact staff" (refunds are handled by staff).

import { Check, XCircle } from "lucide-react";
import type { OrderStatus } from "@/types/api";
import { STATUS_FLOW, STATUS_LABEL, statusIndex, trackerStep } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";

export function CancelledNotice({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-[18px] bg-danger-soft p-4 text-danger", className)} role="status">
      <XCircle size={22} className="mt-0.5 shrink-0" aria-hidden />
      <div>
        <p className="text-[17px] font-semibold">Cancelled, contact staff</p>
        <p className="text-[15px]">The restaurant cancelled this order. The staff will help you with a refund.</p>
      </div>
    </div>
  );
}

export function OrderTracker({ status, tableLabel }: { status: OrderStatus; tableLabel: string }) {
  if (status === "cancelled") return <CancelledNotice />;

  const current = trackerStep(status);
  const steps = [
    { title: "Order received", text: "The kitchen has your order" },
    { title: "Preparing", text: "Your food is being cooked" },
    {
      title: "Served at your table",
      text: status === "ready" ? `Ready, coming to ${tableLabel}` : `We'll bring it to ${tableLabel}`,
    },
  ];

  return (
    <ol className="mt-5" aria-label="Order progress">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const last = index === steps.length - 1;
        return (
          <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0" aria-current={active ? "step" : undefined}>
            {!last && (
              <span
                aria-hidden
                className={cn("absolute top-12 left-[21px] h-[calc(100%-44px)] w-[3px] rounded-full", done ? "bg-marigold" : "bg-line")}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full",
                done ? "bg-marigold text-ink" : active ? "border-[3px] border-brand bg-brand-soft" : "border-2 border-line bg-white",
              )}
            >
              {done ? <Check size={22} strokeWidth={3} /> : active ? <span className="size-4 rounded-full bg-brand" /> : null}
            </span>
            <div className="pt-1">
              <p className={cn("text-[19px] font-semibold", !done && !active && "text-ink-2")}>{step.title}</p>
              <p className="text-[16px] text-ink-2">{step.text}</p>
              <span className="sr-only">{done ? "Done" : active ? "In progress" : "Not started"}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return <p className="text-[15px] font-semibold text-danger">Cancelled, contact staff</p>;
  }
  const index = statusIndex(status);
  return (
    <div>
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-label="Kitchen progress"
        aria-valuemin={1}
        aria-valuemax={STATUS_FLOW.length}
        aria-valuenow={index + 1}
        aria-valuetext={STATUS_LABEL[status]}
      >
        {STATUS_FLOW.map((step, i) => (
          <span key={step} className={cn("h-2 flex-1 rounded-full", i <= index ? "bg-marigold" : "bg-line")} />
        ))}
      </div>
      <p className="mt-2 text-[15px] font-semibold">{STATUS_LABEL[status]}</p>
    </div>
  );
}

/** One-line live status for the "Order placed" chip. */
export function statusHeadline(status: OrderStatus): string {
  switch (status) {
    case "placed":
    case "accepted":
      return "The kitchen has your order";
    case "preparing":
      return "Your food is being prepared";
    case "ready":
      return "Ready, coming to your table";
    case "served":
      return "Served. Enjoy your meal!";
    default:
      return "Cancelled, contact staff";
  }
}
