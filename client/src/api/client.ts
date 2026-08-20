import { CSRF_HEADER_NAME, csrfCookieName } from 'shared';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function readCsrfToken(): string | null {
  return readCookie(csrfCookieName(true)) ?? readCookie(csrfCookieName(false));
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

function csrfHeaders(): Record<string, string> {
  const csrfToken = readCsrfToken();
  return csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {};
}

function buildHeaders(method: string, hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') Object.assign(headers, csrfHeaders());
  return headers;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    return String(payload.error);
  }
  return `Request failed with status ${String(status)}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const response = await fetch(`/api${path}`, {
    method,
    headers: buildHeaders(method, options.body !== undefined),
    credentials: 'same-origin',
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(payload, response.status));
  }

  return payload as T;
}

export async function uploadChunkBytes(
  path: string,
  bytes: Uint8Array,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream', ...csrfHeaders() },
    credentials: 'same-origin',
    body: bytes as BodyInit,
    ...(signal ? { signal } : {}),
  });

  if (response.status === 204) return;

  const payload: unknown = await response.json();
  throw new ApiError(response.status, extractErrorMessage(payload, response.status));
}

export async function fetchChunkBytes(
  path: string,
  grantToken: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const response = await fetch(`/api${path}`, {
    headers: { 'X-Download-Grant': grantToken },
    credentials: 'same-origin',
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    const payload: unknown = await response.json();
    throw new ApiError(response.status, extractErrorMessage(payload, response.status));
  }

  return new Uint8Array(await response.arrayBuffer());
}
