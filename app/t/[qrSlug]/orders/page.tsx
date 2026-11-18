// /t/[qrSlug]/orders - the signed-in customer's OWN orders at this restaurant
// (GET /guest/orders?qr_slug=), newest first, with live kitchen status.
// Orders are tied to the customer's session: other diners at the same table
// never see each other's orders. Polls the newest page every 10 s while the page
// is visible (guide §7); older pages load with "Load more".
"use client";

import { useCallback, useEffect } from "react";
import { ClipboardList, LogIn, LogOut, ReceiptText } from "lucide-react";
import type { GuestOrder } from "@/types/api";
import { ORDERS_POLL_INTERVAL_MS } from "@/services/config";
import { requestLogin } from "@/services/loginGate";
import { fmtDateTime, fmtPhone, fmtPrice, pluralize, tableName, toNumber } from "@/lib/format";
import { describeChoices } from "@/lib/menu";
import { cn } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import { tablePath, useTableSlug } from "@/hooks/useTableSlug";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadMoreOrders, loadOrders } from "@/store/thunks/ordersThunks";
import { logout } from "@/store/thunks/sessionThunks";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/IconButton";
import { PoweredBy } from "@/components/ui/Brand";
import { Screen, ScreenHeader, Skeleton, StateMessage } from "@/components/ui/Layout";
import { OrderProgress } from "@/components/order/OrderTracker";
import { TableChip } from "@/components/menu/MenuParts";

const PAYMENT_LABEL: Record<NonNullable<GuestOrder["payment_method"]>, string> = {
  online: "Paid online",
  upi: "Paid by UPI",
  card: "Paid by card",
  cash: "Paid in cash",
};

export default function OrdersPage() {
  const qrSlug = useTableSlug();
  const dispatch = useAppDispatch();
  const data = useAppSelector((s) => s.table.data);
  const session = useAppSelector((s) => s.session);
  const orders = useAppSelector((s) => s.orders);
  const signedIn = session.status === "signedIn";

  const refresh = useCallback(() => {
    if (qrSlug) void dispatch(loadOrders(qrSlug));
  }, [dispatch, qrSlug]);

  useEffect(() => {
    if (signedIn) refresh();
  }, [signedIn, refresh]);
  usePolling(refresh, ORDERS_POLL_INTERVAL_MS, signedIn);

  if (!data) return null;
  const { restaurant, table } = data;
  const header = (
    <ScreenHeader
      back={<BackButton href={tablePath(qrSlug)} label="Back to menu" />}
      title="Your orders"
      subtitle={restaurant.name}
      right={<TableChip table={table} />}
    />
  );

  // Orders belong to the verified customer: no session, nothing to show.
  if (session.status === "signedOut" || orders.error?.loginRequired) {
    return (
      <Screen>
        {header}
        <StateMessage
          icon={<LogIn size={30} aria-hidden />}
          title="Verify your number to see your orders"
          className="flex-1 justify-center"
          actions={
            <Button
              onClick={() => {
                void requestLogin().then((ok) => ok && refresh());
              }}
            >
              Verify number
            </Button>
          }
        >
          Your orders at {restaurant.name} and their kitchen status will show up here.
        </StateMessage>
        <PoweredBy />
      </Screen>
    );
  }

  const list = orders.qrSlug === qrSlug ? orders.list : [];
  const firstLoad = orders.status !== "ready" && list.length === 0;
  const hasMore = orders.qrSlug === qrSlug && orders.page < orders.pageCount;

  return (
    <Screen>
      {header}

      {firstLoad && orders.status !== "error" ? (
        <div className="mt-2 space-y-4" aria-busy="true" aria-label="Loading your orders">
          <Skeleton className="h-44 rounded-[24px]" />
          <Skeleton className="h-44 rounded-[24px]" />
        </div>
      ) : list.length === 0 && orders.status === "error" ? (
        <StateMessage
          icon={<ClipboardList size={30} aria-hidden />}
          title="Couldn't load your orders"
          tone="danger"
          className="flex-1 justify-center"
          actions={<Button onClick={refresh}>Try again</Button>}
        >
          {orders.error?.message}
        </StateMessage>
      ) : list.length === 0 ? (
        <StateMessage
          icon={<ClipboardList size={30} aria-hidden />}
          title="No orders yet"
          className="flex-1 justify-center"
          actions={<ButtonLink href={tablePath(qrSlug)}>Browse the menu</ButtonLink>}
        >
          Orders you place at {restaurant.name} will show up here with their kitchen status.
        </StateMessage>
      ) : (
        <>
          {orders.error && (
            <p className="mb-3 rounded-[14px] bg-mist px-4 py-3 text-[14px] text-ink-2" role="status">
              Couldn&apos;t refresh just now. Showing the last update.
            </p>
          )}
          <p className="mt-1 mb-3 text-[15px] text-ink-2">{pluralize(orders.total || list.length, "order")}</p>
          <ul className="space-y-4" aria-live="polite">
            {list.map((order) => (
              <OrderCard key={order.documentId} order={order} currency={restaurant.currency} />
            ))}
          </ul>
          {hasMore && (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              className="mt-4"
              loading={orders.loadingMore}
              onClick={() => void dispatch(loadMoreOrders(qrSlug))}
            >
              Load more
            </Button>
          )}
          <p className="mt-4 text-center text-[14px] text-ink-3">Kitchen status updates every 10 seconds</p>
        </>
      )}

      {session.customer && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[15px] text-ink-2">
          <span>Signed in as {fmtPhone(session.customer.phone)}</span>
          <button
            type="button"
            onClick={() => void dispatch(logout())}
            disabled={session.loggingOut}
            className="inline-flex h-11 items-center gap-1.5 font-semibold text-brand disabled:opacity-60"
          >
            <LogOut size={16} aria-hidden /> Log out
          </button>
        </div>
      )}
      <PoweredBy />
    </Screen>
  );
}

