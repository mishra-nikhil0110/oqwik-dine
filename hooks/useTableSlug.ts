// hooks/useTableSlug.ts - the qrSlug of the current /t/[qrSlug] route, and the
// table remembered for this tab (so pages outside /t/ can link back).
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CURRENT_TABLE_KEY } from "@/services/config";
import { readString } from "@/services/storage";

/** The decoded qrSlug from the URL (empty string when absent). */
export function useTableSlug(): string {
  const params = useParams<{ qrSlug?: string | string[] }>();
  const raw = Array.isArray(params?.qrSlug) ? params.qrSlug[0] : params?.qrSlug;
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** The table remembered in sessionStorage (read after mount; null until then / when none). */
export function useRememberedTable(): string | null {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    setSlug(readString("session", CURRENT_TABLE_KEY));
  }, []);
  return slug;
}

/** Path helpers so every link to a table page is built the same way. */
export const tablePath = (qrSlug: string, sub = "") => `/t/${encodeURIComponent(qrSlug)}${sub}`;
