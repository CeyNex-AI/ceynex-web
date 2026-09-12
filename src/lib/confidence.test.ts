import { describe, expect, it } from "vitest";
import { confidenceBand } from "./confidence";

// Thresholds are pinned to ceynex-core's ceynex/orchestrator/confidence.py::
// confidence_band (>=0.75 High, >=0.50 Moderate, >=0.30 Low, else Very low) --
// see confidence.ts's own module comment. Boundary values are the drift risk:
// a rewrite of either side that shifts a threshold by even a rounding error
// would otherwise ship a UI label that disagrees with the backend's own claim.
describe("confidenceBand", () => {
  it.each([
    [1, "High"],
    [0.75, "High"],
    [0.7499, "Moderate"],
    [0.5, "Moderate"],
    [0.4999, "Low"],
    [0.3, "Low"],
    [0.2999, "Very low"],
    [0, "Very low"],
  ] as const)("scores %s as %s", (score, band) => {
    expect(confidenceBand(score)).toBe(band);
  });
});
