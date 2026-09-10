/**
 * Regenerated answers, grouped for display (backend `regenerated_from`).
 *
 * Regenerate never overwrites: the new answer is stored beside the one it
 * replaces, linked to it. So a transcript can hold several answers to one
 * question, and showing them as separate turns would read as the system
 * answering twice. Each question is shown once, with its answers as versions of
 * one reply — the latest by default, the others a click away.
 *
 * Pure, so the grouping is tested without rendering anything.
 */

import type { ChatMessage } from "../types/chat";

export interface TranscriptRow {
  /** A question, or the version of an answer shown by default (the latest). */
  message: ChatMessage;
  /** For an answer: every version, oldest first. Absent for a question. */
  versions?: ChatMessage[];
  /** Stable across new versions, so a switcher's state survives one arriving. */
  key: string;
}

/**
 * The rows to render: every question once, and every chain of answer versions
 * once, where its first version stood.
 */
export function groupVersions(messages: ChatMessage[]): TranscriptRow[] {
  const byId = new Map<number, ChatMessage>();
  for (const message of messages) if (message.id != null) byId.set(message.id, message);

  // The first version of the chain a message belongs to. Guarded against a
  // cycle, which the server cannot produce but a bad row should not hang on.
  const rootOf = (message: ChatMessage): ChatMessage => {
    let current = message;
    const seen = new Set<number>();
    while (current.regenerated_from != null) {
      const previous = byId.get(current.regenerated_from);
      if (!previous || seen.has(previous.id!)) break;
      seen.add(previous.id!);
      current = previous;
    }
    return current;
  };
  const rootKey = (message: ChatMessage) =>
    message.id != null ? `a${message.id}` : `s${message.seq}`;

  const chains = new Map<string, ChatMessage[]>();
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const key = rootKey(rootOf(message));
    chains.set(key, [...(chains.get(key) ?? []), message]);
  }

  const rows: TranscriptRow[] = [];
  const placed = new Set<string>();
  for (const message of messages) {
    if (message.role === "user") {
      rows.push({ message, key: `u${message.id ?? message.seq}` });
      continue;
    }
    const key = rootKey(rootOf(message));
    if (placed.has(key)) continue;
    placed.add(key);
    const versions = chains.get(key)!;
    rows.push({ message: versions[versions.length - 1], versions, key });
  }
  return rows;
}

/** Each question's latest answer only — what an export should contain. */
export function latestOnly(messages: ChatMessage[]): ChatMessage[] {
  return groupVersions(messages).map((row) => row.message);
}
