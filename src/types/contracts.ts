/**
 * TypeScript mirror of the frozen Python contracts in ceynex-core
 * (ceynex/contracts/evidence.py, forecast.py, state.py). `Evidence` and
 * `ForecastPoint` match the real POST /api/query response field-for-field.
 * `QueryResponse` itself doesn't — the deployed endpoint returns
 * `answer`/`confidence`/`evidence` and no `query` echo, not
 * `final_answer`/`final_confidence`/`merged_evidence`/`query`. This shape is
 * kept as the frontend's internal representation regardless; the mapping
 * lives in src/lib/queryApi.ts so nothing downstream needs to change if the
 * API response shape moves again.
 */

export type SourceId = "UN_COMTRADE" | "WITS" | "FAOSTAT" | "CBSL" | "JAAF" | "EDB" | "KG" | "MODEL";

export interface Evidence {
  source_id: SourceId;
  claim: string;
  detail: string;
  period?: string;
  url?: string;
}

export interface ForecastPoint {
  period: string;
  point: number;
  lower: number;
  upper: number;
  unit: string;
}

/**
 * The orchestrator's merged answer (AgentState's final_answer /
 * final_confidence / merged_evidence fields, ceynex/contracts/state.py) —
 * not a raw single-agent AgentOutput. This is what GET /api/query should
 * return once the gateway exists.
 */
export interface QueryResponse {
  query: string;
  final_answer: string;
  final_confidence: number;
  merged_evidence: Evidence[];
  forecast?: ForecastPoint[];
  degraded: boolean;
}
