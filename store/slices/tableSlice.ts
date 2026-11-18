// store/slices/tableSlice.ts - the scanned table: restaurant, table and menu (guide §4).

import { createSlice } from "@reduxjs/toolkit";
import type { TableMenu } from "@/types/api";
import { loadTable, type ThunkError } from "../thunks/tableThunks";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

interface TableState {
  qrSlug: string | null;
  data: TableMenu | null;
  status: LoadStatus;
  error: ThunkError | null;
  /** When the menu was last fetched (ms), for throttled refreshes. */
  loadedAt: number;
  refreshing: boolean;
}

const initialState: TableState = {
  qrSlug: null,
  data: null,
  status: "idle",
  error: null,
  loadedAt: 0,
  refreshing: false,
};

const tableSlice = createSlice({
  name: "table",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTable.pending, (state, action) => {
        const { qrSlug, silent } = action.meta.arg;
        if (state.qrSlug !== qrSlug) {
          // A different table: never show the previous restaurant's menu.
          state.qrSlug = qrSlug;
          state.data = null;
          state.loadedAt = 0;
        }
        if (silent && state.data) {
          state.refreshing = true;
        } else {
          state.status = "loading";
          state.error = null;
        }
      })
      .addCase(loadTable.fulfilled, (state, action) => {
        if (state.qrSlug !== action.meta.arg.qrSlug) return; // stale response
        state.data = action.payload;
        state.status = "ready";
        state.error = null;
        state.loadedAt = Date.now();
        state.refreshing = false;
      })
      .addCase(loadTable.rejected, (state, action) => {
        if (state.qrSlug !== action.meta.arg.qrSlug) return;
        state.refreshing = false;
        const error = action.payload ?? { status: 0, message: action.error.message ?? "Couldn't load the menu" };
        // A failed background refresh keeps the menu on screen, unless the QR is
        // no longer valid (404: table deactivated or its QR replaced).
        if (action.meta.arg.silent && state.data && error.status !== 404) return;
        state.data = null;
        state.status = "error";
        state.error = error;
      });
  },
});

export default tableSlice.reducer;
