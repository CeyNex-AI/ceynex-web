/**
 * The signed-in session token, in one place -- auth.tsx owns the sign-in/out
 * lifecycle, but queryApi.ts and historyApi.ts also need to read it to attach
 * `Authorization` to their own requests. Extracted rather than duplicating the
 * key string in three files.
 */

const TOKEN_KEY = "ceynex_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
