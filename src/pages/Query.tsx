import { useEffect, useState, type FormEvent } from "react";
import ConfidenceBadge from "../components/ConfidenceBadge";
import EvidencePanel from "../components/EvidencePanel";
import ForecastChart from "../components/ForecastChart";
import { fetchHistory, saveQuery, unsaveQuery, type HistoryItem } from "../lib/historyApi";
import usePageTitle from "../lib/usePageTitle";
import { runQuery } from "../lib/queryApi";
import type { QueryResponse } from "../types/contracts";

const EXAMPLE_QUERIES = [
  "How are apparel exports to the United States doing?",
  "What are Sri Lanka's top apparel export markets?",
  "How is Ceylon tea performing in export markets?",
  "What's the outlook for cinnamon exports next year?",
];

const DATA_SOURCES = [
  { id: "EDB", name: "Export Development Board" },
  { id: "JAAF", name: "Joint Apparel Association Forum" },
  { id: "UN Comtrade", name: "UN trade statistics" },
  { id: "FAOSTAT", name: "FAO agriculture statistics" },
];

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const COLLAPSED_HISTORY_COUNT = 3;

/** SRS 3.5.2 -- a signed-in user's own past queries, clickable to reuse, and
 * bookmarkable for later (the star), filterable to just the starred ones.
 * Collapsed to the most recent few by default so a long history doesn't pile
 * up the page -- "Show more" reveals the rest. */
