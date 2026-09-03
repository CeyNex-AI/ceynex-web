import type { NewsArticle, NewsSource, Relevance } from "../lib/newsApi";
import timeAgo from "../lib/timeAgo";

/**
 * Recent coverage related to the question, beside the answer.
 *
 * Visually a sibling of EvidencePanel, and deliberately not the same thing.
 * Three differences carry that distinction, because the panel sits directly
 * below Evidence and would otherwise read as more of it:
 *
 *  - the source chip is gray, never teal. Teal means "verified source" in this
 *    app, and a GDELT headline is not one.
 *  - the headline itself is the link. EvidencePanel splits claim from "Source
 *    link" because a claim genuinely isn't a link; a headline is.
 *  - the panel says on its face that none of this produced the answer.
 *
 * print:hidden, unlike EvidencePanel. The printed report is the evidence-backed
 * answer -- unvetted news links have no business in it.
 */

const RELEVANCE_STYLES: Record<Relevance, string> = {
  strong: "text-emerald-700 bg-emerald-50",
  related: "text-gray-500 bg-gray-100",
  loose: "text-gray-400 bg-gray-50",
  unscored: "text-gray-400 bg-gray-50",
};

const RELEVANCE_LABELS: Record<Relevance, string> = {
  strong: "closely related",
  related: "related",
  loose: "loosely related",
  unscored: "unranked",
};

/**
 * The raw cross-encoder score is never shown. Rendered as a percentage it would
 * be a calibration claim the project can't support, sitting on the same page as
 * ConfidenceBadge, which does real calibrated work.
 */
const RELEVANCE_TOOLTIP =
  "Judged by comparing your question with the headline only, not the article text.";

export default function NewsPanel({
  articles,
  loading,
  source,
}: {
  articles: NewsArticle[] | null;
  loading: boolean;
  source: NewsSource | null;
}) {
  return (
    <aside className="print:hidden w-full lg:w-80 shrink-0 bg-white border border-gray-200 rounded-lg p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Related news</h2>
        {source === "cache" && (
          <span
            className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded px-1.5 py-0.5"
            title="Live news search is unavailable, so these are headlines indexed earlier."
          >
            indexed
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Recent coverage from GDELT. Not used to produce the answer above.
      </p>

      {loading && <Skeleton />}

      {!loading && articles !== null && articles.length === 0 && (
        <p className="text-sm text-gray-500">
          {source === "unavailable"
            ? "Live news is unavailable right now."
            : "No recent coverage matched this question."}
        </p>
      )}

      {!loading && articles !== null && articles.length > 0 && (
        <ul className="space-y-3">
          {articles.map((article) => (
            <ArticleCard key={article.url} article={article} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <li className="border border-gray-100 rounded-md p-3 bg-gray-50">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded truncate">
          {article.domain}
        </span>
        {article.seen_at && (
          // "seen", never "published": GDELT reports when it first crawled the
          // article, and relabelling a crawl timestamp as a publication date
          // would be the one unsourced claim on the page.
          <span className="text-xs text-gray-400 shrink-0" title="When GDELT first saw this article">
            seen {timeAgo(article.seen_at)}
          </span>
        )}
      </div>

      <a
        href={article.url}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-gray-700 hover:text-teal-700 underline-offset-2 hover:underline"
      >
        {article.title}
      </a>

      {article.relevance !== "unscored" && (
        <div className="mt-1.5">
          <span
            title={RELEVANCE_TOOLTIP}
            className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${RELEVANCE_STYLES[article.relevance]}`}
          >
            {RELEVANCE_LABELS[article.relevance]}
          </span>
        </div>
      )}
    </li>
  );
}

/**
 * The panel's shape is known, so placeholders read better than a spinner --
 * the column doesn't jump when the articles land.
 */
function Skeleton() {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="border border-gray-100 rounded-md p-3 bg-gray-50 animate-pulse">
          <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-full bg-gray-200 rounded mb-1" />
          <div className="h-3 w-2/3 bg-gray-200 rounded" />
        </li>
      ))}
    </ul>
  );
}
