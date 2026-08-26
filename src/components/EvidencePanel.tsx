import { useState } from "react";
import type { Evidence } from "../types/contracts";

/**
 * SRS 3.1.4: evidence must sit beside the answer, never behind a modal.
 * This component is a plain in-flow panel, not a dialog/overlay — the
 * caller is responsible for placing it in a sidebar column next to the
 * answer (see Query.tsx's two-column layout), not popping it over the top.
 */
export default function EvidencePanel({ evidence }: { evidence: Evidence[] }) {
  return (
    <aside className="w-full lg:w-80 shrink-0 bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Evidence</h2>
      {evidence.length === 0 ? (
        <p className="text-sm text-gray-500">No supporting evidence for this answer.</p>
      ) : (
        <ul className="space-y-3">
          {evidence.map((item) => (
            <EvidenceItem key={`${item.source_id}-${item.detail}`} item={item} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function EvidenceItem({ item }: { item: Evidence }) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <li className="border border-gray-100 rounded-md p-3 bg-gray-50">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-mono font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
          {item.source_id}
        </span>
        {item.period && <span className="text-xs text-gray-400">{item.period}</span>}
      </div>
      <p className="text-sm text-gray-700">{item.claim}</p>
      <button
        type="button"
        onClick={() => setShowDetail((s) => !s)}
        aria-expanded={showDetail}
        className="mt-1.5 text-xs text-teal-600 hover:text-teal-800 underline underline-offset-2"
      >
        {showDetail ? "Hide query" : "Show query"}
      </button>
      {showDetail && (
        <pre className="mt-2 text-[11px] leading-snug text-gray-600 bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
          {item.detail}
        </pre>
      )}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 block text-xs text-teal-600 hover:text-teal-800 underline underline-offset-2"
        >
          Source link
        </a>
      )}
    </li>
  );
}
