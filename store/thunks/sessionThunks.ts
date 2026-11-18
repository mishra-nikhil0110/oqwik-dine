// store/thunks/sessionThunks.ts - page-load session check and logout (guide §3).

import { createAsyncThunk } from "@reduxjs/toolkit";
import { LoginRequiredError } from "@/services/apiClient";
import { guestApi } from "@/services/guestApi";
import { clearSession, getSession, updateSessionProfile, type StoredSession } from "@/services/session";

/**
 * On page load: token in storage and not expired? -> GET /guest/me.
 * 200 refreshes the stored profile; 401 clears the token (the menu still shows).
 * A network error keeps the stored session: the next signed-in call will tell.
 * Resolves to the live session, or null when signed out.
 */
export const checkSession = createAsyncThunk<StoredSession | null>("session/check", async () => {
  const stored = getSession();
  if (!stored) {
    clearSession();
    return null;
  }
  try {
    const me = await guestApi.me();
    return updateSessionProfile(me.customer, me.expires_at) ?? stored;
  } catch (error) {
    if (error instanceof LoginRequiredError) return null; // apiClient already cleared it
    return stored;
  }
});

/**
 * POST /guest/auth/logout ends every session of the number; storage is cleared
 * whatever the outcome (a 401 means it was already over).
 */
export const logout = createAsyncThunk("session/logout", async () => {
  try {
    await guestApi.logout();
  } catch {
    // already signed out or offline: clearing locally is still correct
  } finally {
    clearSession();
  }
});
