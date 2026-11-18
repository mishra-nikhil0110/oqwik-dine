// store/slices/ordersSlice.ts - the signed-in customer's own orders at the
// current restaurant (GET /guest/orders?qr_slug=), newest first, paged.

import { createSlice } from "@reduxjs/toolkit";
import type { GuestOrder } from "@/types/api";
import { loadMoreOrders, loadOrders } from "../thunks/ordersThunks";
import type { ThunkError } from "../thunks/tableThunks";
import type { LoadStatus } from "./tableSlice";
import { sessionEnded } from "./sessionSlice";
import { logout } from "../thunks/sessionThunks";

interface OrdersState {
  qrSlug: string | null;
  list: GuestOrder[];
  /** Highest page loaded so far, and how many pages / orders exist in total. */
  page: number;
  pageCount: number;
  total: number;
  status: LoadStatus;
  loadingMore: boolean;
  error: ThunkError | null;
  loadedAt: number;
}

const initialState: OrdersState = {
  qrSlug: null,
  list: [],
  page: 0,
  pageCount: 0,
  total: 0,
  status: "idle",
  loadingMore: false,
  error: null,
  loadedAt: 0,
};

/**
 * Puts a fresh first page in front of what is already loaded: orders present in
 * both are replaced by the fresh copy (new kitchen status), new ones come first,
 * and older pages loaded with "Load more" are kept.
 */
function mergeFirstPage(current: GuestOrder[], fresh: GuestOrder[]): GuestOrder[] {
  const freshIds = new Set(fresh.map((order) => order.documentId));
  return [...fresh, ...current.filter((order) => !freshIds.has(order.documentId))];
}

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadOrders.pending, (state, action) => {
        if (state.qrSlug !== action.meta.arg) {
          // Another restaurant: start over.
          Object.assign(state, initialState, { qrSlug: action.meta.arg, status: "loading" });
        } else if (state.status !== "ready") {
          // Polling keeps the list on screen; only the first load shows a spinner.
          state.status = "loading";
        }
        state.error = null;
      })
      .addCase(loadOrders.fulfilled, (state, action) => {
        if (state.qrSlug !== action.meta.arg) return;
        const { data, meta } = action.payload;
        state.list = state.page > 1 ? mergeFirstPage(state.list, data) : data;
        state.page = Math.max(state.page, 1);
        state.pageCount = meta.pagination.pageCount;
        state.total = meta.pagination.total;
        state.status = "ready";
        state.loadedAt = Date.now();
      })
      .addCase(loadOrders.rejected, (state, action) => {
        if (state.qrSlug !== action.meta.arg) return;
        const error = action.payload ?? { status: 0, message: action.error.message ?? "Couldn't load your orders" };
        if (error.loginRequired) {
          // Orders are private: drop them with the session.
          Object.assign(state, initialState, { qrSlug: state.qrSlug, status: "error", error });
          return;
        }
        // A failed poll keeps the last list; the error is shown alongside it.
        state.error = error;
        if (state.status !== "ready") state.status = "error";
      })
      .addCase(loadMoreOrders.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(loadMoreOrders.fulfilled, (state, action) => {
        state.loadingMore = false;
        if (state.qrSlug !== action.meta.arg) return;
        const { data, meta } = action.payload;
        const known = new Set(state.list.map((order) => order.documentId));
        // A new order placed meanwhile shifts pages by one: skip what is already shown.
        state.list.push(...data.filter((order) => !known.has(order.documentId)));
        state.page = meta.pagination.page;
        state.pageCount = meta.pagination.pageCount;
        state.total = meta.pagination.total;
      })
      .addCase(loadMoreOrders.rejected, (state, action) => {
        state.loadingMore = false;
        if (action.payload) state.error = action.payload;
      })
      .addCase(sessionEnded, () => initialState)
      .addCase(logout.fulfilled, () => initialState);
  },
});

export default ordersSlice.reducer;
