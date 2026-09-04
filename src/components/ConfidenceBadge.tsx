import { CONFIDENCE_BAND_COLOR, CONFIDENCE_BAND_STYLES, confidenceBand } from "../lib/confidence";
import { useTheme } from "../lib/useTheme";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Classic: the original pill. Signal Deck: a radial gauge instead -- the
 * number and the band name are both still real text either way, not just an
 * arc, so confidence is never carried by colour alone, only reinforced by it.
 */
export default function ConfidenceBadge({ score }: { score: number }) {
  const { theme } = useTheme();
  const band = confidenceBand(score);

  if (theme !== "signal-deck") {
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
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
        {band}
      </span>
    </div>
  );
}
