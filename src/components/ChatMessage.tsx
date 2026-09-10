/**
 * One turn in the transcript.
 *
 * The assistant half deliberately **reuses the existing answer panels** —
 * `ConfidenceBadge`, `EvidencePanel`, `ForecastChart`, `KnowledgeGraphPanel`.
 * They are already correctly shaped, already carry their `sr-only` table twins
 * for screen readers and print, and re-implementing them for chat would mean
 * two renderings of the same evidence drifting apart.
 *
 * A `discuss` turn shows the *previous* turn's confidence and panels, because
 * that is what it is discussing. It produced no new analysis, and minting a
 * fresh confidence score for a paraphrase would be a number with nothing
 * behind it.
 */

import { useState } from "react";
import { evidenceId } from "../lib/evidenceAnchor";
import { saveQuery, unsaveQuery } from "../lib/historyApi";
import AnswerFeedback from "./AnswerFeedback";
import CitedAnswer from "./CitedAnswer";
import ConfidenceBadge from "./ConfidenceBadge";
import ConfidenceBreakdown from "./ConfidenceBreakdown";
import FollowUpChips from "./FollowUpChips";
import type { NewsArticle, NewsSource } from "../lib/newsApi";
import EvidencePanel from "./EvidencePanel";
import NewsPanel from "./NewsPanel";
import ForecastChart from "./ForecastChart";
import KnowledgeGraphPanel from "./KnowledgeGraphPanel";
import ReasoningTrace from "./ReasoningTrace";
import { Pill } from "./ui";
import type { AnswerPayload, TraceEvent, UsageSummary } from "../types/chat";

export function UserTurn({
  content,
  interpretedAs,
}: {
  content: string;
  /**
   * The question the system actually ran, when it is not what was typed — a
   * follow-up rewritten to stand alone, or a question composed with the
   * reader's answer to a clarification. Shown rather than hidden, so the reader
   * can see exactly what was analysed in their name.
   */
  interpretedAs?: string | null;
}) {
  return (
    <li className="flex flex-col items-end gap-1">
      <p className="max-w-[85%] bg-teal-600 text-white rounded-lg rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap">
        {content}
      </p>
      {interpretedAs && interpretedAs !== content && (
        <p className="max-w-[85%] text-xs text-gray-500 text-right">
          <span className="font-medium">Interpreted as:</span> {interpretedAs}
        </p>
      )}
    </li>
  );
}

/**
 * Bookmark the analysis, through the History panel's own endpoint.
 *
 * `query_history_id` links a chat turn to the row `/api/history` already
 * lists, so saving here and saving there are the same action on the same row —
 * the star cannot disagree with the History panel because there is only one
 * saved flag.
 */
function SaveToggle({ historyId, initiallySaved }: { historyId: number; initiallySaved: boolean }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    setBusy(true);
    setFailed(false);
    try {
      if (saved) await unsaveQuery(historyId);
      else await saveQuery(historyId);
      setSaved(!saved);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs print:hidden">
      <button
        type="button"
        aria-pressed={saved}
        disabled={busy}
        onClick={() => void toggle()}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 ring-1 ring-inset ring-gray-200
                   bg-white hover:bg-gray-50 disabled:text-gray-400 focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <span aria-hidden="true" className={saved ? "text-teal-600" : "text-gray-400"}>
          {saved ? "★" : "☆"}
        </span>
        {saved ? "Saved to History" : "Save to History"}
      </button>
      <span role="status" aria-live="polite" className="text-red-700">
        {failed ? "Could not update — try again." : ""}
      </span>
    </span>
  );
}

function UsageFooter({ usage }: { usage: UsageSummary }) {
  const cached = usage.cache_hits > 0 ? `, ${usage.cache_hits} cached` : "";
  return (
    <p className="text-xs text-gray-400 tabular-nums">
      {usage.tokens_in.toLocaleString()} in / {usage.tokens_out.toLocaleString()} out ·{" "}
      {usage.cost_usd > 0 ? `$${usage.cost_usd.toFixed(6)}` : "$0"} ·{" "}
      {usage.calls} call{usage.calls === 1 ? "" : "s"}
      {cached}
    </p>
  );
}

