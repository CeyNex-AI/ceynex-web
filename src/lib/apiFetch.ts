import { getToken } from "./tokenStorage";

/**
 * `fetch` for the CeyNex API. Same signature and return value as `fetch`; the
 * one added behaviour is that a `401` on a request that carried a bearer token
 * trips a session-expired handler.
 *
 * `auth.tsx` verifies a stored token against `/api/auth/me` on load, but that
 * only catches an ended session at load time. Once a page is open, a session
 * cut from another device (a password change, a role change, a disable) shows
 * up as the *next* API call coming back 401 — this routes that into the same
 * "you were signed out" path instead of a bare error toast.
 *
 * Login and signup keep plain `fetch` (a 401 there is a wrong password, not an
 * ended session), which the bearer-token check below would exclude anyway.
 */

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
