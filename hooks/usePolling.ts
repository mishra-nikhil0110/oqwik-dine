// hooks/usePolling.ts - Page Visibility-aware polling (same contract as oqwik-admin).
// Runs `callback` every `intervalMs` while enabled and the tab is visible; pauses
// when the tab is hidden and runs once immediately when it becomes visible again.
"use client";

import { useEffect, useRef } from "react";

export function usePolling(callback: () => void, intervalMs: number, enabled = true): void {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => savedCallback.current();
    let id: ReturnType<typeof setInterval> | null = document.hidden ? null : setInterval(tick, intervalMs);

    function onVisibilityChange() {
      if (document.hidden) {
        if (id) clearInterval(id);
        id = null;
      } else if (!id) {
        tick();
        id = setInterval(tick, intervalMs);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
