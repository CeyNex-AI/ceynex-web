import { createContext } from "react";
import type { Role } from "./roles";

export interface AuthContextValue {
  userId: string | null;
  role: Role | null;
  login: (email: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
