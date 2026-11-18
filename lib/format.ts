// lib/format.ts - money, phone, table and address formatting.
// Money can arrive as a string ("280.00") or a number (docs/API.md §1): always
// go through toNumber() once and never do arithmetic on the raw value.

import type { DiningTable, Money, RestaurantAddress } from "@/types/api";

export function toNumber(value: Money | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Rounds to 2 decimals (paise) without float drift - same rule as the server's round2. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function currencyFormatter(currency: string, fractionDigits: number): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  } catch {
    // Unknown ISO code: fall back to plain grouping; callers prefix the code.
    return new Intl.NumberFormat("en-IN", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  }
}

/** Menu-style price: "₹289", or "₹289.50" when there are paise. */
export function fmtPrice(value: Money, currency = "INR"): string {
  const amount = round2(toNumber(value));
  return currencyFormatter(currency, Number.isInteger(amount) ? 0 : 2).format(amount);
}

/** Bill-style amount, always with 2 decimals: "₹756.00". */
export function fmtAmount(value: Money, currency = "INR"): string {
  return currencyFormatter(currency, 2).format(round2(toNumber(value)));
}

/** Bill page amount labelled with the currency code (guide §8): "INR 630.00". */
export function fmtCodeAmount(value: Money, currency = "INR"): string {
  const number = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    round2(toNumber(value)),
  );
  return `${currency || "INR"} ${number}`;
}

/** "Table 12", or the restaurant's own label when it is more than "T12". */
export function tableName(table: Pick<DiningTable, "table_number" | "label"> | null | undefined): string {
  if (!table) return "";
  const label = table.label?.trim();
  if (label && label.toUpperCase() !== `T${table.table_number}`) return label;
  return `Table ${table.table_number}`;
}

/** Up to two initials for the logo tile: "Saffron Table" -> "ST". */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word)[0] ?? "")
    .slice(0, 2)
    .join("");
  return (letters || "?").toUpperCase();
}

/** "+919876543210" -> "+91 98765 43210"; other formats are returned unchanged. */
export function fmtPhone(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}

/** Local digits typed by the customer -> "98765 43210" (display only). */
export function groupLocalDigits(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

/** "Sector 18, Noida" style short line (city level) for headers. */
export function shortAddress(address: RestaurantAddress | null | undefined): string {
  if (!address || typeof address !== "object") return "";
  return [address.line2 || address.line1, address.city].filter(Boolean).join(", ");
}

/** Full postal address as lines for the bill. */
export function addressLines(address: RestaurantAddress | null | undefined): string[] {
  if (!address || typeof address !== "object") return [];
  const cityLine = [address.city, address.state, address.postal_code].filter(Boolean).join(", ");
  return [address.line1, address.line2, cityLine].filter((line): line is string => Boolean(line && line.trim()));
}

/** "4:32" from seconds. */
export function fmtCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** "1:05 pm" in the device's timezone (the restaurant's own zone is not exposed to guests). */
export function fmtTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
}

/** "18 Nov 2026, 1:05 pm" */
export function fmtDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
