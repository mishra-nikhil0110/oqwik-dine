// services/config.ts - environment configuration and storage keys.
// The guest app always talks to the real backend; there is no demo mode.

/** e.g. http://localhost:1337/api (trailing slash removed). */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/**
 * Origin of the API (scheme + host + port), used to prefix relative upload URLs
 * served by the local upload provider (docs/API.md §9).
 */
export const API_ORIGIN = (() => {
  try {
    return API_BASE_URL ? new URL(API_BASE_URL).origin : "";
  } catch {
    return "";
  }
})();

export const TERMS_URL = process.env.NEXT_PUBLIC_TERMS_URL ?? "";
export const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL ?? "";

/** Brand indigo, used whenever the restaurant has no usable primary_color. */
export const DEFAULT_BRAND_COLOR = "#3A36E0";

/** The only country code login codes are sent to by default (OTP_ALLOWED_COUNTRIES=IN). */
export const PHONE_COUNTRY_CODE = "+91";

/* ---- storage keys (all namespaced so they never clash with the dashboard on the same origin) ---- */

/** localStorage: { token, expires_at, customer } */
export const SESSION_STORAGE_KEY = "oqwik-dine.session";
/** localStorage: one cart per table */
export const cartStorageKey = (qrSlug: string) => `oqwik-dine.cart.${qrSlug}`;
/** sessionStorage: the table the customer is ordering at, so return pages can link back */
export const CURRENT_TABLE_KEY = "oqwik-dine.qrSlug";
/** sessionStorage: the payment started from this tab */
export const PENDING_PAYMENT_KEY = "oqwik-dine.pendingPayment";

/* ---- timings from the integration guide ---- */

/** Treat the session as expired this long before `expires_at` (guide §3). */
export const SESSION_EXPIRY_SKEW_MS = 30_000;
/** Payment status polling: every 2-3 s for about 2 minutes (guide §6.3). */
export const PAYMENT_POLL_INTERVAL_MS = 2_500;
export const PAYMENT_POLL_WINDOW_MS = 120_000;
/** Order tracking polling while the page is visible (guide §7). */
export const ORDERS_POLL_INTERVAL_MS = 10_000;
/** Refresh the menu when the customer comes back to the tab, at most this often. */
export const MENU_REFRESH_MIN_INTERVAL_MS = 60_000;
/** Carts older than this are dropped (a new visit starts clean). */
export const CART_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/* ---- server-side limits mirrored on the client (guide §5) ---- */

export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 50;
export const MAX_NOTE_LENGTH = 500;
export const MAX_CUSTOMISATIONS_BYTES = 2000;
export const MAX_NAME_LENGTH = 80;
