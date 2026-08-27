import { getToken } from "./tokenStorage";

/**
 * Real GET/PUT /api/account/preferences and the API-key routes, proxied
 * same-origin the same way as historyApi.ts. Both require being signed in,
 * so every call here throws if there's no token rather than degrading
 * silently -- there is no anonymous account to show.
 */

export interface NotificationPreferences {
  dq_flag_alerts: boolean;
  forecast_updates: boolean;
  weekly_digest: boolean;
}

export interface ApiKeyItem {
  id: number;
  label: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

export interface NewApiKey {
  id: number;
  label: string;
  key: string;
  key_prefix: string;
  created_at: string;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  return { authorization: `Bearer ${token}` };
}

export async function fetchPreferences(): Promise<NotificationPreferences> {
  const res = await fetch("/api/account/preferences", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Couldn't load preferences (${res.status}).`);
  return res.json();
}

export async function savePreferences(
  prefs: NotificationPreferences
): Promise<NotificationPreferences> {
  const res = await fetch("/api/account/preferences", {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error(`Couldn't save preferences (${res.status}).`);
  return res.json();
}

export async function fetchApiKeys(): Promise<ApiKeyItem[]> {
  const res = await fetch("/api/account/api-keys", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Couldn't load API keys (${res.status}).`);
  const data: { keys: ApiKeyItem[] } = await res.json();
  return data.keys;
}

export async function createApiKey(label: string): Promise<NewApiKey> {
  const res = await fetch("/api/account/api-keys", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(`Couldn't create API key (${res.status}).`);
  return res.json();
}

export async function revokeApiKey(id: number): Promise<void> {
  const res = await fetch(`/api/account/api-keys/${id}/revoke`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Couldn't revoke that key (${res.status}).`);
}
