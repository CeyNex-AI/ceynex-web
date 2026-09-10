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
  // A general web result is not a verified source, and must not look like one.
  // Teal means "we queried this and can re-query it" everywhere in this UI; a
  // scraped snippet has no query behind it, so it gets its own amber treatment
  // and says in words what it is. Backend deviation D14.
  const web = item.source_id === "WEB";
  return (
    <li
      className={`border rounded-md p-3 ${
        web ? "border-amber-200 bg-amber-50/60" : "border-gray-100 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
            web ? "text-amber-800 bg-amber-100" : "text-teal-700 bg-teal-50"
          }`}
        >
          {item.source_id}
        </span>
        {item.period && <span className="text-xs text-gray-400">{item.period}</span>}
      </div>
      {web && (
        <p className="text-xs text-amber-800 mb-1">
          Web result — not a CeyNex data source, and not used in the answer or its
          confidence.
        </p>
      )}
      {/* Plain text, always. React escapes this, and it must stay that way on
          the WEB path: `dangerouslySetInnerHTML` here would turn an untrusted
          snippet into markup. */}
      <p className="text-sm text-gray-700">{item.claim}</p>
      {!web && (
        <button
          type="button"
          onClick={() => setShowDetail((s) => !s)}
          aria-expanded={showDetail}
          className="mt-1.5 text-xs text-teal-600 hover:text-teal-800 underline underline-offset-2"
        >
          {showDetail ? "Hide query" : "Show query"}
        </button>
      )}
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
          className={`mt-1.5 block text-xs underline underline-offset-2 ${
            web ? "text-amber-800 hover:text-amber-900" : "text-teal-600 hover:text-teal-800"
          }`}
        >
          {web ? item.detail || "Open the page" : "Source link"}
        </a>
      )}
    </li>
  );
}
