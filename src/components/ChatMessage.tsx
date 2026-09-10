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

import ConfidenceBadge from "./ConfidenceBadge";
import EvidencePanel from "./EvidencePanel";
import ForecastChart from "./ForecastChart";
import KnowledgeGraphPanel from "./KnowledgeGraphPanel";
import ReasoningTrace from "./ReasoningTrace";
import { Pill } from "./ui";
import type { AnswerPayload, TraceEvent, UsageSummary } from "../types/chat";

export function UserTurn({ content }: { content: string }) {
  return (
    <li className="flex justify-end">
      <p className="max-w-[85%] bg-teal-600 text-white rounded-lg rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap">
        {content}
      </p>
    </li>
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
}: {
  answer?: AnswerPayload;
  events: TraceEvent[];
  running: boolean;
  usage?: UsageSummary;
  mode?: string | null;
  /** Changes per answer — KnowledgeGraphPanel needs a fresh mount each time. */
  graphKey: string | number;
  error?: string;
}) {
  return (
    <li className="space-y-3">
      <ReasoningTrace
        events={events}
        running={running}
        elapsedMs={answer?.elapsed_ms ?? undefined}
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
                <ConfidenceBadge score={answer.confidence} />
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

            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{answer.answer}</p>

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
            {usage && <UsageFooter usage={usage} />}
          </div>

          {answer.evidence.length > 0 && <EvidencePanel evidence={answer.evidence} />}
        </div>
      )}
    </li>
  );
}
