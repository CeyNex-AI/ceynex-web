/**
 * The live reasoning trace — what the system is doing, while it does it.
 *
 * **Every row here is a real operation.** The Cypher shown is the string that
 * was sent to Neo4j, the duration came from a clock around the call, the token
 * counts came off the provider's response. Nothing is synthesised to fill a gap
 * in the timeline: the project's central claim is that every figure traces to
 * its source, and an invented progress step is the same category of defect as
 * an unsourced number.
 *
 * The plan allowed for holding a fast step on screen long enough to read. It
 * turned out not to be needed: rows are appended and never removed, so a 3ms
 * Cypher query does not flash past — it simply arrives with a small number
 * beside it. No artificial delay is applied anywhere.
 *
 * **Accessibility (SRS 3.2.3 / 3.6.1 — WCAG 2.1 AA).** A region that rewrites
 * itself several times a second is exactly what breaks a screen reader, so:
 * `aria-live="polite"` and never `assertive`; only a short summary is live,
 * not the whole list, or every Cypher string gets read aloud; status is icon +
 * text and never colour alone; and `prefers-reduced-motion` drops the pulse.
 * The `sr-only` summary follows the same pattern `ForecastChart` and
 * `KnowledgeGraphPanel` already use for their canvases.
 */

import { useEffect, useRef, useState } from "react";
import type { TraceEvent } from "../types/chat";

type Status = "running" | "ok" | "failed" | "empty";

interface Row {
  key: string;
  icon: string;
  label: string;
  detail?: string;
  /** Shown verbatim in a <pre> when expanded — the Cypher, the SQL, the filter. */
  code?: string;
  meta?: string;
  status: Status;
  elapsedMs?: number;
  node?: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  running: "running",
  ok: "done",
  failed: "failed",
  empty: "nothing found",
};

/** Icon *and* text carry the status. Colour is decoration on top of both. */
const STATUS_ICON: Record<Status, string> = {
  running: "○",
  ok: "✓",
  failed: "✕",
  empty: "–",
};

const STATUS_CLASS: Record<Status, string> = {
  running: "text-gray-400",
  ok: "text-teal-600",
  failed: "text-red-600",
  empty: "text-gray-400",
};

const AGENT_LABEL: Record<string, string> = {
  export_analytics: "Export analytics",
  agriculture_commodity: "Agriculture & commodity",
  apparel_manufacturing: "Apparel & manufacturing",
  trade_economics: "Trade economics",
  forecast: "Forecast",
  route: "Routing",
  merge: "Merging findings",
};

function agentName(node?: string | null): string {
  if (!node) return "";
  return AGENT_LABEL[node] ?? node.replace(/_/g, " ");
}

function statusOf(event: TraceEvent): Status {
  if (event.status === "failed" || event.status === "timeout") return "failed";
  if (event.status === "empty") return "empty";
  return "ok";
}

