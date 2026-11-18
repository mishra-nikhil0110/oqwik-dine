// lib/utils.ts - tiny shared helpers.

/** Joins truthy class names. */
export function cn(...classes: Array<string | number | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** JSON.stringify with object keys sorted, so equal values always produce equal strings. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
  return `{${entries.join(",")}}`;
}

/** Byte length of a string as UTF-8 (the server's customisation limit is in bytes). */
export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}
