// services/apiClient.ts - the one place HTTP happens (guide §9).
//
//  - Signed-in calls send `Authorization: Bearer <token>`. If the stored session
//    is missing or about to expire, the call fails fast with LoginRequiredError
//    instead of hitting the network.
//  - Any 401 on a signed-in call means the session is over: the token is cleared
//    and LoginRequiredError is thrown so the caller can show the login sheet and
//    retry (see services/loginGate.ts withLogin).
//  - Every other failure becomes an ApiError carrying the server's message, which
//    is safe to show to customers (docs/API.md §14), plus `retryAfter` for 429s.

import axios, { AxiosError, type Method } from "axios";
import type { ApiErrorBody } from "@/types/api";
import { API_BASE_URL } from "./config";
import { clearSession, getSession } from "./session";

export class ApiError extends Error {
  readonly status: number;
  readonly details: Record<string, unknown>;
  /** Seconds to wait before retrying (429 only), from details.retry_after or Retry-After. */
  readonly retryAfter: number | null;

  constructor(status: number, message: string, details: Record<string, unknown> = {}, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

/** The session is over (or never started): show the login sheet, then retry. */
export class LoginRequiredError extends Error {
  constructor(message = "Verify your phone number to continue") {
    super(message);
    this.name = "LoginRequiredError";
  }
}

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
  timeout: 30_000,
});

// TEMPORARY (ngrok tunnel testing) - REMOVE BEFORE PRODUCTION.
// A free ngrok tunnel answers browser requests with an HTML warning page instead
// of the API response, which shows up as a CORS error. This header skips that
// page. The backend allows it (oquick-console config/middlewares.js cors headers).
http.defaults.headers.common["ngrok-skip-browser-warning"] = "true";

function parseRetryAfter(body: ApiErrorBody | undefined, header: unknown): number | null {
  const value = Number(body?.details?.retry_after ?? header);
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : null;
}

function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError(0, error instanceof Error ? error.message : GENERIC_MESSAGE);
  }
  const axiosError = error as AxiosError<{ error?: ApiErrorBody }>;
  if (!axiosError.response) return new ApiError(0, NETWORK_MESSAGE);

  const { status, data, headers } = axiosError.response;
  const body = data?.error;
  return new ApiError(
    status,
    body?.message || (status >= 500 ? "The server ran into a problem. Please try again." : GENERIC_MESSAGE),
    body?.details ?? {},
    status === 429 ? parseRetryAfter(body, headers?.["retry-after"]) : null,
  );
}

interface RequestOptions {
  method?: Method;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

export async function api<T>(path: string, { method = "GET", body, auth = true, signal }: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, "NEXT_PUBLIC_API_URL is not set. Add it to .env.local and restart the app.");
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const session = getSession();
    if (!session) {
      clearSession();
      throw new LoginRequiredError();
    }
    headers.Authorization = `Bearer ${session.token}`;
  }

  try {
    const response = await http.request<T>({ url: path, method, data: body, headers, signal });
    return (response.status === 204 ? null : response.data) as T;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    const apiError = toApiError(error);
    if (auth && apiError.status === 401) {
      clearSession();
      throw new LoginRequiredError(apiError.message);
    }
    throw apiError;
  }
}

export function isAbortError(error: unknown): boolean {
  return axios.isCancel(error);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof LoginRequiredError) return error.message;
  return GENERIC_MESSAGE;
}
