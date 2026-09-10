/**
 * A conversation as Markdown, with an evidence appendix (execution plan §7).
 *
 * Built entirely from data already loaded — no endpoint, no round trip. The
 * appendix is the point: a transcript without its sources is a chat log, and the
 * whole claim of this project is that every figure traces to one.
 */

import type { ChatMessage } from "../types/chat";
import { latestOnly } from "./versions";

/**
 * Each question with its latest answer only: an export is a document, and a
 * document with two answers to one question reads as the system contradicting
 * itself. The earlier versions stay in the conversation, a click away.
 */
export function conversationToMarkdown(title: string | null, messages: ChatMessage[]): string {
  const lines: string[] = [`# ${title || "CeyNex conversation"}`, ""];
  const sources: { label: string; detail: string; url?: string }[] = [];

  for (const message of latestOnly(messages)) {
    if (message.role === "user") {
      lines.push(`## ${message.content}`, "");
      continue;
    }
    lines.push(message.content, "");

    if (message.confidence !== null && message.confidence !== undefined) {
      const band = message.confidence_band ? ` (${message.confidence_band})` : "";
      lines.push(`*Confidence: ${Math.round(message.confidence * 100)}%${band}*`, "");
    }
    if (message.unanswered?.length) {
      lines.push(`*Not answered: ${message.unanswered.join("; ")}*`, "");
    }
    for (const item of message.evidence ?? []) {
      const index = sources.length + 1;
      sources.push({
        label: `[${index}] ${item.source_id} — ${item.claim}`,
        detail: item.detail,
        url: item.url,
      });
    }
  }

  if (sources.length) {
    lines.push("---", "", "## Evidence", "");
    for (const source of sources) {
      lines.push(`- **${source.label}**`);
      if (source.url) lines.push(`  - ${source.url}`);
      // Fenced, because a Cypher query containing a pipe or an underscore would
      // otherwise be mangled by the Markdown renderer reading this back.
      if (source.detail) lines.push("", "  ```", `  ${source.detail}`, "  ```", "");
    }
  }

  return lines.join("\n");
}
