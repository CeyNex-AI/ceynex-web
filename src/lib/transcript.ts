/**
 * Turning a finished live turn into transcript rows (backend deviation D13).
 *
 * A turn is streamed into a `live` slot, and until this existed it never left
 * it: the next question replaced the slot, so the previous answer vanished from
 * the screen until the conversation was reopened, and it could not be rated,
 * saved or exported in the meantime. The `done` frame now names the rows the
 * server stored, so the live turn becomes two ordinary messages at once — the
 * same shape a reload would produce.
 *
 * Pure functions, so the fold is tested without a browser or a server.
 */

import type { DoneFrame } from "./streamChat";
import type { ChatMessage } from "../types/chat";

/** What the page accumulated while a turn streamed. */
export interface FinishedTurn {
  /** Client-only key, so news fetched beside the turn stays beside it. */
  key: string;
  /** What the reader typed. */
  question: string;
  mode?: "analyse" | "discuss" | null;
}

/** The next free `seq`. Stored rows are numbered from 1 by the server. */
export function nextSeq(messages: ChatMessage[]): number {
  return messages.reduce((highest, message) => Math.max(highest, message.seq), 0) + 1;
}

/**
 * The user and assistant rows a finished turn becomes, or `[]` when there is
 * nothing to fold — a failed turn, a turn that ended in a clarifying question,
 * or a frame without an answer.
 *
 * `seq` comes from the transcript on screen rather than the server's own
 * numbering, because a turn that was not persisted (a database outage) has no
 * server `seq` at all and must still take its place in order. The ids are the
 * server's when it has them, and absent when it does not — which is what keeps
 * rating and saving off a turn nobody can attach them to.
 */
export function foldTurn(
  turn: FinishedTurn,
  frame: DoneFrame,
  messages: ChatMessage[],
): ChatMessage[] {
  const answer = frame.answer;
  if (!answer || frame.failed || frame.clarify) return [];

  const seq = nextSeq(messages);
  const user: ChatMessage = {
    id: frame.user_message_id ?? null,
    seq,
    role: "user",
    content: turn.question,
    effective_query: frame.effective_query ?? null,
    agents_used: [],
    route: [],
    sectors: [],
    unanswered: [],
    evidence: [],
    client_key: turn.key,
  };
  const assistant: ChatMessage = {
    id: frame.message_id ?? null,
    seq: seq + 1,
    role: "assistant",
    content: answer.answer,
    mode: turn.mode ?? "analyse",
    request_id: frame.request_id ?? null,
    confidence: answer.confidence,
    confidence_band: answer.confidence_band,
    confidence_breakdown: answer.confidence_breakdown ?? null,
    degraded: answer.degraded,
    grounded: answer.grounded ?? null,
    agents_used: answer.agents_used,
    route: answer.route,
    sectors: answer.sectors,
    unanswered: answer.unanswered,
    evidence: answer.evidence,
    forecast: answer.forecast ?? null,
    graph: answer.graph ?? null,
    elapsed_ms: answer.elapsed_ms ?? null,
    usage: frame.usage ?? null,
    query_history_id: frame.query_history_id ?? null,
    saved: false,
    client_key: turn.key,
  };
  return [user, assistant];
}