function ms(value?: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

/**
 * One row per event worth showing.
 *
 * `node_start` / `node_end` are deliberately dropped: they bracket the events
 * beneath them, and rendering both ends turns a five-agent fan-out into thirty
 * rows of scaffolding. The agent's own `agent_result` carries its outcome.
 */
function toRow(event: TraceEvent, index: number): Row | null {
  const key = `${event.seq ?? index}-${event.kind}`;
  const node = event.node;

  switch (event.kind) {
    case "thought":
      return {
        key,
        icon: "◆",
        label: event.step ?? "",
        meta: event.method === "deterministic" ? "planned from the route" : undefined,
        status: "ok",
      };

    case "route":
      return {
        key,
        icon: "⇢",
        label: `Routed to ${(event.route ?? []).map(agentName).join(", ") || "no agent"}`,
        meta: event.method,
        status: "ok",
        elapsedMs: event.elapsed_ms,
      };

    case "kg_query":
      return {
        key,
        icon: "◈",
        label: "Queried the knowledge graph",
        detail:
          event.status === "failed"
            ? "Neo4j unavailable"
            : `${event.row_count ?? 0} row${event.row_count === 1 ? "" : "s"}`,
        code: event.cypher,
        meta: event.params || undefined,
        status: statusOf(event),
        elapsedMs: event.elapsed_ms,
        node,
      };

    case "sql_query":
      return {
        key,
        icon: "▤",
        label: `Read ${event.table ?? "the dataset"}`,
        detail:
          event.status === "failed"
            ? "Postgres unavailable"
            : `${event.row_count ?? 0} row${event.row_count === 1 ? "" : "s"}`,
        code: event.sql,
        meta: [event.item, event.target].filter(Boolean).join(" · ") || undefined,
        status: statusOf(event),
        elapsedMs: event.elapsed_ms,
        node,
      };

    case "vector_search":
      return {
        key,
        icon: "◇",
        label: "Searched policy documents",
        detail:
          event.status === "empty"
            ? "no passage cleared the relevance floor"
            : `${event.kept ?? 0} passage${event.kept === 1 ? "" : "s"}`,
        code: event.filter,
        meta: event.widened ? "retried without the goods filter" : undefined,
        status: statusOf(event),
        elapsedMs: event.elapsed_ms,
        node,
      };

    case "llm_call":
      return {
        key,
        icon: "✦",
        label: `Language model (${event.role ?? "?"})`,
        detail: event.cache_hit
          ? "served from cache"
          : `${event.tokens_in ?? 0} in / ${event.tokens_out ?? 0} out`,
        meta: [
          event.model,
          event.fallback ? "via failsafe" : null,
          !event.cache_hit && event.cost_usd ? `$${event.cost_usd.toFixed(6)}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        status: statusOf(event),
        elapsedMs: event.elapsed_ms,
        node,
      };

    case "agent_result":
      return {
        key,
        icon: "◐",
        label: agentName(node),
        detail:
          event.status === "declined"
            ? "declined — no sourced series"
            : event.status === "timeout"
              ? "exceeded its slice of the budget"
              : `${event.figures ?? 0} figure${event.figures === 1 ? "" : "s"}, ` +
                `${event.evidence_count ?? 0} evidence`,
        meta:
          event.confidence !== undefined && event.status === "ok"
            ? `confidence ${Math.round((event.confidence ?? 0) * 100)}%`
            : undefined,
        code: event.error,
        status: event.status === "ok" ? "ok" : event.status === "declined" ? "empty" : "failed",
        elapsedMs: event.elapsed_ms,
      };

    case "merge":
      return {
        key,
        icon: "◑",
        label: "Merged the findings",
        detail: `${event.evidence_count ?? 0} evidence entries`,
        meta:
          event.confidence !== undefined
            ? `confidence ${Math.round((event.confidence ?? 0) * 100)}%`
            : undefined,
        status: "ok",
        elapsedMs: event.elapsed_ms,
      };

    case "web_search":
      return {
        key,
        icon: "🌐",
        label:
          event.status === "ok"
            ? `Searched the web — ${event.results ?? 0} result${event.results === 1 ? "" : "s"}`
            : "Web search unavailable",
        meta: event.status === "ok" ? (event.domains ?? []).join(", ") : event.status,
        status: event.status === "ok" ? "ok" : "empty",
      };

    case "clarify":
      // Asked, or considered and decided against. Both are real steps: a gate
      // that silently declined to fire is still a decision the reader can audit.
      return {
        key,
        icon: "?",
        label: event.asked
          ? "Asked a clarifying question"
          : "Considered asking, then answered as put",
        meta: event.method === "template" ? "deterministic phrasing" : event.method,
        status: "ok",
      };

    case "turn":
      return {
        key,
        icon: "⇄",
        label:
          event.mode === "discuss"
            ? "Answering from the analysis already on screen"
            : "Treating this as a new question",
        meta: event.reason,
        status: "ok",
      };

    case "discuss":
      return {
        key,
        icon: "✦",
        label: "Discussed the previous answer",
        detail: event.status === "rejected" ? "reply discarded — unsourced figure" : undefined,
        status: event.status === "ok" ? "ok" : "empty",
      };

    case "instruction":
      // The backend has always emitted this; without a case it was dropped
      // silently, so a reader could not see their preference take effect. The
      // length only — the text is theirs and already on their Account page.
      return {
        key,
        icon: "✎",
        label: "Applied your answer preferences",
        detail: event.chars ? `${event.chars} characters` : undefined,
        meta: "tone and format only — never which sources or figures are used",
        status: "ok",
      };

    case "answer_delta":
      // The answer itself, arriving sentence by sentence. It is rendered as the
      // answer, not as a step — a row per sentence would duplicate the prose.
      return null;

    case "answer_reset":
      return {
        key,
        icon: "↺",
        label:
          event.reason === "retry"
            ? "Started the answer again after a failed attempt"
            : "Withdrew a draft that stated a figure no finding supports",
        status: event.reason === "retry" ? "ok" : "empty",
      };

    default:
      return null; // node_start / node_end / anything a newer backend reports
  }
}

/** A one-line summary once the turn is finished. Also the `sr-only` text. */
function summarise(rows: Row[], totalMs?: number): string {
  const queries = rows.filter((r) => r.key.includes("kg_query") || r.key.includes("sql_query"));
  const agents = new Set(rows.filter((r) => r.icon === "◐").map((r) => r.label));
  const parts: string[] = [];
  if (totalMs) parts.push(`Thought for ${ms(totalMs)}`);
  if (agents.size) parts.push(`${agents.size} ${agents.size === 1 ? "analysis" : "analyses"}`);
  if (queries.length) parts.push(`${queries.length} ${queries.length === 1 ? "query" : "queries"}`);
  return parts.join(" · ") || "No steps recorded";
}

export default function ReasoningTrace({
  events,
  running,
  elapsedMs,
  defaultOpen,
  onOpen,
  loading,
}: {
  events: TraceEvent[];
  running: boolean;
  elapsedMs?: number;
  /** Open while streaming, collapsed once the answer is there. */
  defaultOpen?: boolean;
  /**
   * Called the first time the reader opens a trace that has no events yet, so a
   * stored turn can fetch its persisted trace on demand. Its presence is also
   * what keeps the toggle rendered for an empty trace — without it, a turn
   * loaded from the transcript shows no way to ask for its steps at all.
   */
  onOpen?: () => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? running);
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = events.map(toRow).filter((row): row is Row => row !== null);
  const summary = summarise(rows, elapsedMs);

  // Collapse when the turn finishes, but never fight a user who opened it.
  const touched = useRef(false);
  useEffect(() => {
    if (!running && !touched.current) setOpen(false);
  }, [running]);

  if (rows.length === 0 && !running && !onOpen) return null;

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 text-sm">
      <button
        type="button"
        onClick={() => {
          touched.current = true;
          if (!open && rows.length === 0) onOpen?.();
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left
                   text-gray-600 hover:text-gray-900 focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-teal-600 rounded-lg"
      >
        <span className="flex items-center gap-2">
          {running ? (
            <span
              className="inline-block w-2 h-2 rounded-full bg-teal-500 motion-safe:animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <span className="text-teal-600" aria-hidden="true">
              ✓
            </span>
          )}
          <span className="font-medium">
            {running ? "Working…" : loading ? "Loading steps…" : summary}
          </span>
        </span>
        <span className="text-xs text-gray-400">{open ? "Hide" : "Show"} steps</span>
      </button>

      {/*
        Only the one-line status is live. Announcing the whole list would read
        every Cypher string aloud as it arrives, which is unusable.
      */}
      <p aria-live="polite" className="sr-only">
        {running ? `Working. ${rows.length} steps so far.` : summary}
      </p>

      {open && (
        <ol className="border-t border-gray-200 divide-y divide-gray-100">
          {rows.map((row) => (
            <li key={row.key} className="px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className={`${STATUS_CLASS[row.status]} shrink-0`} aria-hidden="true">
                  {STATUS_ICON[row.status]}
                </span>
                <span className="sr-only">{STATUS_LABEL[row.status]}: </span>
                <span className="flex-1 min-w-0">
                  <span className="text-gray-800">{row.label}</span>
                  {row.detail && <span className="text-gray-500"> — {row.detail}</span>}
                  {row.node && row.icon !== "◐" && (
                    <span className="text-gray-400"> ({agentName(row.node)})</span>
                  )}
                  {row.meta && (
                    <span className="block text-xs text-gray-400 truncate">{row.meta}</span>
                  )}
                </span>
                {row.elapsedMs !== undefined && (
                  <span className="text-xs text-gray-400 tabular-nums shrink-0">
                    {ms(row.elapsedMs)}
                  </span>
                )}
                {row.code && (
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === row.key ? null : row.key)}
                    aria-expanded={expanded === row.key}
                    className="text-xs text-teal-700 hover:underline shrink-0
                               focus-visible:outline-2 focus-visible:outline-offset-2
                               focus-visible:outline-teal-600 rounded"
                  >
                    {expanded === row.key ? "hide" : "query"}
                  </button>
                )}
              </div>
              {expanded === row.key && row.code && (
                <pre className="mt-2 text-xs bg-white border border-gray-200 rounded p-2
                                overflow-x-auto whitespace-pre-wrap break-words text-gray-700">
                  {row.code}
                </pre>
              )}
            </li>
          ))}
          {running && (
            <li className="px-3 py-2 text-gray-400 flex items-center gap-2">
              <span className="motion-safe:animate-pulse" aria-hidden="true">
                ○
              </span>
              <span>Working…</span>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
