// store/thunks/ordersThunks.ts - the signed-in customer's own orders.
//
//   loadOrders(qrSlug)      GET /guest/orders?qr_slug=&page=1 - first page; also the
//                           10 s poll that refreshes kitchen statuses (guide §7)
//   loadMoreOrders(qrSlug)  the next page, appended ("Load more")
//
// Only the caller's orders are ever returned (the API filters by the session),
// never other diners' at the same table. These thunks never open the login sheet
// by themselves - polling must not nag; a LoginRequired result is stored and the
// page offers a "Verify number" button instead.

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { GuestOrderPage } from "@/types/api";
import { guestApi } from "@/services/guestApi";
import type { RootState } from "../store";
import { toThunkError, type ThunkError } from "./tableThunks";

/** Orders per page (the API allows up to 50). */
export const ORDERS_PAGE_SIZE = 20;

let inFlight = false;

export const loadOrders = createAsyncThunk<GuestOrderPage, string, { rejectValue: ThunkError }>(
  "orders/load",
  async (qrSlug, { rejectWithValue }) => {
    inFlight = true;
    try {
      return await guestApi.getMyOrders({ qrSlug, page: 1, pageSize: ORDERS_PAGE_SIZE });
    } catch (error) {
      return rejectWithValue(toThunkError(error));
    } finally {
      inFlight = false;
    }
  },
  {
    // A slow response must not stack up with the next 10 s poll.
    condition: () => !inFlight,
  },
);

export const loadMoreOrders = createAsyncThunk<
  GuestOrderPage,
  string,
  { rejectValue: ThunkError; state: RootState }
>(
  "orders/loadMore",
  async (qrSlug, { getState, rejectWithValue }) => {
    const { page } = getState().orders;
    try {
      return await guestApi.getMyOrders({ qrSlug, page: page + 1, pageSize: ORDERS_PAGE_SIZE });
    } catch (error) {
      return rejectWithValue(toThunkError(error));
    }
  },
  {
    condition: (qrSlug, { getState }) => {
      const { orders } = getState();
      return orders.qrSlug === qrSlug && !orders.loadingMore && orders.page < orders.pageCount;
    },
  },
);
