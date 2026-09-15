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

// Classic theme: the original pill's Tailwind classNames.
export const CONFIDENCE_BAND_STYLES: Record<ConfidenceBand, string> = {
  High: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Moderate: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Low: "bg-orange-50 text-orange-700 ring-orange-600/20",
  "Very low": "bg-red-50 text-red-700 ring-red-600/20",
};

// Signal Deck theme: CSS custom properties (index.css's @theme) for the
// radial gauge. A `var(--...)` reference works as an SVG attribute value
// exactly like a literal hex would. Four bands, four validated status steps
// (dataviz skill reference/palette.md) -- kept distinct from the teal brand
// accent so a confidence colour never reads as "the CeyNex colour".
export const CONFIDENCE_BAND_COLOR: Record<ConfidenceBand, string> = {
  High: "var(--color-status-good)",
  Moderate: "var(--color-status-warning)",
  Low: "var(--color-status-serious)",
  "Very low": "var(--color-status-critical)",
};

// The gauge's stroke uses the plain colour above -- decorative, not text, so
// it doesn't need WCAG contrast. Its band-name label is real text at 10px and
// needs the darker -text variant below (index.css) to clear 4.5:1 against
// the page background; axe caught the plain colour failing on every band.
export const CONFIDENCE_BAND_TEXT_COLOR: Record<ConfidenceBand, string> = {
  High: "var(--color-status-good-text)",
  Moderate: "var(--color-status-warning-text)",
  Low: "var(--color-status-serious-text)",
  "Very low": "var(--color-status-critical-text)",
};
