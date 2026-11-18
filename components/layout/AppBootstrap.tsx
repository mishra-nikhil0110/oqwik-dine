
"use client";

import { useEffect } from "react";
import { SESSION_EXPIRY_SKEW_MS } from "@/services/config";
import { clearSession } from "@/services/session";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { checkSession } from "@/store/thunks/sessionThunks";

export function AppBootstrap() {
  const dispatch = useAppDispatch();
  const expiresAt = useAppSelector((s) => s.session.expiresAt);

  useEffect(() => {
    void dispatch(checkSession());
  }, [dispatch]);

  useEffect(() => {
    if (!expiresAt) return;
    const msLeft = Date.parse(expiresAt) - SESSION_EXPIRY_SKEW_MS - Date.now();
    const id = setTimeout(clearSession, Math.min(Math.max(msLeft, 0), 2_147_000_000));
    return () => clearTimeout(id);
  }, [expiresAt]);

  return null;
}
