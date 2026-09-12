import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESUME_BACKOFF_MS, streamChat, type DoneFrame, type StreamHandlers } from "./streamChat";
import type { TraceEvent } from "../types/chat";

const frame = (id: number, event: string, data: Record<string, unknown>) =>
  `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const START = frame(1, "start", { request_id: "r1", resumable: true, query: "q" });
const KG = frame(2, "kg_query", { cypher: "MATCH (n)", row_count: 1 });
const MERGE = frame(3, "merge", { confidence: 0.7 });
const DONE = frame(4, "done", { failed: false, answer: { answer: "A." } });

/**
 * A response whose body delivers `chunks`, then either ends or drops.
 *
 * One chunk per pull, and the error only after the last: erroring a stream
 * discards whatever is still queued (Streams spec), so a double that errors
 * straight away would drop the very frames a real connection delivered first.
 */
function streamed(chunks: string[], drop = false): Response {
  const encoder = new TextEncoder();
  const pending = [...chunks];
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = pending.shift();
      if (next !== undefined) controller.enqueue(encoder.encode(next));
      else if (drop) controller.error(new TypeError("network error"));
      else controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

function recorder() {
  const seen: string[] = [];
  const dones: DoneFrame[] = [];
  const reconnects: number[] = [];
  let dropped = 0;
  const handlers: StreamHandlers = {
    onEvent: (event: TraceEvent) => seen.push(event.kind),
    onDone: (done) => {
      seen.push("done");
      dones.push(done);
    },
    onReconnecting: (attempt) => reconnects.push(attempt),
    onDropped: () => {
      dropped += 1;
    },
  };
  return { handlers, seen, dones, reconnects, dropped: () => dropped };
}

beforeEach(() => {
  vi.useFakeTimers();
  const store = new Map<string, string>([["ceynex_token", "t0ken"]]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function run(handlers: StreamHandlers, signal?: AbortSignal) {
  const done = streamChat({ query: "q" }, handlers, signal);
  // Let the backoff timers fire as they are scheduled.
  for (let i = 0; i < 20; i++) await vi.advanceTimersByTimeAsync(RESUME_BACKOFF_MS.at(-1)!);
  await done;
}

describe("streamChat resume", () => {
  it("resumes a dropped turn after the last frame and delivers each frame once", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamed([START, KG], true)) // drops after frame 2
      .mockResolvedValueOnce(streamed([KG, MERGE, DONE])); // resume replays 2
    vi.stubGlobal("fetch", fetchMock);
    const r = recorder();

    await run(r.handlers);

    expect(fetchMock.mock.calls[1][0]).toBe("/api/chat/turns/r1/events?after=2");
    expect(fetchMock.mock.calls[1][1].method).toBe("GET");
    expect(r.seen).toEqual(["start", "kg_query", "merge", "done"]);
    expect(r.reconnects).toEqual([1]);
    expect(r.dropped()).toBe(0);
  });

  it("reports a drop only after every resume attempt has failed", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(streamed([START], true));
    for (let i = 0; i < RESUME_BACKOFF_MS.length; i++) {
      fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    }
    vi.stubGlobal("fetch", fetchMock);
    const r = recorder();

    await run(r.handlers);

    expect(r.reconnects).toEqual([1, 2, 3]);
    expect(r.dropped()).toBe(1);
  });

  it("stops trying when the server says the turn is gone", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamed([START], true))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "turn not found" }), {
        status: 404,
      }));
    vi.stubGlobal("fetch", fetchMock);
    const r = recorder();

    await run(r.handlers);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r.dropped()).toBe(1);
  });

  it("never resumes a turn the server said cannot be resumed", async () => {
    const anonymousStart = frame(1, "start", { request_id: "r1", resumable: false });
    const fetchMock = vi.fn().mockResolvedValueOnce(streamed([anonymousStart], true));
    vi.stubGlobal("fetch", fetchMock);
    const r = recorder();

    await run(r.handlers);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.reconnects).toEqual([]);
    expect(r.dropped()).toBe(1);
  });

  it("treats an abort as the reader leaving, not a drop", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      controller.abort();
      return streamed([START], true);
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = recorder();

    await run(r.handlers, controller.signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.dropped()).toBe(0);
  });

  it("does not resume a turn that finished", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(streamed([START, KG, MERGE, DONE]));
    vi.stubGlobal("fetch", fetchMock);
    const r = recorder();

    await run(r.handlers);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.dones).toHaveLength(1);
    expect(r.dropped()).toBe(0);
  });
});
