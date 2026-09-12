/**
 * Past chats (backend deviation D13, extending SRS 3.5.2's query history).
 *
 * Deliberately not a replacement for the History panel on the classic Query
 * page: that reads `query_history`, which every graph-running turn still writes.
 * This lists conversations, which are a new thing beside it.
 */

import { useState } from "react";
import { Button } from "./ui";
import type { ConversationSummary } from "../types/chat";

function groupLabel(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  if (days < 30) return "This month";
  return "Older";
}

export default function ConversationSidebar({
  conversations,
  activeId,
  loading,
  error,
  onSelect,
  onNew,
  onRename,
  onTogglePin,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: number | null;
  loading: boolean;
  error: string | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onRename: (id: number, title: string) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const [filter, setFilter] = useState("");
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const matching = conversations.filter((c) =>
    (c.title ?? "").toLowerCase().includes(filter.trim().toLowerCase()),
  );

  // Pinned first as one block, then by recency group. The server already sorts;
  // this only inserts the headings.
  const groups: { label: string; items: ConversationSummary[] }[] = [];
  for (const conversation of matching) {
    const label = conversation.pinned ? "Pinned" : groupLabel(conversation.updated_at);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(conversation);
    else groups.push({ label, items: [conversation] });
  }

  return (
    <nav aria-label="Past conversations" className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
      <Button onClick={onNew} className="w-full">
        New chat
      </Button>

      <label className="sr-only" htmlFor="conversation-filter">
        Filter conversations
      </label>
      <input
        id="conversation-filter"
        type="search"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Search chats"
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm
                   focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-teal-600"
      />

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && matching.length === 0 && (
        <p className="text-sm text-gray-500">
          {conversations.length === 0 ? "No chats yet." : "No chats match that."}
        </p>
      )}

      <div className="flex-1 overflow-y-auto space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1">
              {group.label}
            </h2>
            <ul className="space-y-0.5">
              {group.items.map((conversation) => (
                <li key={conversation.id}>
                  {renaming === conversation.id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (draft.trim()) onRename(conversation.id, draft.trim());
                        setRenaming(null);
                      }}
                    >
                      {/* Focus follows the click that opened this input; without
                          it a keyboard user has to hunt for the field they just
                          asked for. */}
                      <input
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={() => setRenaming(null)}
                        aria-label="Conversation name"
                        className="w-full border border-teal-500 rounded-md px-2 py-1 text-sm"
                      />
                    </form>
                  ) : (
                    <div
                      className={`group flex items-center gap-1 rounded-md px-2 py-1.5 ${
                        activeId === conversation.id ? "bg-teal-50" : "hover:bg-gray-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        aria-current={activeId === conversation.id ? "page" : undefined}
                        className="flex-1 min-w-0 text-left text-sm text-gray-700 truncate
                                   focus-visible:outline-2 focus-visible:outline-offset-2
                                   focus-visible:outline-teal-600 rounded"
                      >
                        {conversation.title ?? "Untitled chat"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePin(conversation.id, !conversation.pinned)}
                        aria-pressed={conversation.pinned}
                        aria-label={`${conversation.pinned ? "Unpin" : "Pin"} ${
                          conversation.title ?? "this chat"
                        }`}
                        className="text-xs text-gray-500 hover:text-teal-700 px-1
                                   focus-visible:outline-2 focus-visible:outline-offset-2
                                   focus-visible:outline-teal-600 rounded"
                      >
                        {conversation.pinned ? "★" : "☆"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenaming(conversation.id);
                          setDraft(conversation.title ?? "");
                        }}
                        aria-label={`Rename ${conversation.title ?? "this chat"}`}
                        className="text-xs text-gray-500 hover:text-gray-700 px-1
                                   opacity-0 group-hover:opacity-100 focus:opacity-100
                                   focus-visible:outline-2 focus-visible:outline-offset-2
                                   focus-visible:outline-teal-600 rounded"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(conversation.id)}
                        aria-label={`Delete ${conversation.title ?? "this chat"}`}
                        className="text-xs text-gray-500 hover:text-red-600 px-1
                                   opacity-0 group-hover:opacity-100 focus:opacity-100
                                   focus-visible:outline-2 focus-visible:outline-offset-2
                                   focus-visible:outline-teal-600 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
