// services/storage.ts - crash-proof wrappers around localStorage / sessionStorage.
// Storage can be unavailable (SSR, private mode, blocked site data, quota), so
// every access is guarded and a failure degrades to "nothing stored".

type Area = "local" | "session";

function area(which: Area): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return which === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(which: Area, key: string): T | null {
  try {
    const raw = area(which)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(which: Area, key: string, value: unknown): void {
  try {
    area(which)?.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded / storage blocked: the app keeps working from memory
  }
}

export function readString(which: Area, key: string): string | null {
  try {
    return area(which)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeString(which: Area, key: string, value: string): void {
  try {
    area(which)?.setItem(key, value);
  } catch {
    // ignore - see writeJson
  }
}

export function removeKey(which: Area, key: string): void {
  try {
    area(which)?.removeItem(key);
  } catch {
    // ignore - see writeJson
  }
}
