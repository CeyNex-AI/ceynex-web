/**
 * Consuming `POST /api/chat/stream`.
 *
 * **`fetch` + a ReadableStream reader, not `EventSource`.** `EventSource` is
 * GET-only and cannot set an Authorization header, and this endpoint needs both
 * a JSON body and a bearer token. So the SSE framing is parsed by hand — which
 * is fine, because the format is three rules, but they have to be all three:
 *
 * 1. Frames are separated by a blank line (`\n\n`).
 * 2. A line starting `:` is a comment. The server sends one every 15s to keep
 *    nginx's 60s `proxy_read_timeout` from firing, and it must be ignored
 *    rather than parsed.
 * 3. A chunk boundary can fall anywhere, including mid-frame and mid-UTF-8
 *    character. Both are handled below; neither is hypothetical on a slow link.
 */

import { optionalAuthHeaders } from "./apiFetch";
import type { AnswerPayload, TraceEvent } from "../types/chat";

export interface StreamHandlers {
  /** Every trace event, in order. `kind` says what it is. */
  onEvent?: (event: TraceEvent) => void;
  /** The terminal frame. Carries the answer, the usage and whether it failed. */
  onDone?: (done: DoneFrame) => void;
  /** An in-band failure. Always followed by `done` — never a rejected promise. */
  onError?: (message: string) => void;
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

export async function streamChat(
  body: { query: string; conversation_id?: number },
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "content-type": "application/json", ...optionalAuthHeaders() },
    body: JSON.stringify(body),
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
    throw new ChatStreamError(
      detail,
      res.status,
      retryAfter ? Number(retryAfter) : undefined,
    );
  }

  if (!res.body) throw new ChatStreamError("The browser did not expose a stream body.", 0);

  const reader = res.body.getReader();
  // `stream: true` is what makes a multi-byte character split across two chunks
  // decode correctly instead of becoming two replacement characters.
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Everything up to the last blank line is complete frames; the remainder
      // is a partial frame that the next chunk finishes.
      let split = buffer.indexOf("\n\n");
      while (split !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        dispatch(frame, handlers);
        split = buffer.indexOf("\n\n");
      }
    }
    // A server that closes without a trailing blank line still has one frame
    // left in the buffer. Ours always sends one, but a proxy need not preserve it.
    if (buffer.trim()) dispatch(buffer, handlers);
  } finally {
    reader.releaseLock();
  }
}

function dispatch(frame: string, handlers: StreamHandlers): void {
  const trimmed = frame.trim();
  if (!trimmed || trimmed.startsWith(":")) return; // heartbeat

  let event = "message";
  const dataLines: string[] = [];
  for (const line of trimmed.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch {
    // A malformed frame is the server's bug, not a reason to tear down a stream
    // that is otherwise delivering. Skip it and keep reading.
    return;
  }

  if (event === "done") {
    handlers.onDone?.(payload as unknown as DoneFrame);
    return;
  }
  if (event === "error") {
    handlers.onError?.(String(payload.message ?? "Something went wrong."));
    return;
  }
  handlers.onEvent?.({ kind: event, ...payload } as TraceEvent);
}
