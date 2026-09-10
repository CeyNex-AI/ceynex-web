import { useEffect, useState, type ReactNode } from "react";
import { changeEmailApi, deleteAccountApi } from "./accountApi";
import { setSessionExpiredHandler } from "./apiFetch";
import { AuthContext } from "./authContext";
import { fetchMe, loginApi, signupApi } from "./authApi";
import type { Role } from "./roles";
import { clearToken, getToken, setToken } from "./tokenStorage";

/**
 * Real auth now: `login()` posts to ceynex-core's POST /api/auth/login and
 * only sets state on a correct password (see authApi.ts). The token is the
 * source of truth for who's signed in -- on load, a stored token is checked
 * against GET /api/auth/me rather than trusted as-is, so an expired or
 * revoked token doesn't silently keep someone "signed in" against a UI that
 * no longer matches what the API will actually accept.
 */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Starts true only when there's a token to verify -- otherwise there's
  // nothing to wait on, and starting true would need a synchronous setState
  // in the effect below just to flip it back off.
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    fetchMe(token)
      .then((user) => {
        if (cancelled) return;
        setUserId(user.email);
        setRole(user.role as Role);
      })
      .catch(() => {
        // There WAS a token and the server refused it — expired, or cut by a
        // password/role change or a disable. Tell the Login page so it can
        // say so rather than looking like a first visit.
        if (!cancelled) {
          clearToken();
          setSessionExpired(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function applySession(result: { token: string; email: string; role: string }) {
    setToken(result.token);
    setUserId(result.email);
    setRole(result.role as Role);
    setSessionExpired(false);
  }

  // Any authed API call coming back 401 (token expired, or the session cut
  // from another device) drops the local session and flags it, so RequireAuth
  // redirects to Login and the "you were signed out" notice shows — without
  // waiting for a page reload.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearToken();
      setUserId(null);
      setRole(null);
      setSessionExpired(true);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  async function login(email: string, password: string) {
    applySession(await loginApi(email, password));
  }

  // Signup returns the same shape as login and the backend logs the new
  // account straight in, so this is login() with a different first call --
  // no separate "now sign in" step.
  async function signup(email: string, password: string, role?: string) {
    applySession(await signupApi(email, password, role));
  }

  // The email change invalidates every session for the account server-side;
  // the response carries a fresh token, so this is applySession() with the
  // new address folded in.
  async function changeEmail(currentPassword: string, newEmail: string) {
    applySession(await changeEmailApi(currentPassword, newEmail));
  }

  async function deleteAccount(currentPassword: string) {
    await deleteAccountApi(currentPassword);
    logout();
  }

  function logout() {
    clearToken();
    setUserId(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider
      value={{
        userId,
        role,
        loading,
        sessionExpired,
        login,
        signup,
        changeEmail,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
