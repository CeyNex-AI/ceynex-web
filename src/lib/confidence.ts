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

export const CONFIDENCE_BAND_STYLES: Record<ConfidenceBand, string> = {
  High: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Moderate: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Low: "bg-orange-50 text-orange-700 ring-orange-600/20",
  "Very low": "bg-red-50 text-red-700 ring-red-600/20",
};
