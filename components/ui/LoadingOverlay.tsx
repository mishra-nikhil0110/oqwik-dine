// components/ui/LoadingOverlay.tsx - full-screen "please wait" layer for actions
// that must not be tapped twice (verifying the code, starting a payment) and for
// page changes. A translucent, lightly blurred white veil over the screen with a
// spinner in the restaurant's colour (--color-brand, see lib/theme.ts).
//
// By default it fades in after a short delay, so quick actions finish without a
// flash; taps are blocked from the first frame either way.

import { Spinner } from "./Spinner";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  /** Read by screen readers and shown under the spinner. */
  label?: string;
  /** Show at once instead of after the anti-flash delay. */
  immediate?: boolean;
  className?: string;
}

export function LoadingOverlay({ label = "Loading", immediate = false, className }: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // Above sheets (z-50) and the bottom bar (z-30), below toasts (z-100).
        "fixed inset-0 z-[60] flex items-center justify-center bg-white/60 backdrop-blur-[3px] [-webkit-backdrop-filter:blur(3px)]",
        immediate ? "motion-safe:animate-fade-in" : "animate-overlay-in",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-white shadow-[0_12px_40px_-8px_color-mix(in_srgb,var(--color-brand)_35%,transparent)]">
          <Spinner size={38} className="text-brand" />
        </span>
        <span className="rounded-full bg-white/80 px-3 py-1 text-[15px] font-semibold text-ink-2">{label}</span>
      </div>
    </div>
  );
}
