import { useEffect, useState, type ReactNode } from "react";
import { fetchSiteTheme, setSiteTheme, type Theme } from "./siteApi";
import { ThemeContext } from "./themeContext";

/**
 * The site-wide "Signal Deck" theme (see index.css's [data-theme="signal-deck"]
 * rules) -- optional, off by default (`classic`), and changed for every
 * visitor at once from the Admin page, not a per-browser preference. Every
 * page (including Login, before any auth) fetches the current value on
 * mount, since GET /api/site/theme is public.
 *
 * A fetch failure degrades to "classic" silently -- same posture as
 * TrendingNews/NewsPanel elsewhere in this app: an unreachable settings read
 * must not block the page from rendering.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("classic");

  useEffect(() => {
    fetchSiteTheme()
      .then(setThemeState)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (theme === "signal-deck") {
      document.documentElement.setAttribute("data-theme", "signal-deck");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  async function setTheme(next: Theme) {
    // Saved first, applied from what the server actually stored -- not an
    // optimistic update, so a rejected/failed save (a non-admin somehow
    // reaching this, a DB outage) never shows the caller a theme that isn't
    // really the site's.
    const applied = await setSiteTheme(next);
    setThemeState(applied);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
