import type { AnswerGraph, Evidence, ForecastPoint, QueryResponse } from "../types/contracts";
import type { ConfidenceBand } from "./confidence";
import { getToken } from "./tokenStorage";

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
 *
 * The token, when present, is sent along so the backend can attribute the
 * query to a user for history (SRS 3.5.2) -- the endpoint itself stays open
 * either way (ceynex/api/routes/query.py's `get_optional_user`), so a missing
 * or stale token never breaks the query, it just isn't remembered.
 */
interface ApiQueryResponse {
  answer: string;
  confidence: number;
  confidence_band: ConfidenceBand;
  agents_used: string[];
  evidence: Evidence[];
  forecast: ForecastPoint[] | null;
  degraded: boolean;
  route: string[];
  sectors: string[];
  /**
   * SRS 3.4.3: the parts of the question that could not be answered. The
   * backend has always sent these three; this client read none of them, so
   * classic mode was strictly poorer than the chat surface for no reason.
   */
  unanswered: string[];
  // null whenever the answer did not come from the knowledge graph -- the
  // backend withholds it rather than sending an empty one, so `graph` being
  // absent is a statement about provenance, not about the graph being small.
  graph: AnswerGraph | null;
}

export async function runQuery(query: string): Promise<QueryResponse> {
  const token = getToken();
  const res = await fetch("/api/query", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
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
    confidence_band: data.confidence_band,
    merged_evidence: data.evidence,
    forecast: data.forecast ?? undefined,
    degraded: data.degraded,
    graph: data.graph ?? undefined,
    // Defaulted rather than asserted: these are read straight off the wire, and
    // a backend older than the field would otherwise make `.length` throw in
    // the renderer rather than simply show nothing.
    agents_used: data.agents_used ?? [],
    route: data.route ?? [],
    sectors: data.sectors ?? [],
    unanswered: data.unanswered ?? [],
  };
}
