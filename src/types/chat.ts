/**
 * The conversational layer's wire shapes (backend deviation D13).
 *
 * Kept out of `contracts.ts`, which is reserved for the frozen Python contracts
 * in ceynex-contracts. None of these are frozen: they are `ceynex-core`'s own
 * Pydantic models in `ceynex/api/schemas.py`, and they will grow as the trace
 * taxonomy does.
 */

import type { Breakdown } from "../components/ConfidenceBreakdown";
import type { ConfidenceBand } from "../lib/confidence";

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

  // start — names the turn, and says whether a dropped stream can resume it
  request_id?: string;
  resumable?: boolean;

  // web_search — general web enrichment, never evidence for the answer (D14)
  results?: number;
  domains?: string[];

  // clarify_gate — the gate asked one question back, or decided against it (D13)
  asked?: boolean;
  question?: string;

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

  // instruction — the reader's standing preference was applied (tone only)
  applied?: boolean;
  chars?: number;

  // answer_delta — one grounded sentence of the answer; answer_reset — the
  // draft so far was withdrawn (`reason`: "ungrounded" | "retry")
  text?: string;
  index?: number;

  // budget — a daily model-spend limit was reached (D16)
  scope?: "user" | "global";
  cap_usd?: number;
  spent_usd?: number;
  resets_at?: string;
}

/** What the `done` frame carries, and what a stored assistant message replays. */
export interface AnswerPayload {
  answer: string;
  confidence: number | null;
  confidence_band: ConfidenceBand | null;
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
  /** Every term in the SRS 3.1.4 formula, when the score was computed. */
  confidence_breakdown?: Breakdown | null;
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
  /** The row id — what feedback attaches to. `seq` only orders the transcript. */
  id?: number | null;
  seq: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
  mode?: "analyse" | "discuss" | "clarify" | null;
  request_id?: string | null;
  confidence?: number | null;
  confidence_band?: ConfidenceBand | null;
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
  /** The linked `query_history` row's saved flag, read through the join. */
  saved?: boolean;
  /** SRS 3.1.4's working behind `confidence`, when it was computed. */
  confidence_breakdown?: Breakdown | null;
  /** A discussion only: false when its prose was withheld as ungrounded. */
  grounded?: boolean | null;
  /** A user turn only: the query actually run, when it differs from `content`. */
  effective_query?: string | null;
  /** A regenerated answer: the id of the version it replaces. */
  regenerated_from?: number | null;
  /**
   * Client-only, never sent by the server: the key of the live turn this
   * message was folded from, so related news fetched beside that turn stays
   * beside it. A transcript reloaded from the server has none, by design — see
   * the `news` note on Chat.tsx.
   */
  client_key?: string;
  /**
   * Client-only: a streamed draft of this answer was withdrawn before it
   * arrived, and why ("ungrounded" | "degraded"). Not stored — the stored trace
   * keeps the `answer_reset` step that records it.
   */
  draft_withdrawn?: string | null;
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
