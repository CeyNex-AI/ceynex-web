/**
 * The conversational surface (backend deviation D12/D13).
 *
 * Mounted at `/query`, with the original single-shot form kept as a documented
 * "classic mode" toggle — the SRS §3.9.1 page/requirement cross-index names a
 * Main Query page, and the 30-question evaluation targets that shape, so it has
 * to stay demonstrably present rather than be quietly replaced.
 *
 * **Always behind `RequireAuth`.** The backend will answer `/api/chat/stream`
 * anonymously for a stateless turn — a documented deferred-scope decision that
 * keeps the endpoint demonstrable — but SRS 3.1.11 requires "account based
 * authentication for all users prior to query submission", so the page does not
 * offer that path. The `userId` guards below are therefore belt to that braces,
 * not a second entry point.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AssistantTurn, UserTurn } from "../components/ChatMessage";
import ConversationSidebar from "../components/ConversationSidebar";
import { Button, ErrorBanner } from "../components/ui";
import {
  createConversation,
  deleteConversation,
  fetchConversation,
  fetchConversations,
  patchConversation,
} from "../lib/chatApi";
import { ChatStreamError, streamChat } from "../lib/streamChat";
import { useAuth } from "../lib/useAuth";
import usePageTitle from "../lib/usePageTitle";
import type {
  AnswerPayload,
  ChatMessage,
  ConversationSummary,
  TraceEvent,
  UsageSummary,
} from "../types/chat";

const EXAMPLES = [
  "What is the current price trend for cinnamon?",
  "Which markets took the most Sri Lankan apparel last year?",
  "How would losing GSP+ affect apparel export revenue?",
];

/** A turn being streamed right now, before it becomes a stored message. */
interface LiveTurn {
  question: string;
  events: TraceEvent[];
  answer?: AnswerPayload;
  usage?: UsageSummary;
  mode?: string | null;
  error?: string;
  done: boolean;
}

