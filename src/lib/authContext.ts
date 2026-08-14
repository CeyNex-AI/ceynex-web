import { createContext } from "react";

export interface AuthContextValue {
  userId: string | null;
  login: (email: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
