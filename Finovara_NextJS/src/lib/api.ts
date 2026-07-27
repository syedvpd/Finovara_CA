/**
 * api.ts — single HTTP layer. Cookie-based auth, CSRF double-submit.
 * NEXT_PUBLIC_API_BASE_URL replaces VITE_API_BASE_URL.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const CSRF_COOKIE = "fv_csrf";
const CSRF_HEADER = "X-CSRF-Token";
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface PageMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  query?: Record<string, QueryValue>;
  form?: FormData;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = /^https?:\/\//.test(BASE_URL)
    ? BASE_URL
    : (typeof window !== "undefined" ? window.location.origin : "") + BASE_URL;
  const url = new URL(base + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;

  if (opts.form) {
    payload = opts.form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (UNSAFE.has(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers[CSRF_HEADER] = csrf;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method, headers, body: payload, credentials: "include", signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, "network_error", "Cannot reach the server. Check your connection.");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(res.status, err?.code ?? "http_error", err?.message ?? res.statusText ?? "Request failed", err?.details);
  }

  if (json && typeof json === "object" && "data" in json) {
    if ("meta" in json) return { data: json.data, meta: json.meta } as T;
    return json.data as T;
  }
  return json as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, undefined, opts),
};
