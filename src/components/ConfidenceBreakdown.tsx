/**
 * Why this confidence — SRS 3.1.4.
 *
 * "How is the confidence score calculated?" is the most predictable question
 * this project will be asked. `confidence.py` has always computed the answer as
 * four named terms and then returned only their sum; this renders the terms.
 *
 * Nothing here re-derives anything: the numbers come from the same call that
 * produced the score, so the working cannot disagree with the total it explains.
 */

import { useState } from "react";

export interface Breakdown {
  weighted: number;
  staleness: number;
  dq: number;
  coverage: number;
  final: number;
}

const PENALTIES: { key: keyof Breakdown; label: string; why: string }[] = [
  { key: "staleness", label: "Data age", why: "the most recent observation is not recent" },
  { key: "dq", label: "Source disagreement", why: "sources report materially different figures" },
  { key: "coverage", label: "Incomplete coverage", why: "an analysis failed or ran degraded" },
];

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function ConfidenceBreakdown({ breakdown }: { breakdown: Breakdown }) {
  const [open, setOpen] = useState(false);
  const applied = PENALTIES.filter((p) => breakdown[p.key] > 0);

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2
                   focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-teal-600 rounded"
      >
        {open ? "Hide" : "Why this confidence?"}
      </button>

      {open && (
        <div className="mt-2 border border-gray-200 rounded-md p-3 bg-gray-50">
          <table className="w-full text-xs">
            <caption className="sr-only">
              How the confidence score for this answer was calculated
            </caption>
            <tbody>
              <tr>
                <th scope="row" className="text-left font-normal text-gray-600 py-0.5">
                  Analyses' own confidence, weighted by relevance
                </th>
                <td className="text-right tabular-nums text-gray-900">{pct(breakdown.weighted)}</td>
              </tr>
              {applied.map((penalty) => (
                <tr key={penalty.key}>
                  <th scope="row" className="text-left font-normal text-gray-600 py-0.5">
                    {penalty.label}{" "}
                    <span className="text-gray-500">— {penalty.why}</span>
                  </th>
                  <td className="text-right tabular-nums text-red-700">
                    −{pct(breakdown[penalty.key])}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-gray-200">
                <th scope="row" className="text-left font-medium text-gray-800 pt-1">
                  Confidence
                </th>
                <td className="text-right tabular-nums font-medium text-gray-900 pt-1">
                  {pct(breakdown.final)}
                </td>
              </tr>
            </tbody>
          </table>
          {applied.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">
              No penalties applied — the data is current, the sources agree, and every
              analysis that was asked to run reported.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
