"use client";

import { useSyncExternalStore } from "react";
import { isLoginOpen, subscribeLoginGate } from "@/services/loginGate";

const subscribe = (onChange: () => void) => subscribeLoginGate(() => onChange());

export function useLoginOpen(): boolean {
  return useSyncExternalStore(subscribe, isLoginOpen, () => false);
}
