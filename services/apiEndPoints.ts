// services/apiEndPoints.ts - every guest URL in one place.
// Source of truth: oquick-console `src/api/guest/routes/guest.js`.
// Path params are URL-encoded so a malformed slug or token can never change the route.

const enc = encodeURIComponent;

export const API_ENDPOINTS = {
  /* ---- public ---- */
  TABLE_MENU: (qrSlug: string) => `/guest/tables/${enc(qrSlug)}`,
  SEND_OTP: "/guest/auth/otp",
  VERIFY_OTP: "/guest/auth/verify",
  BILL: (token: string) => `/guest/bills/${enc(token)}`,
  BILL_PDF: (token: string) => `/guest/bills/${enc(token)}/pdf`,

  /* ---- signed in (Authorization: Bearer <guest token>) ---- */
  ME: "/guest/me",
  LOGOUT: "/guest/auth/logout",
  /** The customer's own order history (newest first, paged); ?qr_slug= limits it to that restaurant. */
  MY_ORDERS: "/guest/orders",
  /** One of the customer's own orders (404 for anyone else's). */
  MY_ORDER: (orderId: string) => `/guest/orders/${enc(orderId)}`,
  CHECKOUT: (qrSlug: string) => `/guest/tables/${enc(qrSlug)}/checkout`,
  PAYMENT: (paymentId: string) => `/guest/payments/${enc(paymentId)}`,
  VERIFY_PAYMENT: (paymentId: string) => `/guest/payments/${enc(paymentId)}/verify`,
} as const;
