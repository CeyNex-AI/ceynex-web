/**
 * Mirrors ceynex/orchestrator/confidence.py::confidence_band exactly —
 * same thresholds, same labels. Keep in sync if that formula changes.
 */
export type ConfidenceBand = "High" | "Moderate" | "Low" | "Very low";

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 0.75) return "High";
  if (score >= 0.5) return "Moderate";
  if (score >= 0.3) return "Low";
  return "Very low";
}

// CSS custom properties (index.css's @theme), not Tailwind classNames: the
// gauge takes colour as an SVG attribute value, and a `var(--...)` reference
// works there exactly like a literal hex would. Four bands, four validated
// status steps (dataviz skill reference/palette.md) -- kept distinct from the
// teal brand accent so a confidence colour never reads as "the CeyNex colour".
export const CONFIDENCE_BAND_COLOR: Record<ConfidenceBand, string> = {
  High: "var(--color-status-good)",
  Moderate: "var(--color-status-warning)",
  Low: "var(--color-status-serious)",
  "Very low": "var(--color-status-critical)",
};
