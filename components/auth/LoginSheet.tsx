// components/auth/LoginSheet.tsx - the re-login dialog (guide §3: any 401 on a
// signed-in call means the session is over; show the login, then retry).
//
// Mounted once in the root layout and opened through services/loginGate.ts.
// Full screen on phones, a centred dialog from tablets up.
"use client";

import { useCallback, useEffect, useState } from "react";
import { finishLogin, subscribeLoginGate } from "@/services/loginGate";
import { cn } from "@/lib/utils";
import { LoginForm } from "./LoginForm";

export function LoginSheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => subscribeLoginGate(setOpen), []);
  if (!open) return null;
  return <LoginDialog />;
}

function LoginDialog() {
  const close = useCallback(() => finishLogin(false), []);

  // While open: no background scroll, Escape closes.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center md:items-center md:p-6" role="presentation">
      {/* Backdrop (tablet / desktop only; on phones the sheet covers the screen) */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 hidden animate-fade-in bg-ink/50 md:block"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className={cn(
          "relative flex w-full animate-sheet-up flex-col overflow-y-auto bg-white px-5",
          "md:max-h-[min(900px,92dvh)] md:max-w-[480px] md:rounded-[28px] md:px-8 md:shadow-[0_32px_80px_-24px_rgba(20,20,43,0.45)]",
        )}
      >
        <LoginForm mode="sheet" onSuccess={() => finishLogin(true)} onClose={close} />
      </div>
    </div>
  );
}
