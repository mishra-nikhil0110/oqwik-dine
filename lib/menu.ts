// lib/menu.ts - reading the free-form parts of the menu safely.
//
// `customisations` and `tags` are JSON the restaurant typed in the dashboard, so
// nothing about their shape is guaranteed. Everything here is defensive: unknown
// shapes are ignored rather than crashing the menu.

import type { Customisations, Media, MenuCategory, MenuItem } from "@/types/api";
import { API_ORIGIN } from "@/services/config";
import { toNumber } from "./format";

/* ---------------- images ---------------- */

/** Upload URL as-is when absolute (S3/CDN), prefixed with the API origin when relative (local provider). */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

type ImageSize = "thumb" | "hero";

/**
 * Picks the smallest generated format that is still sharp at 3x:
 * thumbnails (112 px / 68 px) want ~340 px -> "small" (500 px);
 * the 390 px wide hero wants ~1200 px -> "large", then "medium".
 */
export function pickImage(media: Media | null | undefined, size: ImageSize): string | null {
  if (!media) return null;
  const formats = media.formats ?? {};
  const order = size === "thumb" ? (["small", "medium", "large"] as const) : (["large", "medium", "small"] as const);
  for (const key of order) {
    const url = formats[key]?.url;
    if (url) return mediaUrl(url);
  }
  return mediaUrl(media.url);
}

/* ---------------- tags ---------------- */

/** Clean list of tag strings (max 24 chars each, no duplicates). */
export function readTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    const clean = tag.trim().slice(0, 24);
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }
  return result;
}

export function isBestsellerTag(tag: string): boolean {
  return /^best\s*-?\s*sell(er|ing)s?$/i.test(tag.trim());
}

export function isBestseller(item: MenuItem): boolean {
  return readTags(item.tags).some(isBestsellerTag);
}

/* ---------------- customisations ---------------- */

export interface CustomisationGroup {
  name: string;
  options: string[];
  required: boolean;
  /** Several options can be picked (add-ons). Sent as a string array. */
  multiple: boolean;
}

function optionLabel(option: unknown): string | null {
  if (typeof option === "string" || typeof option === "number") return String(option).trim() || null;
  if (option && typeof option === "object") {
    const record = option as Record<string, unknown>;
    const label = record.name ?? record.label ?? record.value ?? record.title;
    if (typeof label === "string" || typeof label === "number") return String(label).trim() || null;
  }
  return null;
}

function toGroup(name: unknown, rawOptions: unknown, flags: Record<string, unknown> = {}): CustomisationGroup | null {
  if (typeof name !== "string" || !name.trim() || !Array.isArray(rawOptions)) return null;
  const options = Array.from(new Set(rawOptions.map(optionLabel).filter((o): o is string => Boolean(o))));
  if (options.length === 0) return null;

  const type = typeof flags.type === "string" ? flags.type.toLowerCase() : "";
  const multiple =
    flags.multiple === true || flags.multi === true || type === "multiple" || type === "multi" || type === "checkbox";
  // For a multi-select group "required" means at least one option must be picked.
  const required = flags.required === true || (typeof flags.min === "number" && flags.min >= 1);
  return { name: name.trim().slice(0, 60), options, required, multiple };
}

/**
 * Normalises the restaurant's customisation JSON into groups. Supported shapes:
 *   [{ "name": "Spice", "options": ["Mild", "Hot"], "required": true }]
 *   [{ "title": "Add-ons", "choices": [{ "label": "Cheese" }], "multiple": true }]
 *   { "Spice": ["Mild", "Hot"] }
 */
export function readCustomisations(value: unknown): CustomisationGroup[] {
  const groups: CustomisationGroup[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const group = toGroup(
        record.name ?? record.title ?? record.label,
        record.options ?? record.choices ?? record.values,
        record,
      );
      if (group) groups.push(group);
    }
  } else if (value && typeof value === "object") {
    for (const [name, options] of Object.entries(value as Record<string, unknown>)) {
      const group = toGroup(name, options);
      if (group) groups.push(group);
    }
  }
  // Group names are the keys of the customer's choices, so they must be unique.
  const seen = new Set<string>();
  return groups.filter((group) => !seen.has(group.name) && seen.add(group.name));
}

/** Short display line for a line's choices: "Full · Medium · Mint chutney". */
export function describeChoices(choices: unknown): string {
  if (!choices || typeof choices !== "object" || Array.isArray(choices)) return "";
  return Object.values(choices as Record<string, unknown>)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
    .map(String)
    .join(" · ");
}

/** Removes choices that no longer match the dish's current groups/options. */
export function sanitizeChoices(choices: Customisations | undefined, groups: CustomisationGroup[]): Customisations {
  const result: Customisations = {};
  if (!choices) return result;
  for (const group of groups) {
    const value = choices[group.name];
    if (group.multiple) {
      const picked = (Array.isArray(value) ? value : typeof value === "string" ? [value] : []).filter((v) =>
        group.options.includes(v),
      );
      if (picked.length) result[group.name] = group.options.filter((o) => picked.includes(o));
    } else if (typeof value === "string" && group.options.includes(value)) {
      result[group.name] = value;
    }
  }
  return result;
}

/** Names of required groups without a choice. */
export function missingRequired(choices: Customisations, groups: CustomisationGroup[]): string[] {
  return groups.filter((g) => g.required && !choices[g.name]).map((g) => g.name);
}

/* ---------------- lookups ---------------- */

export interface IndexedDish {
  item: MenuItem;
  categoryId: string;
  price: number;
}

/** documentId -> dish (first occurrence wins). Used by the cart to read live prices/availability. */
export function indexMenu(menu: MenuCategory[]): Map<string, IndexedDish> {
  const index = new Map<string, IndexedDish>();
  for (const category of menu) {
    for (const item of category.menu_items ?? []) {
      if (!index.has(item.documentId)) {
        index.set(item.documentId, { item, categoryId: category.documentId, price: toNumber(item.price) });
      }
    }
  }
  return index;
}

/** Case-insensitive match on name and description. */
export function matchesSearch(item: MenuItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.name.toLowerCase().includes(q) || (item.description ?? "").toLowerCase().includes(q);
}
