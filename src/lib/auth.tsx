import { useEffect, useState, type ReactNode } from "react";
import { AuthContext } from "./authContext";
import { fetchMe, loginApi } from "./authApi";
import type { Role } from "./roles";

/**
 * Real auth now: `login()` posts to ceynex-core's POST /api/auth/login and
 * only sets state on a correct password (see authApi.ts). The token is the
 * source of truth for who's signed in -- on load, a stored token is checked
 * against GET /api/auth/me rather than trusted as-is, so an expired or
 * revoked token doesn't silently keep someone "signed in" against a UI that
 * no longer matches what the API will actually accept.
 */

const TOKEN_KEY = "ceynex_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  // Starts true only when there's a token to verify -- otherwise there's
  // nothing to wait on, and starting true would need a synchronous setState
  // in the effect below just to flip it back off.
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    let cancelled = false;
    fetchMe(token)
      .then((user) => {
        if (cancelled) return;
        setUserId(user.email);
        setRole(user.role as Role);
      })
      .catch(() => {
        if (!cancelled) localStorage.removeItem(TOKEN_KEY);
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
    localStorage.setItem(TOKEN_KEY, result.token);
    setUserId(result.email);
    setRole(result.role as Role);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUserId(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ userId, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
