/**
 * Consuming `POST /api/chat/stream` — and picking it back up when it drops.
 *
 * **`fetch` + a ReadableStream reader, not `EventSource`.** `EventSource` is
 * GET-only and cannot set an Authorization header, and this endpoint needs both
 * a JSON body and a bearer token. The framing is parsed in `sse.ts`.
 *
 * **A dropped stream is resumed, not abandoned.** The server runs a signed-in
 * turn to completion whether or not anyone is still reading (backend D12,
 * amended), and numbers every frame. So when the connection drops before the
 * terminal `done` frame, this reconnects to
 * `GET /api/chat/turns/{request_id}/events?after=<last frame seen>` and carries
 * on delivering to the same handlers — a few attempts with growing waits, each
 * frame delivered exactly once even if the resume replays one that was in
 * flight. Only when that fails does the page hear `onDropped`.
 *
 * **Stop is a request, not a hang-up.** Closing the socket no longer stops the
 * server, by design, so `cancelTurn` asks it to; the stream then ends with a
 * `done` frame saying it was cancelled, like any other ending.
 */

import { authHeaders, optionalAuthHeaders } from "./apiFetch";
import { FrameBuffer, SeqTracker, type SseFrame } from "./sse";
import type { ClarifyPrompt } from "../components/ClarifyCard";
import type { AnswerPayload, TraceEvent } from "../types/chat";

export interface StreamHandlers {
  /** Every trace event, in order. `kind` says what it is. */
  onEvent?: (event: TraceEvent) => void;
  /** The terminal frame. Carries the answer, the usage and whether it failed. */
  onDone?: (done: DoneFrame) => void;
  /** An in-band failure. Always followed by `done` — never a rejected promise. */
  onError?: (message: string) => void;
  /**
   * The connection ended without the terminal `done` frame and could not be
   * resumed — a turn too old to replay, a server gone, or a network that stayed
   * down. Distinct from `onError` on purpose: an `error` frame means the server
   * decided the turn failed, whereas this means we stopped hearing from a turn
   * that the server keeps working on. The two deserve different words.
   */
  onDropped?: () => void;
  /** The connection dropped and attempt `n` to resume it is under way. */
  onReconnecting?: (attempt: number, of: number) => void;
  /** A resume succeeded; the turn is streaming again. */
  onReconnected?: () => void;
  /**
   * The gate asked one question back instead of answering (D13). Always followed
   * by `done`, and no graph ran — so this is not a failure and must not read as
   * one.
   */
  onClarify?: (prompt: ClarifyPrompt) => void;
}

export interface DoneFrame {
  failed: boolean;
  request_id?: string;
  conversation_id?: number | null;
  usage?: {
    calls: number;
    cache_hits: number;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
  };
  dropped_events?: number;
  answer?: AnswerPayload;
  /** True when the turn ended in a question rather than an answer. */
  clarify?: boolean;
  /** True when the turn was stopped. Nothing from it was stored. */
  cancelled?: boolean;
  /**
   * The rows this turn was stored as, so the page can fold it into the
   * transcript at once — and rate, save or regenerate it — without a reload.
   * Null when nothing was persisted (a stateless turn, or a database outage).
   */
  user_message_id?: number | null;
  message_id?: number | null;
  /** The `query_history` row an analysis wrote; null for a discussion. */
  query_history_id?: number | null;
  /** The query the system actually ran, when it differs from what was typed. */
  effective_query?: string | null;
  /** A regenerate: the id of the answer this one replaces (kept, not overwritten). */
  regenerated_from?: number | null;
}

/**
 * Once the response is streaming the status is already 200, so a failure after
 * the first byte arrives as an `error` frame rather than an HTTP status. Only
 * a failure *before* the stream opens — 401, 404, 422, 429 — throws.
 */
export class ChatStreamError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "ChatStreamError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Waits before each resume attempt. Short first — most drops are a blip — then
 * long enough to ride out a proxy restart, and never so long that a reader
 * stares at "reconnecting" for the whole budget.
 */
export const RESUME_BACKOFF_MS = [500, 1500, 4000];

/**
 * Resume a turn the clarification gate paused. Same transport, same frames, same
 * terminal `done`; a different URL and a body carrying the reader's choice. The
 * gate does not run on this path, which is what caps clarification at one round.
 */
export async function streamClarifyAnswer(
  pendingId: number,
  body: { answers: string[]; skip?: boolean },
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return streamTo(`/api/chat/clarify/${pendingId}/answer`, body, handlers, signal);
}

export async function streamChat(
  body: { query: string; conversation_id?: number },
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return streamTo("/api/chat/stream", body, handlers, signal);
}

/**
 * A fresh answer to the conversation's latest question, streamed like any turn.
 * Only the latest answer can be regenerated; the server says 409 otherwise.
 */
export async function streamRegenerate(
  messageId: number,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return streamTo(`/api/chat/messages/${messageId}/regenerate`, {}, handlers, signal);
}

