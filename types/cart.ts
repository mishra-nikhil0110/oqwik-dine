// types/cart.ts - the client-side cart (docs: guest guide §5).
// The cart lives only in the browser (localStorage, one cart per table). Prices
// stored here are display snapshots: the server re-prices everything at checkout.

import type { Customisations } from "./api";

export interface CartLine {
  /** Stable identity: the dish plus its exact choices (see lib/cart.ts lineKey). */
  key: string;
  menuItemId: string;
  /** Snapshot for display when the dish has dropped off the menu. */
  name: string;
  /** Snapshot unit price; the live menu price wins whenever the dish is still listed. */
  price: number;
  isVeg: boolean;
  quantity: number;
  customisations?: Customisations;
}

export interface StoredCart {
  lines: CartLine[];
  note: string;
  updatedAt: number;
}
