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

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AssistantTurn, UserTurn } from "../components/ChatMessage";
import ClarifyCard from "../components/ClarifyCard";
import FreshnessRibbon from "../components/FreshnessRibbon";
import type { ClarifyPrompt } from "../components/ClarifyCard";
import ConversationSidebar from "../components/ConversationSidebar";
import { Button, ErrorBanner } from "../components/ui";
import {
  createConversation,
  deleteConversation,
  fetchConversation,
  fetchConversations,
  fetchTrace,
  patchConversation,
  shareConversation,
} from "../lib/chatApi";
import { fetchNewsSearch } from "../lib/newsApi";
import type { NewsArticle, NewsSource } from "../lib/newsApi";
import { conversationToMarkdown } from "../lib/exportConversation";
import {
  ChatStreamError,
  cancelTurn,
  streamChat,
  streamClarifyAnswer,
  streamRegenerate,
} from "../lib/streamChat";
import type { DoneFrame } from "../lib/streamChat";
import { foldTurn } from "../lib/transcript";
import { groupVersions, type TranscriptRow } from "../lib/versions";
import type { FinishedTurn } from "../lib/transcript";
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
  /** Client-only; carried onto the folded messages so the turn's news follows. */
  key: string;
  question: string;
  events: TraceEvent[];
  answer?: AnswerPayload;
  usage?: UsageSummary;
  mode?: string | null;
  error?: string;
  /**
   * The stream ended without its terminal frame. Held apart from `error`: the
   * server never said the turn failed, so the honest words are "we stopped
   * hearing", not "it failed" — and the answer may already have been produced
   * and charged for.
   */
  dropped?: boolean;
  /** The gate asked one question back instead of answering. Not a failure. */
  clarify?: ClarifyPrompt;
  /**
   * How the turn stopped. `"cancelled"`: the server confirmed it, and nothing
   * was stored. `"detached"`: the stop request never reached the server, so we
   * only stopped listening — a signed-in turn runs on and will be stored.
   */
  stopped?: "cancelled" | "detached";
  /** Stop was pressed and the server has not yet answered with `done`. */
  stopping?: boolean;
  /** The connection dropped and a resume is under way. */
  reconnecting?: { attempt: number; of: number } | null;
  /** The answer so far — whole, grounded sentences as the server released them. */
  draft?: string;
  /** A draft was withdrawn, and why ("ungrounded" | "degraded"). */
  withdrawn?: string | null;
  /** A regenerate: the id of the answer being replaced, hidden while it streams. */
  regenerating?: number | null;
  done: boolean;
}

/**
 * Related coverage, fetched beside a turn rather than carried by it, and keyed
 * by that turn — so a slow response for turn N lands on turn N even after N+1
 * has started, and survives the turn being folded into the transcript.
 *
 * News is not evidence (see NewsPanel) and is not persisted with the message,
 * so a reloaded transcript shows none — deliberately: headlines chosen for
 * today would be stale beside an analysis from last week, and presenting them
 * as though they accompanied it would be a claim we cannot support.
 */
interface TurnNews {
  articles: NewsArticle[] | null;
  source: NewsSource | null;
  loading: boolean;
}

/** The turn in progress, as the stream handlers accumulate it. */
interface TurnInProgress extends FinishedTurn {
  events: TraceEvent[];
  /** From the `start` frame — what Stop names when it asks the server to stop. */
  requestId?: string;
  /** Stop was pressed before `start` named the turn; sent the moment it does. */
  stopRequested?: boolean;
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
  const [news, setNews] = useState<Record<string, TurnNews>>({});
  /**
   * One polite announcement for a screen reader when something happens to the
   * answer — it is ready, or a draft was withdrawn — rather than a live region
   * over the growing draft, which would re-read it sentence by sentence.
   */
  const [announcement, setAnnouncement] = useState("");
  /**
   * The turn being streamed, accumulated outside React state so the `done`
   * handler can fold it into the transcript in one step. Kept in a ref rather
   * than read back from `live`, whose latest render the handler cannot see.
   */
  const inProgress = useRef<TurnInProgress | null>(null);
  const turnCounter = useRef(0);