function HistoryPanel({
  items,
  savedOnly,
  onToggleSavedOnly,
  onReuse,
  onToggleSaved,
}: {
  items: HistoryItem[];
  savedOnly: boolean;
  onToggleSavedOnly: (savedOnly: boolean) => void;
  onReuse: (query: string) => void;
  onToggleSaved: (item: HistoryItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0 && !savedOnly) return null;

  const visibleItems = expanded ? items : items.slice(0, COLLAPSED_HISTORY_COUNT);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className="print:hidden mb-8">
      <div className="flex items-center gap-3 mb-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {savedOnly ? "Saved queries" : "Recent queries"}
        </p>
        {items.length > COLLAPSED_HISTORY_COUNT && (
          // Same toggle also sits below the list (next to the <ul>). A long
          // expanded list otherwise only offers "Show fewer" at the very
          // bottom -- collapsing it back means scrolling all the way down
          // first, which gets worse the longer the list is.
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="text-xs font-medium text-gray-400 hover:text-teal-700"
          >
            {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
          </button>
        )}
        <div className="flex gap-1 ml-auto">
          {(["all", "saved"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onToggleSavedOnly(tab === "saved")}
              aria-pressed={(tab === "saved") === savedOnly}
              className={`text-[10px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5 ${
                (tab === "saved") === savedOnly
                  ? "bg-teal-50 text-teal-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 px-2">No saved queries yet.</p>
      )}

      <ul className="space-y-1">
        {visibleItems.map((item) => (
          <li key={item.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleSaved(item)}
              aria-label={item.saved ? "Unsave this query" : "Save this query"}
              title={item.saved ? "Unsave" : "Save"}
              className={`shrink-0 text-base leading-none px-1.5 py-1.5 rounded-md hover:bg-white ${
                item.saved ? "text-amber-500" : "text-gray-300 hover:text-gray-400"
              }`}
            >
              {item.saved ? "★" : "☆"}
            </button>
            <button
              type="button"
              onClick={() => onReuse(item.query)}
              // Grid, not flex: the query-text span was flex-1 + truncate
              // with no min-w-0 on itself, so its minimum width defaulted to
              // its full un-truncated content size (the flexbox truncation
              // footgun) -- truncate never actually engaged, and the
              // badge/time after it landed at a different x position on
              // every row depending on how long that row's query happened to
              // be. Grid columns are sized once across every row, and the
              // "degraded" badge is always rendered (just invisible when not
              // degraded) so a row without it doesn't shift the time column
              // into the wrong slot.
              className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto] items-center gap-3 text-left text-sm text-gray-600 hover:text-teal-700 hover:bg-white rounded-md px-2 py-1.5 transition-colors"
            >
              <span className="min-w-0 truncate">{item.query}</span>
              <span
                className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${
                  item.degraded ? "text-amber-600 bg-amber-50" : "invisible"
                }`}
              >
                degraded
              </span>
              <span className="text-xs text-gray-400">{timeAgo(item.asked_at)}</span>
            </button>
          </li>
        ))}
      </ul>

      {items.length > COLLAPSED_HISTORY_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-1 text-xs font-medium text-gray-400 hover:text-teal-700 px-2 py-1"
        >
          {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}

export default function Query() {
  usePageTitle("Ask CeyNex");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);

  function reloadHistory() {
    // Best-effort: an unreachable history endpoint should not disturb the
    // query flow itself, so failures here are silent rather than surfaced
    // through the same `error` state as a failed query.
    fetchHistory({ savedOnly })
      .then(setHistory)
      .catch(() => {});
  }

  useEffect(reloadHistory, [savedOnly]);

  async function handleToggleSaved(item: HistoryItem) {
    try {
      await (item.saved ? unsaveQuery(item.id) : saveQuery(item.id));
      reloadHistory();
    } catch {
      // Best-effort, same as reloadHistory itself -- a failed toggle just
      // leaves the star as it was, nothing else on the page depends on it.
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await runQuery(query.trim());
      setResponse(result);
      reloadHistory();
    } catch {
      setError("Couldn't reach the query service. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Ask CeyNex</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ask about Sri Lanka's tea, cinnamon, and apparel export performance.
        </p>

        <form onSubmit={handleSubmit} className="print:hidden flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. How are apparel exports to the United States doing?"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-md px-5 py-2.5 transition-colors"
          >
            {loading ? "Asking…" : "Ask"}
          </button>
        </form>

        <div className="print:hidden flex flex-wrap gap-2 mb-8">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuery(example)}
              className="text-xs text-gray-500 hover:text-teal-700 bg-white border border-gray-200 rounded-full px-3 py-1"
            >
              {example}
            </button>
          ))}
        </div>

        <HistoryPanel
          // Keyed by tab so switching All/Saved remounts the panel and its
          // local "expanded" state resets, instead of carrying an expanded
          // view over from the other tab.
          key={savedOnly ? "saved" : "all"}
          items={history}
          savedOnly={savedOnly}
          onToggleSavedOnly={setSavedOnly}
          onReuse={setQuery}
          onToggleSaved={handleToggleSaved}
        />

        {error && (
          <p role="alert" className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        {response && (
          // SRS 3.1.4: evidence sits beside the answer — a two-column flex
          // layout, not a modal/overlay triggered by a "view evidence" button.
          // print:flex-col: on paper the two columns would squeeze evidence
          // into a sliver, so the report stacks evidence below the answer
          // instead.
          <div className="flex flex-col lg:flex-row print:flex-col gap-6">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-sm text-gray-500 italic">"{response.query}"</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <ConfidenceBadge score={response.final_confidence} />
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="print:hidden text-xs font-medium text-gray-500 hover:text-teal-700 border border-gray-200 rounded-md px-2.5 py-1"
                    >
                      Print report
                    </button>
                  </div>
                </div>
                <p className="text-gray-800 leading-relaxed">{response.final_answer}</p>
                {response.degraded && (
                  <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 inline-block">
                    Showing figures and evidence only. A natural-language explanation isn't available.
                  </p>
                )}
              </div>

              {response.forecast && <ForecastChart data={response.forecast} />}
            </div>

            <EvidencePanel evidence={response.merged_evidence} />
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Data sources
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {DATA_SOURCES.map((source) => (
              <span key={source.id} className="text-xs text-gray-500">
                <span className="font-mono font-medium text-gray-600">{source.id}</span>
                {": "}
                {source.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
