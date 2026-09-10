import type { ConfidenceBand } from "../lib/confidence";
import { confidenceBand, CONFIDENCE_BAND_STYLES } from "../lib/confidence";

/**
 * `band` is the backend's own `confidence_band`, passed through when the caller
 * has it. `lib/confidence.ts` mirrors `confidence_band()`'s thresholds and its
 * docstring says to keep the two in sync — so where the server already sent its
 * answer, using it means there is nothing to keep in sync. The local
 * computation stays as the fallback for callers that have only a score.
 */
export default function ConfidenceBadge({
  score,
  band,
}: {
  score: number;
  band?: ConfidenceBand;
}) {
  const resolved = band ?? confidenceBand(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${CONFIDENCE_BAND_STYLES[resolved]}`}
      title={`Confidence: ${(score * 100).toFixed(0)}%`}
    >
      {resolved} confidence
      <span className="opacity-70">· {(score * 100).toFixed(0)}%</span>
    </span>
  );
}
