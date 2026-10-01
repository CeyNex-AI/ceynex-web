import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../types/chat";
import { conversationToMarkdown } from "./exportConversation";
import { COPYRIGHT_NOTICE, SITE_DISCLAIMER } from "./legal";

function message(seq: number, role: ChatMessage["role"], content: string): ChatMessage {
  return { seq, role, content, agents_used: [], route: [], sectors: [], unanswered: [], evidence: [] };
}

describe("conversationToMarkdown", () => {
  it("ends with the disclaimer and copyright, which the exported file carries without the app's footer", () => {
    const markdown = conversationToMarkdown("Tea", [
      message(1, "user", "How is tea doing?"),
      message(2, "assistant", "Tea exports rose."),
    ]);
    const tail = markdown.trimEnd().split("\n").slice(-3);
    expect(tail).toEqual([`*${SITE_DISCLAIMER}*`, "", `*${COPYRIGHT_NOTICE}*`]);
  });
});
