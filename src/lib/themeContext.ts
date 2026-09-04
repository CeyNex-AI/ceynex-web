import { createContext } from "react";
import type { Theme } from "./siteApi";

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
