import { createContext } from "react";
import type { Role } from "./roles";

export interface AuthContextValue {
  userId: string | null;
  role: Role | null;
  /** True until a stored token has been checked against the server on load. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
