import { getToken } from "./tokenStorage";
import { apiFetch } from "./apiFetch";

/**
 * Real ceynex-core admin endpoints (SRS 3.5.4), proxied same-origin the same
 * way as queryApi.ts/historyApi.ts. Every call requires a token from an
 * `admin`-role account -- the backend enforces this with `require_admin`
 * (403 for any other role), this module does not duplicate that check, it
 * just always sends whatever token is stored.
 */

export interface ModelSummary {
  sector: string;
  item: string;
  target: string;
  version: string;
  saved_at: string;
  model_class: string;
  training_rows: number | null;
  metrics: Record<string, number> | null;
  interval_level: number;
  notes: string | null;
}

export interface IngestResultItem {
  source_id: string;
  status: string;
  rows_in: number;
  rows_written: number;
  dq_flags: number;
  error: string | null;
  warnings: string[];
}

export interface PipelineRunItem {
  run_id: number;
  source_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_written: number;
  error: string | null;
}

export interface DQFlagItem {
  flag_id: number;
  item: string | null;
  hs_code: string | null;
  partner_iso3: string | null;
  period_start: string | null;
  metric: string | null;
  source_a: string | null;
  value_a: number | null;
  source_b: string | null;
  value_b: number | null;
  pct_diff: number | null;
  severity: string | null;
  detected_at: string;
  resolved: boolean;
}

export interface ProviderStatusItem {
  configured: boolean;
  status: "not_configured" | "cap_reached" | "unknown" | "ok" | "down";
  last_error: string | null;
  last_checked_at: string | null;
}

export interface LLMStatus {
  openai: ProviderStatusItem;
  openrouter: ProviderStatusItem;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  return { authorization: `Bearer ${token}` };
}

async function unwrap<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    if (res.status === 403) throw new Error("Admin role required.");
    throw new Error(`${label} failed (${res.status}).`);
  }
  return res.json();
}

export async function fetchModels(): Promise<ModelSummary[]> {
  const res = await apiFetch("/api/admin/models", { headers: authHeaders() });
  const data = await unwrap<{ models: ModelSummary[] }>(res, "Loading models");
  return data.models;
}

export async function retrainModel(sector: string, item: string, target: string): Promise<ModelSummary> {
  const res = await apiFetch("/api/admin/retrain", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ sector, item, target }),
  });
  return unwrap<ModelSummary>(res, "Retrain");
}

export async function triggerIngest(sources?: string[]): Promise<IngestResultItem[]> {
  const res = await apiFetch("/api/admin/pipeline/ingest", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ sources: sources ?? null }),
  });
  const data = await unwrap<{ results: IngestResultItem[] }>(res, "Ingest");
  return data.results;
}

export async function fetchPipelineStatus(): Promise<PipelineRunItem[]> {
  const res = await apiFetch("/api/admin/pipeline/status", { headers: authHeaders() });
  const data = await unwrap<{ runs: PipelineRunItem[] }>(res, "Loading pipeline status");
  return data.runs;
}

export async function fetchDQFlags(): Promise<DQFlagItem[]> {
  const res = await apiFetch("/api/admin/dq-flags", { headers: authHeaders() });
  const data = await unwrap<{ flags: DQFlagItem[] }>(res, "Loading DQ flags");
  return data.flags;
}

export async function resolveDQFlag(flagId: number): Promise<void> {
  const res = await apiFetch(`/api/admin/dq-flags/${flagId}/resolve`, {
    method: "POST",
    headers: authHeaders(),
  });
  await unwrap<{ flag_id: number; resolved: boolean }>(res, "Resolving flag");
}

export async function fetchLLMStatus(): Promise<LLMStatus> {
  const res = await apiFetch("/api/admin/llm/status", { headers: authHeaders() });
  return unwrap<LLMStatus>(res, "Loading LLM status");
}

// --- audit log (SRS 3.4.7) -------------------------------------------

export interface AuditLogItem {
  id: number;
  actor_email: string;
  action: string;
  target: string | null;
  logged_at: string;
}

export async function fetchAuditLog(): Promise<AuditLogItem[]> {
  const res = await apiFetch("/api/admin/audit-log", { headers: authHeaders() });
  const data = await unwrap<{ entries: AuditLogItem[] }>(res, "Loading audit log");
  return data.entries;
}

// --- user accounts + roles (RBAC, SRS 3.5.4) --------------------------

export interface UserAdminItem {
  id: number;
  email: string;
  role: string;
  created_at: string;
  disabled: boolean;
}

export async function fetchUsers(): Promise<UserAdminItem[]> {
  const res = await apiFetch("/api/admin/users", { headers: authHeaders() });
  const data = await unwrap<{ users: UserAdminItem[] }>(res, "Loading users");
  return data.users;
}

/** The backend translates a duplicate email to 409 and a bad role / short
 * password to 422 -- surfaced as readable messages rather than a bare code. */
export async function createUser(email: string, password: string, role: string): Promise<UserAdminItem> {
  const res = await apiFetch("/api/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email, password, role }),
  });
  if (res.status === 409) throw new Error("An account with that email already exists.");
  if (res.status === 422) throw new Error("Check the email, role, and that the password is 8+ characters.");
  return unwrap<UserAdminItem>(res, "Creating user");
}

export async function setUserRole(id: number, role: string): Promise<UserAdminItem> {
  const res = await apiFetch(`/api/admin/users/${id}/role`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  if (res.status === 409) throw new Error("That would remove the last admin.");
  if (res.status === 404) throw new Error("That user no longer exists.");
  return unwrap<UserAdminItem>(res, "Changing role");
}

export async function setUserDisabled(id: number, disabled: boolean): Promise<UserAdminItem> {
  const res = await apiFetch(`/api/admin/users/${id}/${disabled ? "disable" : "enable"}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (res.status === 409) throw new Error("That would disable the last admin.");
  if (res.status === 404) throw new Error("That user no longer exists.");
  return unwrap<UserAdminItem>(res, disabled ? "Disabling user" : "Enabling user");
}

/** Admin reset for a locked-out user — no current-password check server-side.
 * The caller generates the value and is responsible for relaying it. */
export async function setUserPassword(id: number, password: string): Promise<UserAdminItem> {
  const res = await apiFetch(`/api/admin/users/${id}/password`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ password }),
  });
  if (res.status === 404) throw new Error("That user no longer exists.");
  return unwrap<UserAdminItem>(res, "Setting password");
}

/** A throwaway password an admin hands to a locked-out user to sign in and
 * change. ~20 alphanumeric chars from the CSPRNG (well over the 8-char floor
 * even after stripping base64 punctuation). */
export function generatePassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
}
