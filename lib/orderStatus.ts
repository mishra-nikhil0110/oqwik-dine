// lib/orderStatus.ts - customer-facing wording for kitchen statuses (guide §7).
// Flow: placed -> accepted -> preparing -> ready -> served. Staff may skip ahead,
// never go back. `cancelled` is terminal and refunds are handled by staff.

import type { OrderStatus } from "@/types/api";

export const STATUS_FLOW: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "served"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order received",
  accepted: "Accepted by the kitchen",
  preparing: "Preparing",
  ready: "Ready to serve",
  served: "Served",
  cancelled: "Cancelled, contact staff",
};

/** 0..4 position in the flow; -1 for cancelled. */
export function statusIndex(status: OrderStatus): number {
  return STATUS_FLOW.indexOf(status);
}

/**
 * The three-step tracker from the "Order placed" design:
 *   0 Order received -> 1 Preparing -> 2 Served at your table.
 * Returns the step in progress; steps before it are done, 3 means all done.
 */
export function trackerStep(status: OrderStatus): number {
  switch (status) {
    case "placed":
    case "accepted":
      return 0; // the kitchen has the order
    case "preparing":
      return 1; // being cooked
    case "ready":
      return 2; // cooked, on its way to the table
    case "served":
      return 3;
    default:
      return 0;
  }
}
