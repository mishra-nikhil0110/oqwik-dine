// store/slices/cartSlice.ts - client-side cart, one per table (guide §5).
// Reducers are pure; limits (lines, quantities, note length) are enforced by the
// thunks in store/thunks/cartThunks.ts so the customer gets a message.
// Persistence to localStorage happens in store/StoreProvider.tsx.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CartLine, StoredCart } from "@/types/cart";
import { MAX_LINE_QUANTITY } from "@/services/config";

interface CartState {
  /** The table this cart belongs to; null until hydrated. */
  qrSlug: string | null;
  lines: CartLine[];
  note: string;
  /** True once the stored cart has been read, so it is never overwritten with an empty one. */
  hydrated: boolean;
}

const initialState: CartState = { qrSlug: null, lines: [], note: "", hydrated: false };

const clampQuantity = (quantity: number) => Math.min(MAX_LINE_QUANTITY, Math.max(0, Math.floor(quantity)));

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    cartHydrated(state, action: PayloadAction<{ qrSlug: string; cart: StoredCart | null }>) {
      state.qrSlug = action.payload.qrSlug;
      state.lines = action.payload.cart?.lines ?? [];
      state.note = action.payload.cart?.note ?? "";
      state.hydrated = true;
    },
    /** Adds a line, or adds to the quantity of the identical line already in the cart. */
    lineAdded(state, action: PayloadAction<CartLine>) {
      const line = action.payload;
      const existing = state.lines.find((l) => l.key === line.key);
      if (existing) {
        existing.quantity = clampQuantity(existing.quantity + line.quantity);
        existing.price = line.price;
      } else {
        state.lines.push({ ...line, quantity: clampQuantity(line.quantity) });
      }
    },
    /** Sets a line's quantity; 0 removes it. */
    quantitySet(state, action: PayloadAction<{ key: string; quantity: number }>) {
      const quantity = clampQuantity(action.payload.quantity);
      if (quantity === 0) {
        state.lines = state.lines.filter((l) => l.key !== action.payload.key);
        return;
      }
      const line = state.lines.find((l) => l.key === action.payload.key);
      if (line) line.quantity = quantity;
    },
    /**
     * Replaces a line after its choices were edited. If the new choices match
     * another line, the two merge (quantities add up, capped at 50).
     */
    lineReplaced(state, action: PayloadAction<{ oldKey: string; line: CartLine }>) {
      const { oldKey, line } = action.payload;
      const index = state.lines.findIndex((l) => l.key === oldKey);
      const twin = state.lines.find((l) => l.key === line.key && l.key !== oldKey);
      if (twin) {
        twin.quantity = clampQuantity(twin.quantity + line.quantity);
        if (index >= 0) state.lines.splice(index, 1);
      } else if (index >= 0) {
        state.lines[index] = { ...line, quantity: clampQuantity(line.quantity) };
      } else {
        state.lines.push({ ...line, quantity: clampQuantity(line.quantity) });
      }
    },
    lineRemoved(state, action: PayloadAction<string>) {
      state.lines = state.lines.filter((l) => l.key !== action.payload);
    },
    noteSet(state, action: PayloadAction<string>) {
      state.note = action.payload;
    },
    /** Empties the cart (after its payment succeeded). */
    cartCleared(state) {
      state.lines = [];
      state.note = "";
    },
  },
});

export const { cartHydrated, lineAdded, quantitySet, lineReplaced, lineRemoved, noteSet, cartCleared } =
  cartSlice.actions;
export default cartSlice.reducer;
