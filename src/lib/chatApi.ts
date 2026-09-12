/**
 * The conversation REST surface (backend deviation D13).
 *
 * Streaming a turn lives in `streamChat.ts` — it is a different transport with
 * different failure modes, and folding it in here would hide that.
 *
 * Every call is authenticated: a conversation is addressed by a serial id, so
 * the backend requires a signed-in owner on all of these. `/api/query` and an
 * anonymous `/api/chat/stream` remain open, which is why `apiJson` keeps both
 * an `auth` and an `optionalAuth` mode.
 */

import { apiJson } from "./apiFetch";
import type { ConversationDetail, ConversationSummary, TraceEvent } from "../types/chat";

export function fetchConversations(options?: {
  includeArchived?: boolean;
}): Promise<ConversationSummary[]> {
  const query = options?.includeArchived ? "?include_archived=true" : "";
  return apiJson<ConversationSummary[]>(`/api/chat/conversations${query}`, { auth: true });
}

export function createConversation(title?: string): Promise<ConversationSummary> {
  return apiJson<ConversationSummary>("/api/chat/conversations", {
    method: "POST",
    body: { title: title ?? null },
    auth: true,
  });
}

export function fetchConversation(id: number): Promise<ConversationDetail> {
  return apiJson<ConversationDetail>(`/api/chat/conversations/${id}`, { auth: true });
}

/** Rename, pin or archive. Only the fields passed are changed. */
export function patchConversation(
  id: number,
  changes: { title?: string; pinned?: boolean; archived?: boolean },
): Promise<ConversationSummary> {
  return apiJson<ConversationSummary>(`/api/chat/conversations/${id}`, {
    method: "PATCH",
    body: changes,
    auth: true,
  });
}

export function deleteConversation(id: number): Promise<void> {
  return apiJson<void>(`/api/chat/conversations/${id}`, { method: "DELETE", auth: true });
}

/**
 * The stored trace for one past turn, so reopening a conversation replays what
 * actually happened rather than a summary of it.
 */
export function fetchTrace(conversationId: number, requestId: string): Promise<TraceEvent[]> {
  return apiJson<TraceEvent[]>(
    `/api/chat/conversations/${conversationId}/trace/${requestId}`,
    { auth: true },
  );
}

/** Mint or revoke a read-only link to a finished conversation (§5). */
export function shareConversation(
  conversationId: number,
  shared: boolean,
): Promise<{ shared: boolean; token: string | null }> {
  return apiJson(`/api/chat/conversations/${conversationId}/share`, {
    method: "POST",
    auth: true,
    body: { shared },
  });
}
