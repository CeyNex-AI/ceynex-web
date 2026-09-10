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

import type { ConfidenceBand } from "../lib/confidence";

/**
 * Mirrors `SourceId` in ceynex-contracts, which is a plain `str` there so a new
 * source needs no contract change — but a closed union here, so the frontend
 * still fails a type-check rather than silently rendering an unknown chip.
 *
 * `POLICY` was missing: the backend has emitted it since policy retrieval (D10)
 * shipped, via `agents/common.py::evidence_from_policy`. `WEB` is reserved for
 * the general web search (D14).
 */
export type SourceId =
  | "UN_COMTRADE"
  | "WITS"
  | "FAOSTAT"
  | "CBSL"
  | "JAAF"
  | "EDB"
  | "KG"
  | "MODEL"
  | "POLICY"
  | "WEB";

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
  /**
   * The band the *backend* computed, not one derived here. `lib/confidence.ts`
   * mirrors `confidence_band()`'s thresholds and says to keep the two in sync;
   * preferring the server's answer means there is nothing to keep in sync on
   * this path. Optional because the field is new — an older backend omits it
   * and the client falls back to computing it.
   */
  confidence_band?: ConfidenceBand;
  merged_evidence: Evidence[];
  forecast?: ForecastPoint[];
  degraded: boolean;
  graph?: AnswerGraph;
  /** Which agents actually contributed, after out-of-scope suppression. */
  agents_used: string[];
  route: string[];
  sectors: string[];
  /**
   * The parts of the question that could not be answered. SRS 3.4.3 requires
   * the system to name these rather than silently omit them, so this is a
   * requirement being met, not a detail — it was on the wire and dropped.
   */
  unanswered: string[];
}

/**
 * The knowledge graph behind an answer — ceynex/api/schemas.py's GraphNode /
 * GraphEdge / AnswerGraph, built by ceynex/kg/subgraph.py.
 *
 * Not one of the frozen contracts: `Evidence` and `ForecastPoint` above mirror
 * TypedDicts in the separate ceynex-contracts repo, but these live in
 * ceynex-core's own API layer, added additively beside `route` and `sectors`.
 *
 * Absent — and so no panel at all — whenever the answer did not come from the
 * graph. A diagram beside a model-derived or out-of-scope answer would claim a
 * provenance that isn't there, so the backend withholds it rather than
 * returning an empty one for the UI to decide about.
 */
export interface GraphNode {
  /** "Country:USA" — the label plus its uniqueness key, stable across reloads. */
  id: string;
  label: string;
  name: string;
  properties: Record<string, unknown>;
  /** The node the question was about. At most one, and the layout centres on it. */
  focus: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  /** 0..1 within its own relationship type, for stroke width. */
  weight?: number | null;
  /** The figure, pre-formatted ("$412M") — `weight` is unit-less by now. */
  label?: string | null;
  properties: Record<string, unknown>;
}

export interface AnswerGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focus_id?: string | null;
  /** The Cypher that drew this, for the panel's own provenance footer. */
  queries: string[];
  /** There is more graph than is shown. Said out loud, like `degraded`. */
  truncated: boolean;
}

/** One hop out from a clicked node — GET /api/graph/expand. Merged into the
 * canvas rather than replacing it, which is why it has no focus of its own. */
export interface GraphFragment {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}
