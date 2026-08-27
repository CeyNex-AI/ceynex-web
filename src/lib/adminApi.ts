import { getToken } from "./tokenStorage";

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
  const res = await fetch("/api/admin/models", { headers: authHeaders() });
  const data = await unwrap<{ models: ModelSummary[] }>(res, "Loading models");
  return data.models;
}

export async function retrainModel(sector: string, item: string, target: string): Promise<ModelSummary> {
  const res = await fetch("/api/admin/retrain", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ sector, item, target }),
  });
  return unwrap<ModelSummary>(res, "Retrain");
}

export async function triggerIngest(sources?: string[]): Promise<IngestResultItem[]> {
  const res = await fetch("/api/admin/pipeline/ingest", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ sources: sources ?? null }),
  });
  const data = await unwrap<{ results: IngestResultItem[] }>(res, "Ingest");
  return data.results;
}

export async function fetchPipelineStatus(): Promise<PipelineRunItem[]> {
  const res = await fetch("/api/admin/pipeline/status", { headers: authHeaders() });
  const data = await unwrap<{ runs: PipelineRunItem[] }>(res, "Loading pipeline status");
  return data.runs;
}

export async function fetchDQFlags(): Promise<DQFlagItem[]> {
  const res = await fetch("/api/admin/dq-flags", { headers: authHeaders() });
  const data = await unwrap<{ flags: DQFlagItem[] }>(res, "Loading DQ flags");
  return data.flags;
}

export async function resolveDQFlag(flagId: number): Promise<void> {
  const res = await fetch(`/api/admin/dq-flags/${flagId}/resolve`, {
    method: "POST",
    headers: authHeaders(),
  });
  await unwrap<{ flag_id: number; resolved: boolean }>(res, "Resolving flag");
}

export async function fetchLLMStatus(): Promise<LLMStatus> {
  const res = await fetch("/api/admin/llm/status", { headers: authHeaders() });
  return unwrap<LLMStatus>(res, "Loading LLM status");
}
