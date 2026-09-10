import { createContext } from "react";
import type { Role } from "./roles";

export interface AuthContextValue {
  userId: string | null;
  role: Role | null;
  /** True until a stored token has been checked against the server on load. */
  loading: boolean;
  /**
   * True when a stored token was present on load but the server rejected it
   * (expired, or cut by a password/role change or a disable). Lets the Login
   * page say "you were signed out" instead of looking like a fresh visit.
   * Cleared on the next successful login/signup.
   */
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role?: string) => Promise<void>;
  /** Change the signed-in account's email; swaps in the fresh token. */
  changeEmail: (currentPassword: string, newEmail: string) => Promise<void>;
  /** Delete the signed-in account, then sign out locally. */
  deleteAccount: (currentPassword: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
