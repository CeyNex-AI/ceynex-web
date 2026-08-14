import { useState, type FormEvent } from "react";
import ConfidenceBadge from "../components/ConfidenceBadge";
import EvidencePanel from "../components/EvidencePanel";
import ForecastChart from "../components/ForecastChart";
import { runQuery } from "../lib/mockQuery";
import type { QueryResponse } from "../types/contracts";

const EXAMPLE_QUERIES = [
  "How are apparel exports to the United States doing?",
  "What are Sri Lanka's top apparel export markets?",
];

export default function Query() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    const result = await runQuery(query.trim());
    setResponse(result);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Ask CeyNex</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ask about Sri Lanka's tea, cinnamon, and apparel export performance.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
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

        <div className="flex flex-wrap gap-2 mb-8">
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

        {response && (
          // SRS 3.1.4: evidence sits beside the answer — a two-column flex
          // layout, not a modal/overlay triggered by a "view evidence" button.
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-sm text-gray-500 italic">"{response.query}"</p>
                  <ConfidenceBadge score={response.final_confidence} />
                </div>
                <p className="text-gray-800 leading-relaxed">{response.final_answer}</p>
                {response.degraded && (
                  <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 inline-block">
                    Showing figures and evidence only — natural-language explanation unavailable.
                  </p>
                )}
              </div>

              {response.forecast && <ForecastChart data={response.forecast} />}
            </div>

            <EvidencePanel evidence={response.merged_evidence} />
          </div>
        )}
      </div>
    </div>
  );
}
