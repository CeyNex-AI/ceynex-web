import { getToken } from "./tokenStorage";

/**
 * The site-wide UI theme -- GET /api/site/theme (public, no token needed:
 * every visitor's page load reads it) and POST /api/site/theme (admin only,
 * changes what every visitor sees). Same-origin proxy as every other API
 * client here.
 */

export type Theme = "classic" | "signal-deck";

function normalize(value: unknown): Theme {
  return value === "signal-deck" ? "signal-deck" : "classic";
}

export async function fetchSiteTheme(): Promise<Theme> {
  const res = await fetch("/api/site/theme");
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  return normalize(data.theme);
}

export async function setSiteTheme(theme: Theme): Promise<Theme> {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  const res = await fetch("/api/site/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ theme }),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  return normalize(data.theme);
}
