import type { Evidence, ForecastPoint, QueryResponse } from "../types/contracts";

/**
 * Real POST /api/query, proxied same-origin by nginx on the frontend VM
 * (ceynex-infra/frontend/nginx.conf.template) -> the backend VM. Replaces
 * lib/mockQuery.ts now that the gateway exists.
 *
 * The deployed response shape does not actually match QueryResponse
 * (`answer`/`confidence`/`evidence`, not `final_answer`/`final_confidence`/
 * `merged_evidence`, and it doesn't echo `query` back) -- mockQuery.ts's
 * docstring assumed the two would line up exactly, but the real FastAPI
 * response model diverged. Mapped here so QueryResponse and every component
 * that already consumes it (Query.tsx, EvidencePanel, ForecastChart) stay
 * unchanged.
 */
interface ApiQueryResponse {
  answer: string;
  confidence: number;
  confidence_band: string;
  agents_used: string[];
  evidence: Evidence[];
  forecast: ForecastPoint[] | null;
  degraded: boolean;
}

export async function runQuery(query: string): Promise<QueryResponse> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Query failed (${res.status}): ${await res.text()}`);
  }

  const data: ApiQueryResponse = await res.json();

  return {
    query,
    final_answer: data.answer,
    final_confidence: data.confidence,
    merged_evidence: data.evidence,
    forecast: data.forecast ?? undefined,
    degraded: data.degraded,
  };
}
