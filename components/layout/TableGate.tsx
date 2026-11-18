// components/layout/TableGate.tsx - wraps every /t/[qrSlug] page (the QR entry).
//
//  1. Loads the table (restaurant + menu); an inactive QR (404) or a load error
//     is shown before anything else, so nobody is asked to log in for nothing.
//  2. Decides once, on arrival: a live session goes straight to the page (menu),
//     no session shows the OTP login (design screens 2-3) in place.
//  3. A session that ends later in the visit does not bounce the customer back
//     here; the next signed-in call opens the re-login sheet instead (guide §3).
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QrCode, RefreshCw, WifiOff } from "lucide-react";
import { useTableLoader } from "@/hooks/useTableLoader";
import { useTableSlug } from "@/hooks/useTableSlug";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadTable } from "@/store/thunks/tableThunks";
import { Button } from "@/components/ui/Button";
import { PoweredBy } from "@/components/ui/Brand";
import { Screen, Skeleton, StateMessage } from "@/components/ui/Layout";
import { LoginForm } from "@/components/auth/LoginForm";

export function TableGate({ children }: { children: ReactNode }) {
  const qrSlug = useTableSlug();
  const dispatch = useAppDispatch();
  const { qrSlug: loadedSlug, data, status, error } = useAppSelector((s) => s.table);
  const sessionStatus = useAppSelector((s) => s.session.status);
  useTableLoader(qrSlug);

  /** null until the stored session has been checked; then fixed for this visit. */
  const [loginRequired, setLoginRequired] = useState<boolean | null>(null);
  useEffect(() => {
    if (sessionStatus === "signedIn") setLoginRequired(false);
    else if (sessionStatus === "signedOut") setLoginRequired((current) => current ?? true);
  }, [sessionStatus]);

  if (status === "error" && error && loadedSlug === qrSlug) {
    if (error.status === 404) {
      return (
        <Screen className="justify-center">
          <StateMessage icon={<QrCode size={30} aria-hidden />} title="This QR code isn't active" tone="warning">
            Please ask the staff for help, or scan the QR code on your table again.
          </StateMessage>
          <PoweredBy />
        </Screen>
      );
    }
    const offline = error.status === 0;
    return (
      <Screen className="justify-center">
        <StateMessage
          icon={offline ? <WifiOff size={30} aria-hidden /> : <RefreshCw size={30} aria-hidden />}
          title={offline ? "You're offline" : "Couldn't load the menu"}
          tone="danger"
          actions={
            <Button onClick={() => void dispatch(loadTable({ qrSlug }))} fullWidth>
              Try again
            </Button>
          }
        >
          {error.retryAfter ? `Too many requests. Please wait ${error.retryAfter}s and try again.` : error.message}
        </StateMessage>
        <PoweredBy />
      </Screen>
    );
  }

  if (!data || loadedSlug !== qrSlug || loginRequired === null) return <TableSkeleton />;

  if (loginRequired) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 md:px-6">
        {/* The session slice flips to signedIn on success, which lets the page through. */}
        <LoginForm mode="page" onSuccess={() => setLoginRequired(false)} />
      </main>
    );
  }

  return <>{children}</>;
}

/** Menu-shaped placeholder while the table loads. */
function TableSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pt-6 md:px-6" aria-busy="true" aria-label="Loading the menu">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-[12px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-14 rounded-[18px]" />
      <div className="mt-8 flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="size-[68px] shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="size-28 rounded-[18px]" />
          </div>
        ))}
      </div>
    </main>
  );
}
