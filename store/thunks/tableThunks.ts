// store/thunks/tableThunks.ts - GET /guest/tables/:qrSlug (public).

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { TableMenu } from "@/types/api";
import { ApiError, LoginRequiredError, errorMessage } from "@/services/apiClient";
import { guestApi } from "@/services/guestApi";

/** Serializable error stored in slices. */
export interface ThunkError {
  status: number;
  message: string;
  loginRequired?: boolean;
  retryAfter?: number | null;
}

export function toThunkError(error: unknown): ThunkError {
  if (error instanceof LoginRequiredError) return { status: 401, message: error.message, loginRequired: true };
  if (error instanceof ApiError) return { status: error.status, message: error.message, retryAfter: error.retryAfter };
  return { status: 0, message: errorMessage(error) };
}

interface LoadTableArgs {
  qrSlug: string;
  /** Background refresh: keep showing the current menu while it loads. */
  silent?: boolean;
}

export const loadTable = createAsyncThunk<TableMenu, LoadTableArgs, { rejectValue: ThunkError; state: { table: { qrSlug: string | null; status: string; refreshing: boolean } } }>(
  "table/load",
  async ({ qrSlug }, { rejectWithValue }) => {
    try {
      const data = await guestApi.getTableMenu(qrSlug);
      // Only active categories that still have dishes are useful to the customer.
      return { ...data, menu: (data.menu ?? []).filter((c) => Array.isArray(c.menu_items) && c.menu_items.length > 0) };
    } catch (error) {
      return rejectWithValue(toThunkError(error));
    }
  },
  {
    // Never run two loads of the same table at once.
    condition: ({ qrSlug }, { getState }) => {
      const { table } = getState();
      return !(table.qrSlug === qrSlug && (table.status === "loading" || table.refreshing));
    },
  },
);
