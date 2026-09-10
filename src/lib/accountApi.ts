import { apiFetch } from "./apiFetch";
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

// --- usage and cost (backend deviation D15) ---------------------------------

export interface UsageRollup {
  key: string;
  calls: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

export interface UsageSummary {
  days: number;
  scope: "user" | "all";
  by_day: UsageRollup[];
  by_role: UsageRollup[];
  total_cost_usd: number;
  total_calls: number;
  total_tokens_in: number;
  total_tokens_out: number;
}

export interface UsageLimits {
  limits: UsageRollup[];
  daily_spend_cap_usd: number;
  spent_today_usd: number;
  /** The cap is per uvicorn worker, so real spend can reach worker_count times it. */
  cap_is_per_worker: boolean;
  worker_count: number;
}

export interface UserInstruction {
  content: string;
  enabled: boolean;
  max_chars: number;
}

export function fetchUsage(days = 30, scope: "user" | "all" = "user"): Promise<UsageSummary> {
  const path = scope === "all" ? "/api/usage/all" : "/api/usage/summary";
  return apiFetch<UsageSummary>(`${path}?days=${days}`, { auth: true });
}

export function fetchUsageLimits(): Promise<UsageLimits> {
  return apiFetch<UsageLimits>("/api/usage/limits", { auth: true });
}

export function fetchInstructions(): Promise<UserInstruction> {
  return apiFetch<UserInstruction>("/api/account/instructions", { auth: true });
}

export function saveInstructions(
  content: string,
  enabled: boolean,
): Promise<UserInstruction> {
  return apiFetch<UserInstruction>("/api/account/instructions", {
    method: "PUT",
    auth: true,
    body: { content, enabled },
  });
}