function OrderCard({ order, currency }: { order: GuestOrder; currency: string }) {
  const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const active = order.status !== "served" && order.status !== "cancelled";
  const paid = order.payment_status === "paid";
  const billToken = order.bill?.token;

  return (
    <li className={cn("rounded-[24px] border-2 p-5", active ? "border-marigold bg-marigold-soft/40" : "border-line bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[19px] font-bold">Order #{order.order_number}</p>
          <p className="text-[15px] text-ink-2">
            {fmtDateTime(order.createdAt)}
            {order.table ? ` · ${tableName(order.table)}` : ""} · {pluralize(itemCount, "item")}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-[10px] px-2.5 py-1 text-[13px] font-bold",
            paid ? "bg-marigold text-ink" : "bg-mist text-ink-2",
          )}
        >
          {paid ? "PAID" : "UNPAID"}
        </span>
      </div>

      <div className="mt-4">
        <OrderProgress status={order.status} />
      </div>

      <ul className="mt-4 space-y-2 border-t border-line pt-4">
        {order.order_items.map((item) => {
          const choices = describeChoices(item.customisations);
          return (
            <li key={item.documentId} className="flex justify-between gap-4 text-[16px]">
              <span className="min-w-0">
                {item.name_snapshot} × {item.quantity}
                {choices && <span className="block text-[14px] text-ink-2">{choices}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{fmtPrice(toNumber(item.item_total), currency)}</span>
            </li>
          );
        })}
      </ul>
      {order.special_instructions && (
        <p className="mt-3 rounded-[12px] bg-mist px-3 py-2 text-[14px] break-words text-ink-2">
          Note: {order.special_instructions}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[15px] text-ink-2">
          {paid && order.payment_method ? PAYMENT_LABEL[order.payment_method] : paid ? "Paid" : "Payment pending"}
        </span>
        <span className="text-[17px] font-bold tabular-nums">{fmtPrice(toNumber(order.total_amount), currency)}</span>
      </div>
      {billToken && (
        <ButtonLink
          href={`/bill/${encodeURIComponent(billToken)}`}
          variant="secondary"
          size="sm"
          fullWidth
          className="mt-4"
          iconLeft={<ReceiptText size={18} aria-hidden />}
        >
          View bill {order.bill?.bill_number ? `· ${order.bill.bill_number}` : ""}
        </ButtonLink>
      )}
    </li>
  );
}
