import { useState } from "react";
import { evidenceId } from "../lib/evidenceAnchor";
import type { Evidence } from "../types/contracts";

/**
 * SRS 3.1.4: evidence must sit beside the answer, never behind a modal.
 * This component is a plain in-flow panel, not a dialog/overlay — the
 * caller is responsible for placing it in a sidebar column next to the
 * answer (see Query.tsx's two-column layout), not popping it over the top.
 */
export default function EvidencePanel({
  evidence,
  idPrefix,
  highlight,
}: {
  evidence: Evidence[];
  /**
   * Gives each entry a stable id and makes it focusable, so a `[n]` citation in
   * the answer can move the reader — and keyboard focus — to what it cites.
   * Numbered in response order, which is merged evidence first and web results
   * last, exactly as the merge prompt numbered its SOURCES.
   */
  idPrefix?: string;
  /** The 1-based entry a citation just pointed at, shown with a ring. */
  highlight?: number | null;
}) {
  return (
    <aside className="cx-panel w-full lg:w-80 shrink-0 p-4">
      <h2 className="cx-panel-title mb-3">Evidence</h2>
      {evidence.length === 0 ? (
        <p className="text-sm text-gray-500">No supporting evidence for this answer.</p>
      ) : (
        <ul className="space-y-3">
          {evidence.map((item, i) => (
            <EvidenceItem
              key={`${i}-${item.source_id}-${item.detail}`}
              item={item}
              id={idPrefix ? evidenceId(idPrefix, i + 1) : undefined}
              highlighted={highlight === i + 1}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}

function EvidenceItem({
  item,
  id,
  highlighted,
}: {
  item: Evidence;
  id?: string;
  highlighted?: boolean;
}) {
  const [showDetail, setShowDetail] = useState(false);
  // A general web result is not a verified source, and must not look like one.
  // Teal means "we queried this and can re-query it" everywhere in this UI; a
  // scraped snippet has no query behind it, so it gets its own amber treatment
  // and says in words what it is. Backend deviation D14.
  const web = item.source_id === "WEB";
  return (
    <li
      id={id}
      // Focusable only by script (-1), so a citation can move focus here
      // without adding a tab stop per evidence entry.
      tabIndex={id ? -1 : undefined}
      className={`border rounded-md p-3 focus-visible:outline-2 focus-visible:outline-offset-2
                  focus-visible:outline-teal-600 motion-safe:transition-shadow ${
        web ? "border-amber-200 bg-amber-50/60" : "border-gray-100 bg-gray-50"
      } ${highlighted ? "ring-2 ring-teal-500" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
            web ? "text-amber-800 bg-amber-100" : "text-teal-700 bg-teal-50"
          }`}
        >
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 rounded-full ${web ? "bg-amber-700" : "bg-teal-700"}`}
          />
          {item.source_id}
        </span>
        {item.period && <span className="text-xs font-mono text-gray-500">{item.period}</span>}
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
          className="mt-1.5 text-xs text-teal-700 hover:text-teal-900 underline underline-offset-2"
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
            web ? "text-amber-800 hover:text-amber-900" : "text-teal-700 hover:text-teal-900"
          }`}
        >
          {web ? item.detail || "Open the page" : "Source link"}
        </a>
      )}
    </li>
  );
}
