import { useEffect, useState, type ReactNode } from "react";
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
        if (!cancelled) clearToken();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    const result = await loginApi(email, password);
    setToken(result.token);
    setUserId(result.email);
    setRole(result.role as Role);
  }

  // Signup returns the same shape as login and the backend logs the new
  // account straight in, so this is login() with a different first call --
  // no separate "now sign in" step.
  async function signup(email: string, password: string) {
    const result = await signupApi(email, password);
    setToken(result.token);
    setUserId(result.email);
    setRole(result.role as Role);
  }

  function logout() {
    clearToken();
    setUserId(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ userId, role, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
