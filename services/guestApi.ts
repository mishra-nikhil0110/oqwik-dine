// services/guestApi.ts - typed wrappers for every guest endpoint.
// All responses use the Strapi `{ data }` envelope; these helpers unwrap it.

import type {
  Bill,
  CheckoutRequest,
  CheckoutResult,
  GuestMe,
  GuestOrder,
  GuestOrderPage,
  GuestSessionPayload,
  OtpSent,
  PaymentView,
  TableMenu,
} from "@/types/api";
import { api } from "./apiClient";
import { API_BASE_URL } from "./config";
import { API_ENDPOINTS } from "./apiEndPoints";

type Envelope<T> = { data: T };

export const guestApi = {
  /** Public: restaurant, table and orderable menu for a QR code. 404 = inactive QR. */
  async getTableMenu(qrSlug: string, signal?: AbortSignal): Promise<TableMenu> {
    const res = await api<Envelope<TableMenu>>(API_ENDPOINTS.TABLE_MENU(qrSlug), { auth: false, signal });
    return res.data;
  },

  /** Public: sends a 6-digit code to the number (WhatsApp; backend log in development). */
  async sendOtp(phone: string): Promise<OtpSent> {
    const res = await api<Envelope<OtpSent>>(API_ENDPOINTS.SEND_OTP, { method: "POST", body: { phone }, auth: false });
    return res.data;
  },

  /** Public: exchanges the code for a 45-minute session token. */
  async verifyOtp(phone: string, code: string, name?: string): Promise<GuestSessionPayload> {
    const body: Record<string, string> = { phone, code };
    if (name && name.trim()) body.name = name.trim();
    const res = await api<Envelope<GuestSessionPayload>>(API_ENDPOINTS.VERIFY_OTP, { method: "POST", body, auth: false });
    return res.data;
  },

  /** Signed in: 200 while the session is alive, 401 (LoginRequiredError) otherwise. */
  async me(): Promise<GuestMe> {
    const res = await api<Envelope<GuestMe>>(API_ENDPOINTS.ME);
    return res.data;
  },

  /** Signed in: ends every session of this number. Responds 204. */
  async logout(): Promise<void> {
    await api<null>(API_ENDPOINTS.LOGOUT, { method: "POST" });
  },

  /**
   * Signed in: the customer's own orders, newest first. `qrSlug` limits them to
   * that table's restaurant. Pages hold up to 50 orders.
   */
  async getMyOrders(
    { qrSlug, page = 1, pageSize = 20 }: { qrSlug?: string; page?: number; pageSize?: number },
    signal?: AbortSignal,
  ): Promise<GuestOrderPage> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (qrSlug) params.set("qr_slug", qrSlug);
    const res = await api<GuestOrderPage>(`${API_ENDPOINTS.MY_ORDERS}?${params.toString()}`, { signal });
    const data = Array.isArray(res?.data) ? res.data : [];
    const pagination = res?.meta?.pagination ?? { page, pageSize, pageCount: data.length ? 1 : 0, total: data.length };
    return { data, meta: { pagination } };
  },

  /** Signed in: one of the customer's own orders, for live tracking after payment. */
  async getMyOrder(orderId: string, signal?: AbortSignal): Promise<GuestOrder> {
    const res = await api<Envelope<GuestOrder>>(API_ENDPOINTS.MY_ORDER(orderId), { signal });
    return res.data;
  },

  /** Signed in: prices the cart on the server and starts an online payment (no order yet). */
  async checkout(qrSlug: string, request: CheckoutRequest): Promise<CheckoutResult> {
    const res = await api<Envelope<CheckoutResult>>(API_ENDPOINTS.CHECKOUT(qrSlug), { method: "POST", body: request });
    return res.data;
  },

  /** Signed in: current payment state; the server also asks the gateway while it is pending. */
  async getPayment(paymentId: string, signal?: AbortSignal): Promise<PaymentView> {
    const res = await api<Envelope<PaymentView>>(API_ENDPOINTS.PAYMENT(paymentId), { signal });
    return res.data;
  },

  /** Signed in: confirms a payment right after the gateway's checkout callback (Razorpay). */
  async verifyPayment(paymentId: string, gatewayResult: Record<string, unknown>): Promise<PaymentView> {
    const res = await api<Envelope<PaymentView>>(API_ENDPOINTS.VERIFY_PAYMENT(paymentId), {
      method: "POST",
      body: gatewayResult,
    });
    return res.data;
  },

  /** Public: the bill behind the WhatsApp link. */
  async getBill(token: string, signal?: AbortSignal): Promise<Bill> {
    const res = await api<Envelope<Bill>>(API_ENDPOINTS.BILL(token), { auth: false, signal });
    return res.data;
  },

  /** Public: absolute URL of the bill PDF, opened as a plain link. */
  billPdfUrl(token: string): string {
    return `${API_BASE_URL}${API_ENDPOINTS.BILL_PDF(token)}`;
  },
};
