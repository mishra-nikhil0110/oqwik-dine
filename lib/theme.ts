// lib/theme.ts - restaurant theming (guide §4: "use primary_color").
//
// The restaurant's primary colour replaces the brand indigo ("--color-brand").
// White text sits on it (buttons, cart bar, hero), so a colour too light for
// white text is rejected and the default indigo is kept instead.

import { DEFAULT_BRAND_COLOR } from "@/services/config";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function expand(hex: string): string {
  return hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Contrast ratio of white text on the colour. */
function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/** The usable brand colour for a restaurant: its own when valid and readable, else indigo. */
export function resolveBrandColor(primaryColor: string | null | undefined): string {
  const value = primaryColor?.trim() ?? "";
  if (!HEX.test(value)) return DEFAULT_BRAND_COLOR;
  const hex = expand(value).toLowerCase();
  // 3:1 is the WCAG minimum for large/bold text, which is what sits on brand surfaces.
  return contrastWithWhite(hex) >= 3 ? hex : DEFAULT_BRAND_COLOR;
}

/** Applies the brand colour to the document (CSS custom property + browser UI colour). */
export function applyBrandColor(color: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--color-brand", color);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = color;
}
