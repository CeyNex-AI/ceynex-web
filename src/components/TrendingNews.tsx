import { useEffect, useState } from "react";
import {
  SCOPE_LABELS,
  fetchTrending,
  type TrendingResult,
  type TrendingTopic,
} from "../lib/newsApi";
import timeAgo from "../lib/timeAgo";

/**
 * What's moving in trade and economy news, as clickable questions.
 *
 * Self-fetching on mount with its own loading/error state, the pattern Admin.tsx
 * already establishes for a panel that stands alone.
 *
 * A failure renders *nothing* -- no error banner. This strip sits above the
 * query box on the page's primary flow, and a broken sidecar shouting there
 * would make a working query page look broken. The static example chips below
 * it carry the page perfectly well on their own.
 *
 * Clicking a chip calls onPick(topic.prompt), never topic.label. That is why
 * config/news.yaml carries both: a chip reading "Ceylon tea" that drops the
 * literal words "Ceylon tea" into the query box produces a fragment the
 * orchestrator can't route.
 */
export default function TrendingNews({ onPick }: { onPick: (query: string) => void }) {
  const [data, setData] = useState<TrendingResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchTrending({ signal: controller.signal })
      .then(setData)
      .catch(() => {
        // Best-effort, same posture as Query.tsx's reloadHistory: an unreachable
        // sidecar leaves this panel absent rather than surfacing an error.
      });
    return () => controller.abort();
  }, []);

  if (!data || data.status === "warming" || data.status === "unavailable") return null;

  const scopes = Object.entries(data.scopes).filter(([, topics]) => topics.length > 0);
  if (scopes.length === 0) return null;

  return (
    <div className="print:hidden mb-6">
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Trending now</p>
        {data.computed_at && (
          <span className="text-xs text-gray-400">
            {/* A six-hour-old panel labelled "trending now" would be a lie, so a
                stale one says how old it is instead of hiding it. */}
            {data.status === "stale"
              ? `as of ${timeAgo(data.computed_at)}`
              : `updated ${timeAgo(data.computed_at)}`}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {scopes.map(([scope, topics]) => (
          <div key={scope} className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide w-16 shrink-0">
              {SCOPE_LABELS[scope] ?? scope}
            </span>
            {topics.map((topic) => (
              <TopicChip key={topic.topic_id} topic={topic} onPick={onPick} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicChip({
  topic,
  onPick,
}: {
  topic: TrendingTopic;
  onPick: (query: string) => void;
}) {
  const rising = topic.direction === "surging" || topic.direction === "up";
  return (
    <button
      type="button"
      onClick={() => onPick(topic.prompt)}
      title={`${topic.articles_24h} articles in the last 24h, against a baseline of ${topic.baseline_24h.toFixed(0)}`}
      className="group inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-teal-700 bg-white border border-gray-200 hover:border-teal-300 rounded-full pl-3 pr-2 py-1 transition-colors"
    >
      <span>{topic.label}</span>
      {/* No badge on a falling topic. It is still worth clicking, and the number
          would just be noise beside the ones that are actually moving. */}
      {rising && (
        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5">
          +{Math.round(topic.delta_pct)}%
        </span>
      )}
    </button>
  );
}
