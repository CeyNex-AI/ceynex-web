import { confidenceBand, CONFIDENCE_BAND_STYLES } from "../lib/confidence";

export default function ConfidenceBadge({ score }: { score: number }) {
  const band = confidenceBand(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${CONFIDENCE_BAND_STYLES[band]}`}
      title={`Confidence: ${(score * 100).toFixed(0)}%`}
    >
      {band} confidence
      <span className="opacity-70">· {(score * 100).toFixed(0)}%</span>
    </span>
  );
}
