// store/thunks/cartThunks.ts - cart actions that enforce the server's limits
// (1-50 lines, quantity 1-50 per line, note <= 500 chars, choices <= 2 KB per line)
// and tell the customer when one is hit. Each returns true when applied.

import type { Customisations } from "@/types/api";
import type { CartLine, StoredCart } from "@/types/cart";
import { CART_MAX_AGE_MS, MAX_CART_LINES, MAX_LINE_QUANTITY, MAX_NOTE_LENGTH, cartStorageKey } from "@/services/config";
import { readJson, removeKey } from "@/services/storage";
import { toast } from "@/services/toast";
import { customisationsFit, lineKey } from "@/lib/cart";
import type { AppDispatch, RootState } from "../store";
import { cartCleared, cartHydrated, lineAdded, lineReplaced, noteSet, quantitySet } from "../slices/cartSlice";

type Thunk<R> = (dispatch: AppDispatch, getState: () => RootState) => R;

function isValidLine(line: unknown): line is CartLine {
  const l = line as CartLine;
  return (
    !!l &&
    typeof l.key === "string" &&
    typeof l.menuItemId === "string" &&
    typeof l.name === "string" &&
    Number.isFinite(l.price) &&
    Number.isInteger(l.quantity) &&
    l.quantity >= 1 &&
    l.quantity <= MAX_LINE_QUANTITY
  );
}

/** Loads the table's stored cart (dropping stale or malformed data). */
export const hydrateCart =
  (qrSlug: string): Thunk<void> =>
  (dispatch, getState) => {
    const { cart } = getState();
    if (cart.hydrated && cart.qrSlug === qrSlug) return;

    const stored = readJson<StoredCart>("local", cartStorageKey(qrSlug));
    const fresh = stored && Date.now() - (stored.updatedAt ?? 0) < CART_MAX_AGE_MS;
    if (stored && !fresh) removeKey("local", cartStorageKey(qrSlug));

    const lines = fresh && Array.isArray(stored.lines) ? stored.lines.filter(isValidLine).slice(0, MAX_CART_LINES) : [];
    const note = fresh && typeof stored.note === "string" ? stored.note.slice(0, MAX_NOTE_LENGTH) : "";
    dispatch(cartHydrated({ qrSlug, cart: { lines, note, updatedAt: Date.now() } }));
  };

interface AddArgs {
  menuItemId: string;
  name: string;
  price: number;
  isVeg: boolean;
  quantity: number;
  customisations?: Customisations;
}

function buildLine(args: AddArgs): CartLine {
  const customisations = args.customisations && Object.keys(args.customisations).length ? args.customisations : undefined;
  return {
    key: lineKey(args.menuItemId, customisations),
    menuItemId: args.menuItemId,
    name: args.name,
    price: args.price,
    isVeg: args.isVeg,
    quantity: args.quantity,
    customisations,
  };
}

/** Adds a dish (with its choices) to the cart. */
export const addToCart =
  (args: AddArgs): Thunk<boolean> =>
  (dispatch, getState) => {
    const line = buildLine(args);
    if (!customisationsFit(line.customisations)) {
      toast.error("Too many choices for one dish. Please pick fewer options.");
      return false;
    }
    const { lines } = getState().cart;
    const existing = lines.find((l) => l.key === line.key);
    if (!existing && lines.length >= MAX_CART_LINES) {
      toast.error(`A single order can have up to ${MAX_CART_LINES} different items.`);
      return false;
    }
    if ((existing?.quantity ?? 0) + line.quantity > MAX_LINE_QUANTITY) {
      toast.error(`You can order up to ${MAX_LINE_QUANTITY} of the same item at once.`);
      return false;
    }
    dispatch(lineAdded(line));
    return true;
  };

/** Replaces an edited line (choices and/or quantity). */
export const updateCartLine =
  (oldKey: string, args: AddArgs): Thunk<boolean> =>
  (dispatch, getState) => {
    const line = buildLine(args);
    if (!customisationsFit(line.customisations)) {
      toast.error("Too many choices for one dish. Please pick fewer options.");
      return false;
    }
    const twin = getState().cart.lines.find((l) => l.key === line.key && l.key !== oldKey);
    if (twin && twin.quantity + line.quantity > MAX_LINE_QUANTITY) {
      toast.error(`You can order up to ${MAX_LINE_QUANTITY} of the same item at once.`);
      return false;
    }
    dispatch(lineReplaced({ oldKey, line }));
    return true;
  };

/** +1 / -1 on a line (0 removes it). */
export const changeQuantity =
  (key: string, delta: number): Thunk<boolean> =>
  (dispatch, getState) => {
    const line = getState().cart.lines.find((l) => l.key === key);
    if (!line) return false;
    const next = line.quantity + delta;
    if (next > MAX_LINE_QUANTITY) {
      toast.error(`You can order up to ${MAX_LINE_QUANTITY} of the same item at once.`);
      return false;
    }
    dispatch(quantitySet({ key, quantity: Math.max(0, next) }));
    return true;
  };

export const setCartNote =
  (note: string): Thunk<void> =>
  (dispatch) => {
    dispatch(noteSet(note.slice(0, MAX_NOTE_LENGTH)));
  };

/**
 * Empties a table's cart after its payment succeeded: the in-memory cart when
 * it is that table's, and the stored copy either way.
 */
export const clearCartFor =
  (qrSlug: string): Thunk<void> =>
  (dispatch, getState) => {
    removeKey("local", cartStorageKey(qrSlug));
    if (getState().cart.qrSlug === qrSlug) dispatch(cartCleared());
  };
