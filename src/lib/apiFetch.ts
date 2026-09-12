/**
 * `fetch` for the CeyNex API, in two shapes over one wire.
 *
 * **`apiFetch`** has the same signature and return value as `fetch`. Its one
 * added behaviour is that a `401` on a request that carried a bearer token
 * trips a session-expired handler. `auth.tsx` verifies a stored token against
 * `/api/auth/me` on load, but that only catches an ended session at load time.
 * Once a page is open, a session cut from another device (a password change, a
 * role change, a disable) shows up as the *next* API call coming back 401. This
 * routes that into the same "you were signed out" path instead of a bare error
 * toast. Login and signup keep plain `fetch` (a 401 there is a wrong password,
 * not an ended session), which the bearer-token check below would exclude anyway.
 *
 * **`apiJson`** is the typed helper the conversational layer's modules use: it
 * sends the token, encodes the body, checks `res.ok`, and parses the JSON,
 * throwing an `ApiError` that carries the status. It is built on `apiFetch`, so
 * an ended session reached through a chat call takes the same sign-out path.
 *
 * Deliberately not an axios instance or a client class. Every call in this
 * codebase is a relative `fetch` that rides the Vite dev proxy and nginx in
 * production (see vite.config.ts), and that property is worth keeping — a
 * wrapper that hides the URL is a wrapper that eventually grows an absolute one.
 */

import { getToken } from "./tokenStorage";

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(fn: (() => void) | null): void {
  onSessionExpired = fn;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, init);
  // Only a token that the server rejected counts — not an anonymous call, and
  // not a 401 after we've already signed out (getToken() would be null).
  if (res.status === 401 && hadBearerToken(init) && getToken()) {
    onSessionExpired?.();
  }
  return res;
}

function hadBearerToken(init: RequestInit): boolean {
  const h = init.headers;
  if (!h) return false;
  if (h instanceof Headers) return h.has("authorization");
  if (Array.isArray(h)) return h.some(([k]) => k.toLowerCase() === "authorization");
  return Object.keys(h as Record<string, string>).some((k) => k.toLowerCase() === "authorization");
}

/** Thrown by `apiJson`, carrying the status so callers can branch. */
export class ApiError extends Error {
  // Declared and assigned rather than a constructor parameter property:
  // tsconfig sets `erasableSyntaxOnly`, which forbids the shorthand.
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) throw new ApiError("Not signed in.", 401);
  return { authorization: `Bearer ${token}` };
}

/**
 * The token when there is one, nothing when there is not.
 *
 * For the endpoints that answer anonymous callers too — `/api/query` and
 * `/api/chat/stream` without a conversation. Signing in unlocks history and
 * conversations; it is not a gate on asking a question.
 */
export function optionalAuthHeaders(): HeadersInit {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function describe(res: Response): Promise<string> {
  /**
   * FastAPI puts its message in `detail`. Falling back to the raw body matters
   * for the ones that don't — a 502 from nginx is HTML, and showing the user a
   * page of markup is worse than showing them the status.
   */
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    /* not json — fall through */
  }
  return `Request failed (${res.status})`;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Send the bearer token, failing fast when there isn't one. */
  auth?: boolean;
  /** Send it only if present. Mutually exclusive with `auth` in practice. */
  optionalAuth?: boolean;
  signal?: AbortSignal;
}

export async function apiJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth, optionalAuth, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  Object.assign(
    headers,
    auth ? authHeaders() : optionalAuth ? optionalAuthHeaders() : {},
  );

  const res = await apiFetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (!res.ok) throw new ApiError(await describe(res), res.status);
  // 204 has no body to parse, and `res.json()` on one throws.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
