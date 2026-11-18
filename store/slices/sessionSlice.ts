// store/slices/sessionSlice.ts - who is signed in (guide §3).
// The token itself never enters Redux; it lives in services/session.ts. This
// slice mirrors only what the UI needs: the customer and when the session ends.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { GuestCustomer } from "@/types/api";
import { checkSession, logout } from "../thunks/sessionThunks";

export type SessionStatus = "unknown" | "signedIn" | "signedOut";

interface SessionState {
  /** "unknown" until the stored token has been checked on page load. */
  status: SessionStatus;
  customer: GuestCustomer | null;
  expiresAt: string | null;
  loggingOut: boolean;
}

const initialState: SessionState = {
  status: "unknown",
  customer: null,
  expiresAt: null,
  loggingOut: false,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<{ customer: GuestCustomer; expiresAt: string }>) {
      state.status = "signedIn";
      state.customer = action.payload.customer;
      state.expiresAt = action.payload.expiresAt;
    },
    sessionEnded(state) {
      state.status = "signedOut";
      state.customer = null;
      state.expiresAt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = "signedIn";
          state.customer = action.payload.customer;
          state.expiresAt = action.payload.expires_at;
        } else {
          state.status = "signedOut";
          state.customer = null;
          state.expiresAt = null;
        }
      })
      .addCase(logout.pending, (state) => {
        state.loggingOut = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loggingOut = false;
        state.status = "signedOut";
        state.customer = null;
        state.expiresAt = null;
      });
  },
});

export const { sessionStarted, sessionEnded } = sessionSlice.actions;
export default sessionSlice.reducer;
