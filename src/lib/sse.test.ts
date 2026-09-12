import { describe, expect, it } from "vitest";
import { FrameBuffer, SeqTracker, parseFrame, type SseFrame } from "./sse";

/** A stream shaped like the real one: numbered, with heartbeats between. */
function wire(): string {
  const frames = [
    { event: "start", data: { query: "cinnamon — Kandy 茶 café", request_id: "r1", resumable: true } },
    { event: "kg_query", data: { cypher: "MATCH (n)\nRETURN n", row_count: 14 } },
    { event: "answer_delta", data: { text: "Exports rose 12%.", index: 0 } },
    { event: "done", data: { failed: false, answer: { answer: "Exports rose 12%." } } },
  ];
  return frames
    .map((frame, i) => `id: ${i + 1}\nevent: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`)
    .join(": heartbeat\n\n");
}

/** Feed `bytes` to a decoder in chunks of `size`, as a slow link would. */
function readInChunks(bytes: Uint8Array, size: number): SseFrame[] {
  const decoder = new TextDecoder();
  const buffer = new FrameBuffer();
  const frames: SseFrame[] = [];
  for (let offset = 0; offset < bytes.length; offset += size) {
    frames.push(...buffer.push(decoder.decode(bytes.slice(offset, offset + size), { stream: true })));
  }
  frames.push(...buffer.push(decoder.decode()));
  frames.push(...buffer.flush());
  return frames;
}

describe("FrameBuffer", () => {
  it("produces identical frames at every chunk boundary, 1 byte upward", () => {
    // The fuzz that used to be run by hand, now committed: a boundary inside a
    // frame, inside a heartbeat, or inside a multi-byte character must never
    // change what is delivered.
    const bytes = new TextEncoder().encode(wire());
    const whole = readInChunks(bytes, bytes.length);
    expect(whole.map((f) => f.event)).toEqual(["start", "kg_query", "answer_delta", "done"]);
    for (let size = 1; size <= 64; size++) {
      expect(readInChunks(bytes, size), `chunk size ${size}`).toEqual(whole);
    }
  });

  it("keeps multi-byte text and escaped newlines intact", () => {
    const [start, kg] = readInChunks(new TextEncoder().encode(wire()), 3);
    expect(start.data.query).toBe("cinnamon — Kandy 茶 café");
    expect(kg.data.cypher).toBe("MATCH (n)\nRETURN n");
  });

  it("delivers a final frame that arrives without its blank line", () => {
    const buffer = new FrameBuffer();
    expect(buffer.push('id: 9\nevent: done\ndata: {"failed":false}')).toEqual([]);
    expect(buffer.flush()).toEqual([{ id: 9, event: "done", data: { failed: false } }]);
  });
});

describe("parseFrame", () => {
  it("reads the frame number", () => {
    expect(parseFrame('id: 42\nevent: merge\ndata: {"x":1}')).toEqual({
      id: 42,
      event: "merge",
      data: { x: 1 },
    });
  });

  it("ignores heartbeats, empty blocks and malformed JSON", () => {
    expect(parseFrame(": heartbeat")).toBeNull();
    expect(parseFrame("")).toBeNull();
    expect(parseFrame("event: x\ndata: {not json")).toBeNull();
  });

  it("accepts a frame with no number", () => {
    expect(parseFrame('event: done\ndata: {"failed":true}')).toEqual({
      id: undefined,
      event: "done",
      data: { failed: true },
    });
  });
});

describe("SeqTracker", () => {
  it("delivers each numbered frame once, whatever a resume replays", () => {
    const seen = new SeqTracker();
    const frame = (id: number): SseFrame => ({ id, event: "e", data: {} });

    const first = [1, 2, 3].map(frame).filter((f) => seen.accept(f));
    // The connection drops with frame 4 in flight; the resume sends 3 onward.
    const resumed = [3, 4, 5].map(frame).filter((f) => seen.accept(f));

    expect(first.map((f) => f.id)).toEqual([1, 2, 3]);
    expect(resumed.map((f) => f.id)).toEqual([4, 5]);
    expect(seen.last).toBe(5);
  });
});
