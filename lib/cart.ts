// lib/cart.ts - cart identity, live pricing and the estimated bill (guide §5).
//
// The estimate follows the server's formula exactly (order service priceCart):
//   service charge = subtotal x service_charge_percent
//   tax            = (subtotal + service charge) x tax_percent
// each rounded to paise. It is still only an estimate: the server decides the
// real amount at checkout and that is what the customer pays.

import type { CheckoutLine, Customisations, Restaurant } from "@/types/api";
import type { CartLine } from "@/types/cart";
import { MAX_CUSTOMISATIONS_BYTES } from "@/services/config";
import type { IndexedDish } from "./menu";
import { round2 } from "./format";
import { stableStringify, utf8Length } from "./utils";

/** The same dish with the same choices is one line; different choices are separate lines. */
export function lineKey(menuItemId: string, customisations?: Customisations): string {
  const choices = customisations && Object.keys(customisations).length ? stableStringify(customisations) : "";
  return choices ? `${menuItemId}::${choices}` : menuItemId;
}

/** Choices small enough for the server's 2 KB-per-line limit. */
export function customisationsFit(customisations?: Customisations): boolean {
  return !customisations || utf8Length(JSON.stringify(customisations)) <= MAX_CUSTOMISATIONS_BYTES;
}

export interface PricedLine extends CartLine {
  /** Live unit price when the dish is on the menu, snapshot otherwise. */
  unitPrice: number;
  lineTotal: number;
  /** False when the dish sold out / was removed since it was added. */
  available: boolean;
}

/**
 * Joins the cart with the live menu. `menuIndex` is null while the menu is not
 * loaded, in which case every line is assumed available at its snapshot price.
 */
export function priceLines(lines: CartLine[], menuIndex: Map<string, IndexedDish> | null): PricedLine[] {
  return lines.map((line) => {
    const dish = menuIndex?.get(line.menuItemId);
    const available = menuIndex ? Boolean(dish) : true;
    const unitPrice = dish ? dish.price : line.price;
    return { ...line, unitPrice, available, lineTotal: round2(unitPrice * line.quantity) };
  });
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
}

const percentOf = (amount: number, percent: number) => round2((amount * (Number(percent) || 0)) / 100);

/** Estimated bill for the available lines only (unavailable lines are never sent). */
export function estimateTotals(
  lines: PricedLine[],
  restaurant: Pick<Restaurant, "tax_percent" | "service_charge_percent"> | null,
): CartTotals {
  const billable = lines.filter((line) => line.available);
  const subtotal = round2(billable.reduce((sum, line) => sum + line.lineTotal, 0));
  const serviceCharge = percentOf(subtotal, restaurant?.service_charge_percent ?? 0);
  const tax = percentOf(subtotal + serviceCharge, restaurant?.tax_percent ?? 0);
  return {
    itemCount: billable.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    serviceCharge,
    tax,
    total: round2(subtotal + serviceCharge + tax),
  };
}

/** Checkout payload lines. Never includes prices: the server prices from the QR slug. */
export function toCheckoutLines(lines: PricedLine[]): CheckoutLine[] {
  return lines
    .filter((line) => line.available)
    .map((line) => {
      const payload: CheckoutLine = { menu_item: line.menuItemId, quantity: line.quantity };
      if (line.customisations && Object.keys(line.customisations).length) payload.customisations = line.customisations;
      return payload;
    });
}
