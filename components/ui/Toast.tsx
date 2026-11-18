// components/ui/Toast.tsx - renders services/toast.ts. Top-centre on phones (clear
// of the bottom action bars), bottom-right on wider screens.
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { toast, type ToastItem, type ToastType } from "@/services/toast";
import { cn } from "@/lib/utils";

const ICON: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-success" aria-hidden />,
  error: <XCircle size={18} className="text-danger" aria-hidden />,
  info: <Info size={18} className="text-brand" aria-hidden />,
};

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => toast.subscribe(setToasts), []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-[100] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:items-end"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex w-full max-w-[400px] animate-sheet-up items-start gap-2.5 rounded-[16px] border border-line bg-white p-3.5",
            "shadow-[0_16px_40px_-16px_rgba(20,20,43,0.35)]",
          )}
        >
          <span className="mt-0.5 shrink-0">{ICON[t.type]}</span>
          <p className="flex-1 text-[15px] leading-snug font-medium text-ink">{t.message}</p>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-mist hover:text-ink"
            aria-label="Dismiss"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