/** Ask the server to stop a turn. Resolves to whether there was one to stop. */
export async function cancelTurn(requestId: string): Promise<boolean> {
  const res = await fetch(`/api/chat/turns/${encodeURIComponent(requestId)}/cancel`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new ChatStreamError(`Could not stop (${res.status})`, res.status);
  const body = (await res.json()) as { cancelled?: boolean };
  return Boolean(body.cancelled);
}

/** What the reading loop has learned about the turn so far. */
interface TurnProgress {
  requestId: string | null;
  resumable: boolean;
  finished: boolean;
  seq: SeqTracker;
}

/**
 * The transport itself. One implementation for both entry points: the framing,
 * the chunk-boundary handling, the resume and the "no HTTP status once
 * streaming has begun" rule are identical, and a second copy would drift.
 */
async function streamTo(
  url: string,
  body: Record<string, unknown>,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const progress: TurnProgress = {
    requestId: null,
    resumable: false,
    finished: false,
    seq: new SeqTracker(),
  };

  const first = await open(url, { method: "POST", body }, signal);
  await consume(first, progress, handlers, signal);

  let attempt = 0;
  while (
    !progress.finished &&
    !signal?.aborted &&
    progress.requestId &&
    progress.resumable &&
    attempt < RESUME_BACKOFF_MS.length
  ) {
    handlers.onReconnecting?.(attempt + 1, RESUME_BACKOFF_MS.length);
    const waited = await pause(RESUME_BACKOFF_MS[attempt], signal);
    attempt += 1;
    if (!waited) break; // aborted while waiting: that is Stop, not a drop

    const before = progress.seq.last;
    let resumed: Response;
    try {
      resumed = await open(
        `/api/chat/turns/${encodeURIComponent(progress.requestId)}/events?after=${before}`,
        { method: "GET" },
        signal,
      );
    } catch (err) {
      // 404: the turn is not running, not mirrored, or expired — its answer, if
      // any, is in the transcript now. Nothing more to try.
      if (err instanceof ChatStreamError && err.status === 404) break;
      continue; // the network is still down: wait longer and try again
    }
    handlers.onReconnected?.();
    await consume(resumed, progress, handlers, signal);
    // A resume that delivered something earned a fresh set of attempts; one
    // that delivered nothing spends one.
    if (progress.seq.last > before) attempt = 0;
  }

  // An abort is the user leaving or pressing Stop, which is not a drop.
  if (!progress.finished && !signal?.aborted) handlers.onDropped?.();
}

async function open(
  url: string,
  init: { method: "GET" | "POST"; body?: Record<string, unknown> },
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch(url, {
    method: init.method,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...optionalAuthHeaders(),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal,
  });

  if (!res.ok) {
    const retryAfter = res.headers.get("retry-after");
    let detail = `Request failed (${res.status})`;
    try {
      const parsed = await res.json();
      if (typeof parsed?.detail === "string") detail = parsed.detail;
    } catch {
      /* not json */
    }
    throw new ChatStreamError(detail, res.status, retryAfter ? Number(retryAfter) : undefined);
  }
  if (!res.body) throw new ChatStreamError("The browser did not expose a stream body.", 0);
  return res;
}

/**
 * Read one response to its end, delivering each new frame. Never throws: a read
 * that fails mid-stream is a drop, and the caller decides whether to resume.
 */
async function consume(
  res: Response,
  progress: TurnProgress,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const reader = res.body!.getReader();
  // `stream: true` is what makes a multi-byte character split across two chunks
  // decode correctly instead of becoming two replacement characters.
  const decoder = new TextDecoder();
  const frames = new FrameBuffer();

  const deliver = (frame: SseFrame) => {
    if (!progress.seq.accept(frame)) return; // a replayed frame, already seen
    if (frame.event === "start") {
      progress.requestId = (frame.data.request_id as string | undefined) ?? progress.requestId;
      progress.resumable = Boolean(frame.data.resumable);
    }
    if (frame.event === "done") progress.finished = true;
    dispatch(frame, handlers);
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const frame of frames.push(decoder.decode(value, { stream: true }))) deliver(frame);
      if (progress.finished) return;
    }
    for (const frame of frames.push(decoder.decode())) deliver(frame);
    for (const frame of frames.flush()) deliver(frame);
  } catch {
    // A network error or an abort mid-read. Either way this response is over;
    // what happens next is the caller's decision, made with `signal` in hand.
    if (signal?.aborted) return;
  } finally {
    reader.releaseLock();
  }
}

/** Wait `ms`, or less if aborted. Resolves to false when it was aborted. */
function pause(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(false);
    const timer = setTimeout(() => resolve(true), ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve(false);
      },
      { once: true },
    );
  });
}

function dispatch(frame: SseFrame, handlers: StreamHandlers): void {
  const { event, data } = frame;
  if (event === "clarify") {
    handlers.onClarify?.(data as unknown as ClarifyPrompt);
    return;
  }
  if (event === "done") {
    handlers.onDone?.(data as unknown as DoneFrame);
    return;
  }
  if (event === "error") {
    handlers.onError?.(String(data.message ?? "Something went wrong."));
    return;
  }
  handlers.onEvent?.({ kind: event, ...data } as TraceEvent);
}
