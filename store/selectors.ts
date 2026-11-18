// store/selectors.ts - memoised derived data shared by the menu, cart and checkout.

import { createSelector } from "@reduxjs/toolkit";
import { estimateTotals, priceLines } from "@/lib/cart";
import { indexMenu } from "@/lib/menu";
import type { RootState } from "./store";

export const selectTableData = (state: RootState) => state.table.data;
export const selectRestaurant = (state: RootState) => state.table.data?.restaurant ?? null;
export const selectCartLines = (state: RootState) => state.cart.lines;

/** documentId -> dish, or null while the menu is not loaded. */
export const selectMenuIndex = createSelector([selectTableData], (data) => (data ? indexMenu(data.menu) : null));

/** Cart lines joined with live prices and availability. */
export const selectPricedLines = createSelector([selectCartLines, selectMenuIndex], (lines, index) =>
  priceLines(lines, index),
);

export const selectCartTotals = createSelector([selectPricedLines, selectRestaurant], (lines, restaurant) =>
  estimateTotals(lines, restaurant),
);

/** Lines whose dish sold out or was removed since it was added. */
export const selectUnavailableLines = createSelector([selectPricedLines], (lines) => lines.filter((l) => !l.available));

/** Total quantity in the cart per dish (all choice variants together), for menu steppers. */
export const selectQuantityByDish = createSelector([selectCartLines], (lines) => {
  const map = new Map<string, number>();
  for (const line of lines) map.set(line.menuItemId, (map.get(line.menuItemId) ?? 0) + line.quantity);
  return map;
});
