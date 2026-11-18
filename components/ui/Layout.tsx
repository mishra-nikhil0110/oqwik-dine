// components/ui/Layout.tsx - page scaffolding shared by every screen.
//
// Mobile first (design is 390 px wide). On tablets and desktops, single-task
// screens (login, cart, checkout, payment, bill) stay a centred 560 px column;
// the menu screens use a wider grid (see components/menu).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centred single-column page. `bottomBar` reserves room for a fixed BottomBar. */
export function Screen({
  children,
  className,
  bottomBar = false,
}: {
  children: ReactNode;
  className?: string;
  bottomBar?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 md:px-6",
        bottomBar ? "pb-36" : "pb-6",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** Header row: back button, title (+ subtitle), optional right slot. */
export function ScreenHeader({
  back,
  title,
  subtitle,
  right,
  className,
}: {
  back?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-h-[76px] items-center gap-4 pt-[max(16px,env(safe-area-inset-top))] pb-3", className)}>
      {back}
      {(title || subtitle) && (
        <div className="min-w-0 flex-1">
          {title && <h1 className="truncate text-[24px] leading-tight font-bold tracking-[-0.01em]">{title}</h1>}
          {subtitle && <p className="truncate text-[16px] text-ink-2">{subtitle}</p>}
        </div>
      )}
      {!title && !subtitle && <div className="flex-1" />}
      {right}
    </header>
  );
}

/**
 * Fixed action bar at the bottom of the screen (Checkout, Pay, Add item). The
 * inner width follows the page column; `wide` matches the menu screens.
 */
export function BottomBar({
  children,
  className,
  bordered = true,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 pb-safe",
        bordered ? "border-t border-line bg-white/95 backdrop-blur-md" : "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto w-full px-5 pt-4 md:px-6",
          wide ? "max-w-6xl" : "max-w-[560px]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** "To pay ₹714" block on the left of the cart / checkout bottom bars. */
export function ToPay({ amount, label = "To pay" }: { amount: string; label?: string }) {
  return (
    <div className="shrink-0">
      <p className="text-[16px] leading-tight text-ink-2">{label}</p>
      <p className="text-[24px] leading-tight font-bold tabular-nums">{amount}</p>
    </div>
  );
}

/** Centred icon + title + text + actions: empty, error and info states. */
export function StateMessage({
  icon,
  title,
  children,
  actions,
  className,
  tone = "neutral",
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  tone?: "neutral" | "warning" | "danger";
}) {
  const tile =
    tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-marigold-soft text-marigold-ink" : "bg-mist text-ink-2";
  return (
    <div className={cn("flex flex-col items-center px-2 py-12 text-center", className)}>
      {icon && <div className={cn("mb-5 flex size-16 items-center justify-center rounded-[20px]", tile)}>{icon}</div>}
      <h2 className="text-section">{title}</h2>
      {children && <div className="mt-2 max-w-[360px] text-body text-ink-2">{children}</div>}
      {actions && <div className="mt-6 flex w-full max-w-[360px] flex-col gap-3">{actions}</div>}
    </div>
  );
}

/** Grey shimmering block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[12px] bg-mist", className)} aria-hidden />;
}
