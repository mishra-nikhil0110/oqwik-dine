// types/api.ts - shapes returned by the guest endpoints of the OQwik API.
// Source of truth: oquick-console `src/api/guest/controllers/guest.js` and
// `docs/API.md` §12. Money fields can arrive as strings or numbers
// (docs/API.md §1), so they are typed `Money` and always parsed with Number().

export type Money = string | number;

/** Strapi upload as populated by the guest menu endpoint (url, alternativeText, formats). */
export interface MediaFormat {
  url: string;
  width?: number;
  height?: number;
}

export interface Media {
  url: string;
  alternativeText?: string | null;
  formats?: Partial<Record<"thumbnail" | "small" | "medium" | "large", MediaFormat>> | null;
}

/** Address JSON stored on the restaurant (only rendered when the API includes it). */
export interface RestaurantAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface Restaurant {
  documentId: string;
  name: string;
  slug: string;
  description: string | null;
  currency: string;
  tax_percent: number;
  service_charge_percent: number;
  primary_color: string | null;
  accepts_orders: boolean;
  /**
   * Not sent by the guest endpoint today. Typed as optional so the welcome and
   * menu headers light up automatically if the backend starts including them.
   */
  logo?: Media | null;
  address?: RestaurantAddress | null;
}

export interface DiningTable {
  documentId: string;
  table_number: number;
  label: string | null;
}

export interface MenuItem {
  documentId: string;
  name: string;
  description: string | null;
  price: Money;
  is_veg: boolean;
  is_available?: boolean;
  display_order?: number;
  /** Free-form JSON entered by the restaurant, e.g. [{ "name": "Spice", "options": ["Mild", "Hot"] }]. */
  customisations: unknown;
  /** Free-form JSON array of strings, e.g. ["Bestseller", "Spicy"]. */
  tags: unknown;
  image: Media | null;
}

export interface MenuCategory {
  documentId: string;
  name: string;
  name_hi: string | null;
  display_order?: number;
  image: Media | null;
  menu_items: MenuItem[];
}

/** GET /guest/tables/:qrSlug */
export interface TableMenu {
  restaurant: Restaurant;
  table: DiningTable;
  menu: MenuCategory[];
}

/* ---------------- auth ---------------- */

export interface GuestCustomer {
  documentId: string;
  phone: string;
  name: string | null;
}

/** POST /guest/auth/otp */
export interface OtpSent {
  expires_in: number;
  resend_in: number;
}

/** POST /guest/auth/verify */
export interface GuestSessionPayload {
  token: string;
  expires_at: string;
  expires_in: number;
  customer: GuestCustomer;
}

/** GET /guest/me */
export interface GuestMe {
  customer: GuestCustomer;
  expires_at: string;
}

/* ---------------- payments ---------------- */

export type PaymentStatus = "pending" | "paid" | "failed" | "expired";

export interface PaymentView {
  documentId: string;
  reference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  gateway: string;
  failure_reason: string | null;
  expires_at: string;
  paid_at: string | null;
  order: { documentId: string; order_number: number; status: OrderStatus } | null;
  bill: { bill_number: string; token: string } | null;
}

export interface RazorpayCheckout {
  provider: "razorpay";
  key_id: string;
  order_id: string;
  /** In paise. */
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { contact?: string; name?: string };
}

export interface PhonePeCheckout {
  provider: "phonepe";
  redirect_url: string;
}

/** Switch on `provider`; the restaurant chooses the gateway in its settings. */
export type CheckoutData = RazorpayCheckout | PhonePeCheckout | { provider: string; [key: string]: unknown };

/** POST /guest/tables/:qrSlug/checkout */
export interface CheckoutResult {
  payment: PaymentView;
  checkout: CheckoutData;
}

export interface CheckoutLine {
  menu_item: string;
  quantity: number;
  customisations?: Customisations;
}

export interface CheckoutRequest {
  items: CheckoutLine[];
  special_instructions?: string;
}

/* ---------------- orders ---------------- */

export type OrderStatus = "placed" | "accepted" | "preparing" | "ready" | "served" | "cancelled";

/** The customer's choices for one cart line, e.g. { "Spice": "Hot", "Add-ons": ["Cheese"] }. */
export type Customisations = Record<string, string | string[]>;

export interface GuestOrderItem {
  documentId: string;
  name_snapshot: string;
  quantity: number;
  unit_price: Money;
  item_total: Money;
  customisations: unknown;
}

export type PaymentMethod = "cash" | "upi" | "card" | "online";

/**
 * One of the signed-in customer's orders: GET /guest/orders (history) and
 * GET /guest/orders/:id (tracking). Only ever the caller's own orders.
 */
export interface GuestOrder {
  documentId: string;
  order_number: number;
  status: OrderStatus;
  payment_status: "paid" | "unpaid";
  payment_method: PaymentMethod | null;
  subtotal: Money;
  service_charge_amount: Money;
  tax_amount: Money;
  total_amount: Money;
  special_instructions: string | null;
  createdAt: string;
  is_mine: boolean;
  restaurant: { name: string; slug: string } | null;
  table: { table_number: number; label: string | null } | null;
  /** Opens /bill/<token>. Null until the bill is issued (or if the API hides the token). */
  bill: { bill_number: string; token: string | null } | null;
  order_items: GuestOrderItem[];
}

/** Strapi-style paging block of list responses. */
export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

/** GET /guest/orders */
export interface GuestOrderPage {
  data: GuestOrder[];
  meta: { pagination: Pagination };
}

/* ---------------- bill ---------------- */

export interface BillItem {
  name: string;
  quantity: number;
  unit_price: number;
  item_total: number;
  customisations: unknown;
}

/** GET /guest/bills/:token - the frozen bill snapshot plus issued_at. */
export interface Bill {
  type: "bill";
  bill_number: string;
  order_number: number;
  placed_at: string;
  placed_at_local: string;
  status: OrderStatus;
  payment_status: "paid" | "unpaid";
  payment_method: PaymentMethod | null;
  currency: string;
  restaurant: {
    name: string;
    legal_name: string | null;
    gstin: string | null;
    address: RestaurantAddress | null;
    contact_phone: string | null;
  };
  table: { table_number: number; label: string | null } | null;
  customer: { name: string | null } | null;
  items: BillItem[];
  subtotal: number;
  service_charge_amount: number;
  tax_amount: number;
  total_amount: number;
  issued_at: string;
}

/** Strapi 5 error envelope (docs/API.md §14). */
export interface ApiErrorBody {
  status?: number;
  name?: string;
  message?: string;
  details?: Record<string, unknown>;
}