export default function Chat() {
  usePageTitle("Chat");
  const { userId } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [live, setLive] = useState<LiveTurn | null>(null);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  const streaming = live !== null && !live.done;

  /**
   * Promise-chain rather than async/await, matching `Query.tsx::reloadHistory`.
   * The shape is load-bearing: an `async` function whose first statement is a
   * `setState` runs it synchronously inside the effect, which cascades renders
   * (`react-hooks/set-state-in-effect`). Every update here lands in a callback.
   */
  const reloadConversations = useCallback((): Promise<void> => {
    if (!userId) return Promise.resolve();
    return fetchConversations()
      .then((loaded) => {
        setConversations(loaded);
        setConversationsError(null);
      })
      .catch((err: unknown) => {
        // Not silent, unlike the History panel's failures: an empty sidebar
        // reads as "your chats are gone", which is a worse lie than an error.
        setConversationsError(err instanceof Error ? err.message : "Could not load chats.");
      })
      .finally(() => setConversationsLoading(false));
  }, [userId]);

  useEffect(() => {
    void reloadConversations();
  }, [reloadConversations]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, live?.events.length, live?.done]);

  async function openConversation(id: number) {
    setActiveId(id);
    setLive(null);
    setError(null);
    try {
      const detail = await fetchConversation(id);
      setMessages(detail.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open that chat.");
      setMessages([]);
    }
  }

  function startNew() {
    abort.current?.abort();
    setActiveId(null);
    setMessages([]);
    setLive(null);
    setError(null);
  }

  async function submit(asked: string) {
    if (!asked.trim() || streaming) return;
    setError(null);
    setQuestion("");

    // A signed-in user gets a conversation created on the first turn, so the
    // transcript has somewhere to live before the answer arrives.
    let conversationId = activeId;
    if (userId && conversationId === null) {
      try {
        const created = await createConversation();
        conversationId = created.id;
        setActiveId(created.id);
        setConversations((current) => [created, ...current]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start a chat.");
        return;
      }
    }

    const controller = new AbortController();
    abort.current = controller;
    setLive({ question: asked, events: [], done: false });

    try {
      await streamChat(
        { query: asked, ...(conversationId ? { conversation_id: conversationId } : {}) },
        {
          onEvent: (event) =>
            setLive((current) =>
              current
                ? {
                    ...current,
                    events: [...current.events, event],
                    mode: event.kind === "turn" ? event.mode : current.mode,
                  }
                : current,
            ),
          onError: (message) =>
            setLive((current) => (current ? { ...current, error: message } : current)),
          onDone: (frame) =>
            setLive((current) =>
              current
                ? { ...current, answer: frame.answer, usage: frame.usage, done: true }
                : current,
            ),
        },
        controller.signal,
      );
      // The title is generated server-side after the first turn, so the sidebar
      // only learns it on a reload.
      if (conversationId) void reloadConversations();
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof ChatStreamError
          ? err.retryAfterSeconds
            ? `${err.message} (retry in ${err.retryAfterSeconds}s)`
            : err.message
          : "Couldn't reach the chat service. Try again in a moment.";
      setError(message);
      setLive(null);
    } finally {
      abort.current = null;
    }
  }

  function stop() {
    abort.current?.abort();
    setLive((current) => (current ? { ...current, done: true } : current));
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {userId && (
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          loading={conversationsLoading}
          error={conversationsError}
          onSelect={(id) => void openConversation(id)}
          onNew={startNew}
          onRename={(id, title) => {
            void patchConversation(id, { title }).then(reloadConversations);
          }}
          onTogglePin={(id, pinned) => {
            void patchConversation(id, { pinned }).then(reloadConversations);
          }}
          onDelete={(id) => {
            void deleteConversation(id).then(() => {
              if (activeId === id) startNew();
              return reloadConversations();
            });
          }}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {messages.length === 0 && !live && (
          <div className="space-y-3">
            <h1 className="text-lg font-semibold text-gray-900">
              Ask about Sri Lanka&apos;s export economy
            </h1>
            <p className="text-sm text-gray-500">
              Every figure is traced to the query that produced it. Open the steps beside an
              answer to see the Cypher, the dataset read and what the model cost.
            </p>
            <ul className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => void submit(example)}
                    className="text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full
                               px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2
                               focus-visible:outline-teal-600"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="space-y-6">
          {messages.map((message) =>
            message.role === "user" ? (
              <UserTurn key={message.seq} content={message.content} />
            ) : (
              <AssistantTurn
                key={message.seq}
                graphKey={`${activeId}-${message.seq}`}
                mode={message.mode}
                events={[]}
                running={false}
                usage={message.usage ?? undefined}
                answer={{
                  answer: message.content,
                  confidence: message.confidence ?? null,
                  confidence_band: message.confidence_band ?? null,
                  agents_used: message.agents_used,
                  evidence: message.evidence,
                  forecast: message.forecast,
                  graph: message.graph,
                  degraded: message.degraded ?? false,
                  route: message.route,
                  sectors: message.sectors,
                  unanswered: message.unanswered,
                  elapsed_ms: message.elapsed_ms,
                }}
              />
            ),
          )}

          {live && (
            <>
              <UserTurn content={live.question} />
              <AssistantTurn
                graphKey={`live-${live.events.length}`}
                events={live.events}
                running={!live.done}
                answer={live.answer}
                usage={live.usage}
                mode={live.mode}
                error={live.error}
              />
            </>
          )}
        </ol>
        <div ref={bottom} />

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(question);
          }}
          className="sticky bottom-0 bg-gray-50 pt-2 pb-4 flex gap-2"
        >
          <label className="sr-only" htmlFor="chat-question">
            Your question
          </label>
          <input
            id="chat-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={messages.length ? "Ask a follow-up…" : "Ask a question…"}
            disabled={streaming}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white
                       disabled:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-teal-600"
          />
          {streaming ? (
            <Button variant="secondary" onClick={stop}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!question.trim()}>
              Ask
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
