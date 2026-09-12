import type { ConfidenceBand } from "../lib/confidence";
import { CONFIDENCE_BAND_COLOR, CONFIDENCE_BAND_STYLES, confidenceBand } from "../lib/confidence";
import { useTheme } from "../lib/useTheme";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * `band` is the backend's own `confidence_band`, passed through when the caller
 * has it. `lib/confidence.ts` mirrors `confidence_band()`'s thresholds and its
 * docstring says to keep the two in sync — so where the server already sent its
 * answer, using it means there is nothing to keep in sync. The local
 * computation stays as the fallback for callers that have only a score.
 *
 * Classic: the original pill. Signal Deck: a radial gauge instead -- the
 * number and the band name are both still real text either way, not just an
 * arc, so confidence is never carried by colour alone, only reinforced by it.
 * The pill's percentage is full-strength text, not faded: faded, it failed
 * WCAG AA contrast.
 */
export default function ConfidenceBadge({
  score,
  band,
}: {
  score: number;
  band?: ConfidenceBand;
}) {
  const { theme } = useTheme();
  const resolved = band ?? confidenceBand(score);

  if (theme !== "signal-deck") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${CONFIDENCE_BAND_STYLES[resolved]}`}
        title={`Confidence: ${(score * 100).toFixed(0)}%`}
      >
        {resolved} confidence
        <span>· {(score * 100).toFixed(0)}%</span>
      </span>
    );
  }

  const color = CONFIDENCE_BAND_COLOR[resolved];
  const pct = Math.max(0, Math.min(1, score));
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <div
      className="inline-flex flex-col items-center gap-0.5"
      title={`Confidence: ${(score * 100).toFixed(0)}% (${resolved})`}
    >
      <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`Confidence ${(score * 100).toFixed(0)} percent, ${resolved}`}>
        <circle cx="26" cy="26" r={RADIUS} fill="none" stroke="var(--color-gray-200)" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 26 26)"
        />
        <text
          x="26"
          y="30"
          textAnchor="middle"
          className="font-display"
          style={{ fontSize: 12, fontWeight: 700, fill: "var(--color-gray-900)" }}
        >
          {(score * 100).toFixed(0)}%
        </text>
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
        {resolved}
      </span>
    </div>
  );
}
