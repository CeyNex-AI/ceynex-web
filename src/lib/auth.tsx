import { useState, type ReactNode } from "react";
import { AuthContext } from "./authContext";

/**
 * No real backend exists yet (ceynex-api-gateway isn't built). This stores a
 * user id in localStorage on "login" with no actual credential check —
 * enough to gate the UI flow (login -> query) for demo purposes, not a
 * real auth system. Replace `login()`'s body with a real POST /api/auth/login
 * call once the gateway exists; the context shape (authContext.ts) shouldn't
 * need to change.
 */

const STORAGE_KEY = "ceynex_user_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  function login(email: string) {
    localStorage.setItem(STORAGE_KEY, email);
    setUserId(email);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUserId(null);
  }

  return <AuthContext.Provider value={{ userId, login, logout }}>{children}</AuthContext.Provider>;
}