export function AssistantTurn({
  answer,
  events,
  running,
  usage,
  mode,
  graphKey,
  error,
  news,
  newsSource,
  newsLoading,
  onOpenTrace,
  traceLoading,
  messageId,
  onFollowUp,
  queryHistoryId,
  saved,
}: {
  answer?: AnswerPayload;
  events: TraceEvent[];
  running: boolean;
  usage?: UsageSummary;
  mode?: string | null;
  /** Changes per answer — KnowledgeGraphPanel needs a fresh mount each time. */
  graphKey: string | number;
  error?: string;
  /**
   * Related coverage, never evidence. Absent on a stored turn and on a
   * `discuss` turn — see the `news` field on Chat.tsx's LiveTurn for why.
   */
  news?: NewsArticle[] | null;
  newsSource?: NewsSource | null;
  newsLoading?: boolean;
  /** Fetches this turn's persisted trace the first time it is opened. */
  onOpenTrace?: () => void;
  traceLoading?: boolean;
  /** Present only on a stored turn — a rating needs a row to attach to. */
  messageId?: number;
  onFollowUp?: (question: string) => void;
  /** The `query_history` row an analysis wrote. Absent on a discussion. */
  queryHistoryId?: number | null;
  saved?: boolean;
}) {
  // Which evidence entry a `[n]` citation just pointed at — shown with a ring,
  // and cleared shortly after so the panel does not keep a stale highlight.
  const [cited, setCited] = useState<number | null>(null);
  const evidencePrefix = `evidence-${graphKey}`;

  function showCitation(index: number) {
    setCited(index);
    const target = document.getElementById(evidenceId(evidencePrefix, index));
    if (target) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      // Focus follows the eye: a keyboard or screen-reader user who activates
      // a citation lands on the source, not back at the top of the answer.
      target.focus({ preventScroll: true });
    }
    window.setTimeout(() => setCited((current) => (current === index ? null : current)), 2500);
  }

  return (
    <li className="space-y-3">
      <ReasoningTrace
        events={events}
        running={running}
        elapsedMs={answer?.elapsed_ms ?? undefined}
        onOpen={onOpenTrace}
        loading={traceLoading}
      />

      {error && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3"
        >
          {error}
        </p>
      )}

      {answer && (
        <div className="flex flex-col lg:flex-row gap-4 print:flex-col">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {answer.confidence !== null && answer.confidence !== undefined && (
                <ConfidenceBadge
                  score={answer.confidence}
                  band={answer.confidence_band ?? undefined}
                />
              )}
              {mode === "discuss" && (
                <Pill tone="gray">
                  {/* Says plainly that no new analysis ran, so the badge beside
                      it is not mistaken for a fresh one. */}
                  discussing the analysis above
                </Pill>
              )}
              {answer.degraded && <Pill tone="amber">degraded</Pill>}
              {answer.grounded === false && (
                <Pill tone="red">reply withheld — unsourced figure</Pill>
              )}
            </div>

            <CitedAnswer text={answer.answer} evidence={answer.evidence} onCite={showCitation} />

            {answer.unanswered.length > 0 && (
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-600">Not answered: </span>
                {answer.unanswered.join("; ")}
              </div>
            )}

            {answer.graph && <KnowledgeGraphPanel key={graphKey} graph={answer.graph} />}
            {answer.forecast && answer.forecast.length > 0 && (
              <ForecastChart data={answer.forecast} />
            )}
            {answer.confidence_breakdown && (
              <ConfidenceBreakdown breakdown={answer.confidence_breakdown} />
            )}
            {onFollowUp && !answer.degraded && (
              <FollowUpChips answer={answer} onPick={onFollowUp} />
            )}
            {usage && <UsageFooter usage={usage} />}
            <div className="flex flex-wrap items-center gap-3">
              {queryHistoryId != null && (
                <SaveToggle
                  key={queryHistoryId}
                  historyId={queryHistoryId}
                  initiallySaved={saved ?? false}
                />
              )}
              {messageId !== undefined && <AnswerFeedback messageId={messageId} />}
            </div>
          </div>

          {(answer.evidence.length > 0 || newsSource) && (
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
              {answer.evidence.length > 0 && (
                <EvidencePanel
                  evidence={answer.evidence}
                  idPrefix={evidencePrefix}
                  highlight={cited}
                />
              )}
              {newsSource && (
                <NewsPanel
                  articles={news ?? null}
                  loading={newsLoading ?? false}
                  source={newsSource}
                />
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
