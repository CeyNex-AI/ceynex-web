import { getToken, setToken } from "./tokenStorage";
import { apiFetch, apiJson } from "./apiFetch";

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
  const res = await apiFetch("/api/account/preferences", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Couldn't load preferences (${res.status}).`);
  return res.json();
}

export async function savePreferences(
  prefs: NotificationPreferences
): Promise<NotificationPreferences> {
  const res = await apiFetch("/api/account/preferences", {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error(`Couldn't save preferences (${res.status}).`);
  return res.json();
}

export async function fetchApiKeys(): Promise<ApiKeyItem[]> {
  const res = await apiFetch("/api/account/api-keys", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Couldn't load API keys (${res.status}).`);
  const data: { keys: ApiKeyItem[] } = await res.json();
  return data.keys;
}

export async function createApiKey(label: string): Promise<NewApiKey> {
  const res = await apiFetch("/api/account/api-keys", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(`Couldn't create API key (${res.status}).`);
  return res.json();
}

export async function revokeApiKey(id: number): Promise<void> {
  const res = await apiFetch(`/api/account/api-keys/${id}/revoke`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Couldn't revoke that key (${res.status}).`);
}

/**
 * POST /api/account/password. Current password required (403 if wrong); the new
 * one must differ and be 8+ chars (422).
 *
 * The change invalidates every session for the account server-side, so the
 * response carries a fresh token — swapped in here so *this* device stays
 * signed in while other sessions drop. Other tabs pick it up on their next
 * request failing and re-reading storage; nothing else to do.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await apiFetch("/api/account/password", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (res.ok) {
    const { token } = (await res.json()) as { token?: string };
    if (token) setToken(token);
    return;
  }
  if (res.status === 403) throw new Error("Current password is incorrect.");
  if (res.status === 422) throw new Error("New password must be different and at least 8 characters.");
  throw new Error(`Couldn't change password (${res.status}).`);
}

/**
 * POST /api/account/email. Current password required (403). The change
 * invalidates every session server-side, so the response is a fresh
 * {token, email, role}. auth.tsx swaps it in — don't call this directly, use
 * `useAuth().changeEmail`.
 */
export async function changeEmailApi(
  currentPassword: string,
  newEmail: string
): Promise<{ token: string; email: string; role: string }> {
  const res = await apiFetch("/api/account/email", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ current_password: currentPassword, new_email: newEmail }),
  });
  if (res.ok) return res.json();
  if (res.status === 403) throw new Error("Current password is incorrect.");
  if (res.status === 409) throw new Error("That email is already in use.");
  if (res.status === 422) throw new Error("That doesn't look like a valid email.");
  throw new Error(`Couldn't change email (${res.status}).`);
}

/**
 * DELETE /api/account. Current password required (403). Removes the account
 * and its history / API keys / preferences. 409 if you're the last admin.
 * Use `useAuth().deleteAccount`, which signs out afterwards.
 */
export async function deleteAccountApi(currentPassword: string): Promise<void> {
  const res = await apiFetch("/api/account", {
    method: "DELETE",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ current_password: currentPassword }),
  });
  if (res.ok) return;
  if (res.status === 403) throw new Error("Current password is incorrect.");
  if (res.status === 409) throw new Error("You're the last admin — make someone else an admin first.");
  throw new Error(`Couldn't delete the account (${res.status}).`);
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
  /** This reader's own daily model budget (D16); 0 when none is set. */
  per_user_daily_cap_usd: number;
  spent_today_by_you_usd: number;
  /** The next 00:00 UTC, when both daily limits start again. */
  resets_at: string | null;
  your_budget_spent: boolean;
  deployment_cap_spent: boolean;
}

export interface UserInstruction {
  content: string;
  enabled: boolean;
  max_chars: number;
}

export function fetchUsage(days = 30, scope: "user" | "all" = "user"): Promise<UsageSummary> {
  const path = scope === "all" ? "/api/usage/all" : "/api/usage/summary";
  return apiJson<UsageSummary>(`${path}?days=${days}`, { auth: true });
}

export function fetchUsageLimits(): Promise<UsageLimits> {
  return apiJson<UsageLimits>("/api/usage/limits", { auth: true });
}

export function fetchInstructions(): Promise<UserInstruction> {
  return apiJson<UserInstruction>("/api/account/instructions", { auth: true });
}

export function saveInstructions(
  content: string,
  enabled: boolean,
): Promise<UserInstruction> {
  return apiJson<UserInstruction>("/api/account/instructions", {
    method: "PUT",
    auth: true,
    body: { content, enabled },
  });
}
