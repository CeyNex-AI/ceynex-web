import { describe, expect, it } from "vitest";
import { groupVersions, latestOnly } from "./versions";
import type { ChatMessage } from "../types/chat";

function message(id: number, seq: number, role: "user" | "assistant", extra: Partial<ChatMessage> = {}) {
  return {
    id,
    seq,
    role,
    content: `${role}-${id}`,
    agents_used: [],
    route: [],
    sectors: [],
    unanswered: [],
    evidence: [],
    ...extra,
  } as ChatMessage;
}

describe("groupVersions", () => {
  it("shows a plain transcript unchanged", () => {
    const rows = groupVersions([message(1, 1, "user"), message(2, 2, "assistant")]);
    expect(rows.map((row) => row.message.id)).toEqual([1, 2]);
    expect(rows[1].versions?.map((m) => m.id)).toEqual([2]);
  });

  it("shows a regenerated answer once, as its latest version", () => {
    const rows = groupVersions([
      message(1, 1, "user"),
      message(2, 2, "assistant"),
      message(3, 3, "assistant", { regenerated_from: 2 }),
      message(4, 4, "assistant", { regenerated_from: 3 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1].message.id).toBe(4);
    expect(rows[1].versions?.map((m) => m.id)).toEqual([2, 3, 4]);
  });

  it("keeps a chain where its first version stood when the conversation continues", () => {
    const rows = groupVersions([
      message(1, 1, "user"),
      message(2, 2, "assistant"),
      message(3, 3, "assistant", { regenerated_from: 2 }),
      message(4, 4, "user"),
      message(5, 5, "assistant"),
    ]);
    expect(rows.map((row) => row.message.id)).toEqual([1, 3, 4, 5]);
  });

  it("keys a chain by its first version, so a new version keeps its place", () => {
    const before = groupVersions([message(1, 1, "user"), message(2, 2, "assistant")]);
    const after = groupVersions([
      message(1, 1, "user"),
      message(2, 2, "assistant"),
      message(3, 3, "assistant", { regenerated_from: 2 }),
    ]);
    expect(after[1].key).toBe(before[1].key);
  });

  it("does not hang on a malformed cycle", () => {
    const rows = groupVersions([
      message(1, 1, "user"),
      message(2, 2, "assistant", { regenerated_from: 3 }),
      message(3, 3, "assistant", { regenerated_from: 2 }),
    ]);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("latestOnly", () => {
  it("exports each question with only its latest answer", () => {
    const latest = latestOnly([
      message(1, 1, "user"),
      message(2, 2, "assistant"),
      message(3, 3, "assistant", { regenerated_from: 2 }),
    ]);
    expect(latest.map((m) => m.id)).toEqual([1, 3]);
  });
});
