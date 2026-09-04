import { confidenceBand, CONFIDENCE_BAND_COLOR } from "../lib/confidence";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A radial gauge rather than a pill. The number and the band name are both
 * still real text, not just an arc -- confidence is never carried by colour
 * alone, only reinforced by it.
 */
export default function ConfidenceBadge({ score }: { score: number }) {
  const band = confidenceBand(score);
  const color = CONFIDENCE_BAND_COLOR[band];
  const pct = Math.max(0, Math.min(1, score));
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <div
      className="inline-flex flex-col items-center gap-0.5"
      title={`Confidence: ${(score * 100).toFixed(0)}% (${band})`}
    >
      <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`Confidence ${(score * 100).toFixed(0)} percent, ${band}`}>
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
      <span
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{ color }}
      >
        {band}
      </span>
    </div>
  );
}
