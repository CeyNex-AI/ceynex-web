import { describe, expect, it } from "vitest";
import { foldTurn, nextSeq } from "./transcript";
import type { DoneFrame } from "./streamChat";
import type { AnswerPayload, ChatMessage } from "../types/chat";

const ANSWER: AnswerPayload = {
  answer: "Cinnamon exports rose.",
  confidence: 0.72,
  confidence_band: "High",
  agents_used: ["export_analytics"],
  evidence: [{ source_id: "KG", claim: "c", detail: "MATCH (n) RETURN n", period: "2024" }],
  degraded: false,
  route: ["export_analytics"],
  sectors: ["agriculture"],
  unanswered: [],
  confidence_breakdown: { weighted: 0.7, staleness: 0, dq: 0, coverage: 0.02, final: 0.72 },
};

const DONE: DoneFrame = {
  failed: false,
  request_id: "req-1",
  user_message_id: 11,
  message_id: 12,
  query_history_id: 4001,
  usage: { calls: 2, cache_hits: 0, tokens_in: 100, tokens_out: 50, cost_usd: 0.001 },
  answer: ANSWER,
};

const TURN = { key: "t1", question: "now do rubber", mode: "analyse" as const };

describe("foldTurn", () => {
  it("turns a finished turn into the two rows a reload would show", () => {
    const [user, assistant] = foldTurn(TURN, DONE, []);
    expect(user).toMatchObject({ id: 11, seq: 1, role: "user", content: "now do rubber" });
    expect(assistant).toMatchObject({
      id: 12,
      seq: 2,
      role: "assistant",
      content: "Cinnamon exports rose.",
      request_id: "req-1",
      query_history_id: 4001,
      confidence_breakdown: ANSWER.confidence_breakdown,
    });
  });

  it("keeps the reader's words and records what ran beside them", () => {
    const [user] = foldTurn(TURN, { ...DONE, effective_query: "Rubber export trends?" }, []);
    expect(user.content).toBe("now do rubber");
    expect(user.effective_query).toBe("Rubber export trends?");
  });

  it("places the turn after the transcript already on screen", () => {
    const existing = foldTurn({ ...TURN, key: "t0" }, DONE, []);
    const [user, assistant] = foldTurn(TURN, DONE, existing);
    expect([user.seq, assistant.seq]).toEqual([3, 4]);
  });

  it("carries the live turn's key so its news stays beside it", () => {
    const rows = foldTurn(TURN, DONE, []);
    expect(rows.map((row) => row.client_key)).toEqual(["t1", "t1"]);
  });

  it("offers nothing to rate or save when the server stored nothing", () => {
    const [user, assistant] = foldTurn(
      TURN,
      { ...DONE, user_message_id: null, message_id: null, query_history_id: null },
      [],
    );
    expect(user.id).toBeNull();
    expect(assistant.id).toBeNull();
    expect(assistant.query_history_id).toBeNull();
  });

  it.each([
    ["a failed turn", { ...DONE, failed: true }],
    ["a turn that ended in a clarifying question", { ...DONE, clarify: true }],
    ["a frame with no answer", { ...DONE, answer: undefined }],
  ])("folds nothing for %s", (_label, frame) => {
    expect(foldTurn(TURN, frame as DoneFrame, [])).toEqual([]);
  });
});

describe("nextSeq", () => {
  it("starts at 1 and follows the highest seq, not the count", () => {
    expect(nextSeq([])).toBe(1);
    const gappy = [{ seq: 1 }, { seq: 5 }] as ChatMessage[];
    expect(nextSeq(gappy)).toBe(6);
  });
});
