/**
 * The conversational layer's wire shapes (backend deviation D13).
 *
 * Kept out of `contracts.ts`, which is reserved for the frozen Python contracts
 * in ceynex-contracts. None of these are frozen: they are `ceynex-core`'s own
 * Pydantic models in `ceynex/api/schemas.py`, and they will grow as the trace
 * taxonomy does.
 */

import type { AnswerGraph, Evidence, ForecastPoint } from "./contracts";

/**
 * One step of the reasoning trace.
 *
 * `kind` is an open taxonomy, deliberately — a web-search step and a
 * clarification step are coming, and the renderer must ignore what it does not
 * recognise rather than break. The known payload fields are optional for the
 * same reason: they vary per kind, and narrowing them into a discriminated
 * union would mean a type change every time a call site learns to report
 * something new.
 */
export interface TraceEvent {
  kind: string;
  seq?: number;
  ts?: number;
  node?: string | null;
  status?: string;
  elapsed_ms?: number;
  error?: string;

  // kg_query
  cypher?: string;
  params?: string;
  row_count?: number;
  attempts?: number;

  // sql_query
  table?: string;
  sql?: string;
  item?: string;
  target?: string;

  // vector_search
  collection?: string;
  filter?: string;
  kept?: number;
  top_score?: number | null;
  widened?: boolean;

  // llm_call
  role?: string;
  model?: string;
  provider?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  cache_hit?: boolean;
  fallback?: boolean;

  // thought
  step?: string;
  position?: number;
  of?: number;
  method?: string;

  // route
  route?: string[];
  sectors?: string[];
  relevance?: Record<string, number>;
  out_of_scope?: boolean;

  // agent_result / merge
  confidence?: number;
  figures?: number;
  evidence_count?: number;
  degraded?: boolean;

  // turn
  mode?: "discuss" | "analyse";
  reason?: string;
  standalone_query?: string | null;
}

/** What the `done` frame carries, and what a stored assistant message replays. */
export interface AnswerPayload {
  answer: string;
  confidence: number | null;
  confidence_band: string | null;
  agents_used: string[];
  evidence: Evidence[];
  forecast?: ForecastPoint[] | null;
  graph?: AnswerGraph | null;
  degraded: boolean;
  route: string[];
  sectors: string[];
  unanswered: string[];
  elapsed_ms?: number | null;
  /** Present on a `discuss` turn: false when the reply was discarded for
   *  stating a figure the analysis never produced. */
  grounded?: boolean;
}

export interface UsageSummary {
  calls: number;
  cache_hits: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

export interface ConversationSummary {
  id: number;
  title: string | null;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  archived: boolean;
  message_count: number;
}

export interface ChatMessage {
  seq: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
  mode?: "analyse" | "discuss" | "clarify" | null;
  request_id?: string | null;
  confidence?: number | null;
  confidence_band?: string | null;
  degraded?: boolean | null;
  agents_used: string[];
  route: string[];
  sectors: string[];
  unanswered: string[];
  evidence: Evidence[];
  forecast?: ForecastPoint[] | null;
  graph?: AnswerGraph | null;
  elapsed_ms?: number | null;
  usage?: UsageSummary | null;
  query_history_id?: number | null;
}

export interface ConversationDetail {
  conversation: ConversationSummary;
  messages: ChatMessage[];
}

/** A turn in progress, before it becomes a stored `ChatMessage`. */
export interface PendingTurn {
  question: string;
  events: TraceEvent[];
  answer?: AnswerPayload;
  usage?: UsageSummary;
  error?: string;
  done: boolean;
}