  /**
   * Persisted traces, fetched on demand and keyed by `request_id`. A stored
   * turn arrives from the transcript without its steps — they live in
   * `chat_trace_event` and are a separate, sometimes large, read — so they are
   * fetched only when a reader actually opens one. `null` means "in flight".
   */
  const [traces, setTraces] = useState<Record<string, TraceEvent[] | null>>({});

  const loadTrace = useCallback(
    (conversationId: number, requestId: string) => {
      setTraces((current) => (requestId in current ? current : { ...current, [requestId]: null }));
      fetchTrace(conversationId, requestId)
        .then((events) => setTraces((current) => ({ ...current, [requestId]: events })))
        // A trace that will not load is not worth an error banner beside a
        // perfectly good answer; the row simply reports nothing recorded.
        .catch(() => setTraces((current) => ({ ...current, [requestId]: [] })));
    },
    [],
  );
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
    // Smooth scrolling is motion, and the reduced-motion preference covers it.
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    bottom.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [messages.length, live?.events.length, live?.done]);

  async function openConversation(id: number) {
    setActiveId(id);
    setLive(null);
    inProgress.current = null;
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
    inProgress.current = null;
    setError(null);
  }

  /**
   * Fired beside a turn that actually runs the graph, never awaited before it —
   * the same posture as `Query.tsx::handleSubmit`, whose comment explains why
   * (the orchestrator takes seconds; news must neither queue behind it nor
   * delay it). Failures are swallowed rather than shown: the red banner means
   * "the turn failed", and a missing news panel is not that.
   *
   * Keyed by turn, which is what replaced the old sequence guard: a slow
   * response for turn N can only ever land on turn N.
   */
  function loadNews(asked: string, turnKey: string) {
    // `/api/news/search` needs three characters. Below that there is nothing to
    // search for, and asking anyway turned its 422 into "news is unavailable".
    if (asked.trim().length < 3) return;
    setNews((current) => ({
      ...current,
      [turnKey]: { articles: null, source: null, loading: true },
    }));
    fetchNewsSearch(asked)
      .then((result) =>
        setNews((current) => ({
          ...current,
          [turnKey]: { articles: result.articles, source: result.source, loading: false },
        })),
      )
      .catch(() =>
        setNews((current) => ({
          ...current,
          [turnKey]: { articles: [], source: "unavailable", loading: false },
        })),
      );
  }

  /**
   * The handler set is identical for a fresh turn and for a resumed one — the
   * clarify route streams the same frames — so it is built once rather than
   * written twice and allowed to drift.
   */
  function handlers() {
    return {
      onEvent: (event: TraceEvent) => {
        const turn = inProgress.current;
        if (!turn) return;
        if (event.kind === "answer_delta") {
          // The answer itself, not a step: it goes to the draft, never the trace.
          const text = event.text ?? "";
          setLive((current) =>
            current ? { ...current, draft: (current.draft ?? "") + text } : current,
          );
          return;
        }
        if (event.kind === "answer_reset") {
          // A retry clears the draft quietly — the trace row says why. A
          // withdrawal is told to the reader, beside the answer that replaces it.
          const reason = event.reason === "retry" ? null : (event.reason ?? "ungrounded");
          if (reason) {
            turn.withdrawn = reason;
            setAnnouncement("A draft of the answer was withdrawn.");
          }
          setLive((current) =>
            current
              ? { ...current, draft: "", withdrawn: reason ?? current.withdrawn ?? null }
              : current,
          );
        }
        if (event.kind === "start" && typeof event.request_id === "string") {
          turn.requestId = event.request_id;
          if (turn.stopRequested) void requestStop(event.request_id);
        }
        turn.events.push(event);
        if (event.kind === "turn") {
          turn.mode = event.mode ?? turn.mode;
          if (event.mode === "analyse") loadNews(event.standalone_query || turn.question, turn.key);
        }
        const events = [...turn.events];
        setLive((current) =>
          current
            ? { ...current, events, mode: event.kind === "turn" ? event.mode : current.mode }
            : current,
        );
      },
      onError: (message: string) =>
        setLive((current) => (current ? { ...current, error: message } : current)),
      onClarify: (prompt: ClarifyPrompt) =>
        setLive((current) => (current ? { ...current, clarify: prompt } : current)),
      onDone: (frame: DoneFrame) => {
        const turn = inProgress.current;
        // A finished answer becomes two ordinary transcript rows at once — the
        // shape a reload would produce — so it stays on screen when the next
        // question starts, and can be rated, saved and exported straight away.
        if (turn && frame.answer && !frame.failed && !frame.clarify) {
          setMessages((current) => [...current, ...foldTurn(turn, frame, current)]);
          setAnnouncement("Answer ready.");
          if (frame.request_id) {
            const requestId = frame.request_id;
            setTraces((current) => ({ ...current, [requestId]: turn.events }));
          }
          inProgress.current = null;
          setLive(null);
          return;
        }
        setLive((current) =>
          current
            ? {
                ...current,
                answer: frame.answer,
                usage: frame.usage,
                stopped: frame.cancelled ? "cancelled" : current.stopped,
                stopping: false,
                reconnecting: null,
                done: true,
              }
            : current,
        );
      },
      onReconnecting: (attempt: number, of: number) =>
        setLive((current) => (current ? { ...current, reconnecting: { attempt, of } } : current)),
      onReconnected: () =>
        setLive((current) => (current ? { ...current, reconnecting: null } : current)),
      onDropped: () =>
        setLive((current) =>
          current ? { ...current, dropped: true, reconnecting: null, done: true } : current,
        ),
    };
  }

  /** Answer the gate's question, or wave it past, and stream the real turn. */
  async function resolveClarification(pendingId: number, answers: string[], skip: boolean) {
    const controller = new AbortController();
    abort.current = controller;
    setLive((current) =>
      current ? { ...current, clarify: undefined, done: false, error: undefined } : current,
    );
    try {
      await streamClarifyAnswer(pendingId, { answers, skip }, handlers(), controller.signal);
      if (activeId) void reloadConversations();
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof ChatStreamError ? err.message : "Couldn't reach the chat service.",
      );
      setLive(null);
    } finally {
      abort.current = null;
    }
  }

  /**
   * Read-only links minted this session, keyed by conversation. One link held
   * for the whole page survived a switch: after sharing one conversation, every
   * other one offered "Copy link" with the first one's URL.
   */
  const [shareLinks, setShareLinks] = useState<Record<number, string>>({});
  const shareLink = activeId !== null ? shareLinks[activeId] : undefined;

  /** Markdown of the whole conversation plus an evidence appendix (§7). */
  function exportMarkdown() {
    const markdown = conversationToMarkdown(
      conversations.find((c) => c.id === activeId)?.title ?? null,
      messages,
    );
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ceynex-conversation-${activeId}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Mint a read-only link, or copy the one already minted (§5). */
  async function toggleShare() {
    if (activeId === null) return;
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
      } catch {
        /* Clipboard is blocked in some contexts; the link is on screen anyway. */
      }
      return;
    }
    try {
      const result = await shareConversation(activeId, true);
      if (result.token) {
        const link = `${window.location.origin}/shared/${result.token}`;
        setShareLinks((current) => ({ ...current, [activeId]: link }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a link.");
    }
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
    const key = `turn-${++turnCounter.current}`;
    inProgress.current = { key, question: asked, events: [] };
    setLive({ key, question: asked, events: [], done: false });

    // A first turn always runs the graph, and the backend emits no `turn` frame
    // for it (routes/chat.py only classifies against an existing transcript),
    // so there is nothing to wait for. Later turns fire from the `turn` frame
    // above, once it says the graph is actually running.
    if (messages.length === 0) loadNews(asked, key);

    try {
      await streamChat(
        { query: asked, ...(conversationId ? { conversation_id: conversationId } : {}) },
        handlers(),
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

  /**
   * Stop is a request to the server, not a hang-up: a signed-in turn keeps
   * running when its reader disconnects (backend D12, amended), so closing the
   * socket would only stop us listening. Once the server has cancelled, the
   * stream ends with its own `done` frame. Before the turn has a request id —
   * or if the request cannot be sent — dropping the connection is all we have.
   */
  /**
   * A fresh answer to the conversation's latest question. Streams like any
   * turn, in the latest answer's place; the answer it replaces is kept and
   * reachable through the version switcher once the new one arrives.
   */
  async function regenerate(message: ChatMessage) {
    if (streaming || message.id == null) return;
    setError(null);
    const controller = new AbortController();
    abort.current = controller;
    const key = `turn-${++turnCounter.current}`;
    // The question being re-answered is the user row before this answer. The
    // server's `turn` frame names it too; this is the fallback for related news.
    const asked = [...messages]
      .reverse()
      .find((m) => m.role === "user" && m.seq < message.seq);
    const question = asked?.effective_query ?? asked?.content ?? "";
    inProgress.current = {
      key,
      question,
      events: [],
      mode: message.mode === "discuss" ? "discuss" : "analyse",
    };
    setLive({ key, question, events: [], done: false, regenerating: message.id });
    try {
      await streamRegenerate(message.id, handlers(), controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof ChatStreamError ? err.message : "Could not regenerate that answer.");
      setLive(null);
    } finally {
      abort.current = null;
    }
  }

  async function stop() {
    const turn = inProgress.current;
    if (!turn) return;
    setLive((current) => (current ? { ...current, stopping: true } : current));
    if (!turn.requestId) {
      // Pressed before the `start` frame named the turn. The request goes out
      // the moment it does (see the start handler); dropping the socket now
      // would only stop us listening while the server ran on and saved the
      // answer under a message saying nothing was saved.
      turn.stopRequested = true;
      return;
    }
    await requestStop(turn.requestId);
  }

  /**
   * Ask the server to stop `requestId`. On success the stream's own `done`
   * frame (`cancelled: true`) ends the turn. If the request cannot be
   * delivered, the server never heard us: a signed-in turn will finish and be
   * stored, so all that can honestly be done is stop listening and say so.
   */
  async function requestStop(requestId: string) {
    try {
      await cancelTurn(requestId);
    } catch {
      abort.current?.abort();
      setLive((current) =>
        current ? { ...current, stopped: "detached", stopping: false, done: true } : current,
      );
    }
  }

  const rows = groupVersions(messages);

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
              setShareLinks((current) => {
                const next = { ...current };
                delete next[id];
                return next;
              });
              if (activeId === id) startNew();
              return reloadConversations();
            });
          }}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {messages.length > 0 && activeId !== null && (
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <FreshnessRibbon />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={exportMarkdown}>
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void toggleShare()}>
                {shareLink ? "Copy link" : "Share"}
              </Button>
            </div>
          </div>
        )}
        {shareLink && (
          <p className="text-xs text-gray-500 break-all print:hidden">
            Read-only link: {shareLink}
          </p>
        )}
        {messages.length === 0 && !live && (
          <div className="space-y-3">
            <h1 className="text-lg font-semibold text-gray-900">
              Ask about Sri Lanka&apos;s export economy
            </h1>
            <p className="text-sm text-gray-500">
              Every figure is traced to the query that produced it. Open the steps beside an
              answer to see the Cypher, the dataset read and what the model cost.
            </p>
            {/* Answers the first credibility question a reader has, before they
                have asked anything. */}
            <FreshnessRibbon />
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
          {rows.map((row, position) => {
            if (row.message.role === "user") {
              return (
                <UserTurn
                  key={row.key}
                  content={row.message.content}
                  interpretedAs={row.message.effective_query}
                />
              );
            }
            // While its replacement streams, the answer being regenerated steps
            // aside; it comes back as the previous version once the new one lands.
            if (live?.regenerating != null && row.message.id === live.regenerating) return null;
            const isLatest = position === rows.length - 1;
            return (
              <VersionedTurn
                key={`${row.key}:${row.versions?.length ?? 1}`}
                row={row}
                render={(message, versions) => (
                  <AssistantTurn
                    graphKey={`${activeId}-${message.id ?? message.seq}`}
                    mode={message.mode}
                    events={message.request_id ? (traces[message.request_id] ?? []) : []}
                    running={false}
                    traceLoading={
                      message.request_id ? traces[message.request_id] === null : false
                    }
                    onOpenTrace={
                      message.request_id && activeId !== null
                        ? () => loadTrace(activeId, message.request_id as string)
                        : undefined
                    }
                    messageId={message.id ?? undefined}
                    onFollowUp={(question) => void submit(question)}
                    usage={message.usage ?? undefined}
                    queryHistoryId={message.query_history_id}
                    saved={message.saved}
                    withdrawn={message.draft_withdrawn}
                    versions={versions}
                    onRegenerate={
                      // The latest answer only, shown as its latest version, once
                      // stored — the server refuses anything else, so offering it
                      // would promise something it will not do.
                      isLatest && !streaming && message.id != null && message === row.message
                        ? () => void regenerate(message)
                        : undefined
                    }
                    news={message.client_key ? news[message.client_key]?.articles : undefined}
                    newsSource={message.client_key ? news[message.client_key]?.source : undefined}
                    newsLoading={message.client_key ? news[message.client_key]?.loading : undefined}
                    answer={{
                      answer: message.content,
                      confidence: message.confidence ?? null,
                      confidence_band: message.confidence_band ?? null,
                      confidence_breakdown: message.confidence_breakdown ?? null,
                      agents_used: message.agents_used,
                      evidence: message.evidence,
                      forecast: message.forecast,
                      graph: message.graph,
                      degraded: message.degraded ?? false,
                      grounded: message.grounded ?? undefined,
                      route: message.route,
                      sectors: message.sectors,
                      unanswered: message.unanswered,
                      elapsed_ms: message.elapsed_ms,
                    }}
                  />
                )}
              />
            );
          })}

          {live && (
            <>
              {/* A regenerate answers the question already on screen. */}
              {live.regenerating == null && <UserTurn content={live.question} />}
              <AssistantTurn
                graphKey={`live-${live.key}`}
                events={live.events}
                running={!live.done}
                answer={live.answer}
                usage={live.usage}
                mode={live.mode}
                error={live.error}
                draft={live.draft}
                withdrawn={live.withdrawn}
                news={news[live.key]?.articles}
                newsSource={news[live.key]?.source}
                newsLoading={news[live.key]?.loading}
                onFollowUp={live.done ? (question) => void submit(question) : undefined}
              />
              {live.clarify && (
                <ClarifyCard
                  prompt={live.clarify}
                  busy={streaming}
                  onAnswer={(answers) =>
                    void resolveClarification(live.clarify!.pending_id, answers, false)
                  }
                  onSkip={() => void resolveClarification(live.clarify!.pending_id, [], true)}
                />
              )}
              {live.reconnecting && (
                <li role="status" aria-live="polite" className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="motion-safe:animate-pulse" aria-hidden="true">
                    ○
                  </span>
                  Connection lost — reconnecting (attempt {live.reconnecting.attempt} of{" "}
                  {live.reconnecting.of})…
                </li>
              )}
              {live.stopping && !live.done && (
                <li role="status" aria-live="polite" className="text-sm text-gray-600">
                  Stopping…
                </li>
              )}
              {live.stopped === "cancelled" && (
                <li role="status" className="text-sm text-gray-600">
                  Stopped. Nothing from this question was saved.
                </li>
              )}
              {live.stopped === "detached" && (
                <li
                  role="status"
                  className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-4 py-3 flex flex-wrap items-center gap-3"
                >
                  <span>
                    Stopped listening. The stop request did not reach the server, so it
                    may finish and save this answer — reload the conversation to check.
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (activeId !== null) void openConversation(activeId);
                    }}
                  >
                    Reload conversation
                  </Button>
                </li>
              )}
              {live.dropped && (
                <li className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-4 py-3 flex flex-wrap items-center gap-3">
                  <span>
                    The connection dropped and could not be re-established. The
                    server keeps working on a question once asked, so reload the
                    conversation in a moment to see its answer before asking again.
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (activeId !== null) void openConversation(activeId);
                    }}
                  >
                    Reload conversation
                  </Button>
                </li>
              )}
            </>
          )}
        </ol>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
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
            <Button variant="secondary" onClick={() => void stop()} disabled={live?.stopping}>
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

/**
 * One answer with its versions: the latest shown, the others a click away.
 *
 * Keyed by its chain and version count, so when a regenerate adds a version the
 * switcher resets to the new, latest answer — the one the reader just asked for.
 */
function VersionedTurn({
  row,
  render,
}: {
  row: TranscriptRow;
  render: (
    message: ChatMessage,
    versions?: { index: number; count: number; onSelect: (index: number) => void },
  ) => ReactNode;
}) {
  const versions = row.versions ?? [row.message];
  const [index, setIndex] = useState(versions.length - 1);
  const shown = versions[Math.min(index, versions.length - 1)];
  return (
    <>
      {render(
        shown,
        versions.length > 1 ? { index, count: versions.length, onSelect: setIndex } : undefined,
      )}
    </>
  );
}
