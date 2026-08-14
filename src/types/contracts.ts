/**
 * TypeScript mirror of the frozen Python contracts in ceynex-core
 * (ceynex/contracts/evidence.py, forecast.py, state.py). Field names match
 * exactly on purpose — this is what the real ceynex-api-gateway response
 * shape will be once it exists, so the frontend doesn't need reshaping when
 * a real backend replaces src/lib/mockQuery.ts.
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
