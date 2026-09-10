/**
 * One place for the three things every `*Api.ts` module was doing by hand.
 *
 * Before this, `authHeaders()` was copy-pasted verbatim into historyApi,
 * accountApi and adminApi, and each module spelled its own `res.ok` check. That
 * was survivable at seven modules; the conversational layer adds several more
 * and roughly ten components, and the duplication compounds rather than staying
 * flat.
 *
 * Deliberately not an axios instance or a client class. Every call in this
 * codebase is a relative `fetch` that rides the Vite dev proxy and nginx in
 * production (see vite.config.ts), and that property is worth keeping — a
 * wrapper that hides the URL is a wrapper that eventually grows an absolute one.
 */

import { getToken } from "./tokenStorage";

/** Thrown by every helper below, carrying the status so callers can branch. */
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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth, optionalAuth, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  Object.assign(
    headers,
    auth ? authHeaders() : optionalAuth ? optionalAuthHeaders() : {},
  );

  const res = await fetch(path, {
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
