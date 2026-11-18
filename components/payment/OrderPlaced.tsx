// components/payment/OrderPlaced.tsx - design screen 10, shown once the payment
// is "paid": the order exists and the bill has been sent on WhatsApp.
// The order is tracked on its own (GET /guest/orders/:id, the customer's order
// only), refreshed every 10 s while the page is visible (guide §7).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, ClipboardList } from "lucide-react";
import type { DiningTable, GuestOrder, PaymentView } from "@/types/api";
import { ORDERS_POLL_INTERVAL_MS } from "@/services/config";
import { guestApi } from "@/services/guestApi";
import { fmtPrice, tableName, toNumber } from "@/lib/format";
import { describeChoices } from "@/lib/menu";
import { usePolling } from "@/hooks/usePolling";
import { tablePath } from "@/hooks/useTableSlug";
import { useAppSelector } from "@/store/hooks";
import { ButtonLink } from "@/components/ui/Button";
import { PoweredBy } from "@/components/ui/Brand";
import { OrderTracker, statusHeadline } from "@/components/order/OrderTracker";

interface OrderPlacedProps {
  payment: PaymentView;
  /** The table the order was placed at, when known (same tab). */
  qrSlug: string | null;
  table: DiningTable | null;
}

export function OrderPlaced({ payment, qrSlug, table }: OrderPlacedProps) {
  const signedIn = useAppSelector((s) => s.session.status === "signedIn");
  const orderId = payment.order?.documentId ?? null;
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!orderId || !signedIn || inFlight.current) return;
    inFlight.current = true;
    try {
      setOrder(await guestApi.getMyOrder(orderId));
    } catch {
      // Keep the last known status. A network blip is retried by the next poll;
      // an ended session (LoginRequiredError) flips `signedIn`, which stops polling.
    } finally {
      inFlight.current = false;
    }
  }, [orderId, signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  usePolling(() => void refresh(), ORDERS_POLL_INTERVAL_MS, Boolean(orderId && signedIn));

  const status = order?.status ?? payment.order?.status ?? "placed";
  const orderNumber = order?.order_number ?? payment.order?.order_number;
  // Prefer the order's own table (always right) over the tab's remembered table.
  const orderTable = order?.table ?? table;
  const label = orderTable ? tableName(orderTable) : "your table";
  const currency = payment.currency;
  const billToken = payment.bill?.token ?? order?.bill?.token ?? null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col">
      <section className="relative overflow-hidden rounded-b-[36px] bg-brand px-5 pt-[max(48px,calc(env(safe-area-inset-top)+32px))] pb-10 text-center text-white md:mt-6 md:rounded-[36px]">
        <span aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-64 rounded-full border-[24px] border-white/10" />
        <div className="relative mx-auto flex size-[104px] animate-pop items-center justify-center rounded-full bg-white/20">
          <span className="flex size-20 items-center justify-center rounded-full bg-marigold text-ink">
            <Check size={40} strokeWidth={3.2} aria-hidden />
          </span>
        </div>
        <h1 className="relative mt-6 text-[34px] leading-tight font-bold tracking-[-0.02em]">Order placed!</h1>
        <p className="relative mt-2 text-[18px] text-white/80">
          {orderNumber !== undefined ? `Order #${orderNumber}` : "Payment received"}
          {orderTable ? ` · ${tableName(orderTable)}` : ""}
        </p>
        <p className="relative mx-auto mt-5 inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-5 text-[16px] font-semibold text-ink">
          <Clock size={20} className="text-brand" aria-hidden />
          {statusHeadline(status)}
        </p>
      </section>

      <div className="flex flex-1 flex-col px-5 pt-6 md:px-6">
        <section className="rounded-[24px] border border-line p-5 sm:p-6" aria-labelledby="order-status-title">
          <h2 id="order-status-title" className="text-section">
            Order status
          </h2>
          <OrderTracker status={status} tableLabel={label} />
        </section>

        <section className="mt-5 rounded-[24px] bg-mist p-5 sm:p-6" aria-label="Order summary">
          {order && order.order_items.length > 0 && (
            <ul className="space-y-3 border-b border-line pb-4">
              {order.order_items.map((item) => {
                const choices = describeChoices(item.customisations);
                return (
                  <li key={item.documentId} className="flex justify-between gap-4 text-[17px]">
                    <span className="min-w-0 text-ink-2">
                      {item.name_snapshot} × {item.quantity}
                      {choices && <span className="block text-[14px] text-ink-3">{choices}</span>}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{fmtPrice(toNumber(item.item_total), currency)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={order && order.order_items.length > 0 ? "flex items-center gap-3 pt-4" : "flex items-center gap-3"}>
            <span className="flex-1 text-[19px] font-bold">Paid online</span>
            <span className="rounded-[10px] bg-marigold px-3 py-1 text-[14px] font-bold text-ink">PAID</span>
            <span className="text-[21px] font-bold tabular-nums">{fmtPrice(order?.total_amount ?? payment.amount, currency)}</span>
          </div>
        </section>

        <p className="mt-4 text-center text-[15px] text-ink-2">Your bill has been sent to your WhatsApp.</p>

        <div className={billToken && qrSlug ? "mt-6 grid grid-cols-2 gap-3" : "mt-6 grid gap-3"}>
          {billToken && (
            <ButtonLink href={`/bill/${encodeURIComponent(billToken)}`} variant="secondary">
              View bill
            </ButtonLink>
          )}
          {qrSlug && <ButtonLink href={tablePath(qrSlug)}>Order more</ButtonLink>}
        </div>
        {qrSlug && (
          <ButtonLink
            href={tablePath(qrSlug, "/orders")}
            variant="ghost"
            size="md"
            className="mt-3"
            iconLeft={<ClipboardList size={18} aria-hidden />}
          >
            See all your orders
          </ButtonLink>
        )}

        <PoweredBy className="mt-auto pb-[max(24px,env(safe-area-inset-bottom))]" />
      </div>
    </main>
  );
}
