/**
 * GET /api/news/search and /api/news/trending, proxied same-origin the same way
 * as queryApi.ts.
 *
 * Both endpoints require sign-in (SRS FR-ACC-01), like POST /api/query. The
 * token goes through `apiFetch`, so a session ended elsewhere takes the usual
 * signed-out path instead of leaving the panel quietly "unavailable".
 * `optionalAuthHeaders()` rather than `authHeaders()`: the latter throws before
 * the request is made when there is no token, and the server's 401 is the one
 * place that decision should live. Every page that shows news is behind
 * RequireAuth anyway.
 *
 * These types live here rather than in types/contracts.ts. That file mirrors the
 * *frozen* Python contracts, and news is not one of them; putting NewsArticle
 * there would imply it is. adminApi.ts and historyApi.ts already keep their own
 * shapes locally.
 *
 * Note what is NOT here: no SourceId, no claim, no detail. News is not evidence
 * -- it sits beside the answer, labelled, and never inside it. Keeping the
 * SourceId union closed is the frontend half of that guarantee.
 */

import { apiFetch, optionalAuthHeaders } from "./apiFetch";

/** "gdelt" = live, "cache" = previously indexed headlines, "unavailable" = neither. */
export type NewsSource = "gdelt" | "cache" | "unavailable";

/** What the UI renders. The raw score travels too, but is deliberately not shown. */
export type Relevance = "strong" | "related" | "loose" | "unscored";

export interface NewsArticle {
  url: string;
  title: string;
  domain: string;
  source_country: string;
  /** When GDELT first *saw* the article, not when it was published. */
  seen_at: string | null;
  relevance_score: number | null;
  relevance: Relevance;
}

export interface NewsSearchResult {
  query: string;
  articles: NewsArticle[];
  source: NewsSource;
}

export interface TrendingArticle {
  url: string;
  title: string;
  domain: string;
  seen_at: string | null;
}

export interface TrendingTopic {
  topic_id: string;
  label: string;
  /** The question to put in the query box -- not the label, which reads as a fragment. */
  prompt: string;
  scope: string;
  articles_24h: number;
  baseline_24h: number;
  delta_pct: number;
  direction: "surging" | "up" | "steady" | "down";
  top_articles: TrendingArticle[];
}

export type TrendingStatus = "warming" | "ready" | "stale" | "unavailable";

export interface TrendingResult {
  status: TrendingStatus;
  computed_at: string | null;
  partial: boolean;
  scopes: Record<string, TrendingTopic[]>;
}

export async function fetchNewsSearch(
  query: string,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<NewsSearchResult> {
  const params = new URLSearchParams({ q: query });
  if (options?.limit) params.set("limit", String(options.limit));

  const res = await apiFetch(`/api/news/search?${params}`, {
    headers: optionalAuthHeaders(),
    signal: options?.signal,
  });
  if (!res.ok) {
    throw new Error(`News search failed (${res.status}).`);
  }
  return res.json();
}

export async function fetchTrending(options?: { signal?: AbortSignal }): Promise<TrendingResult> {
  const res = await apiFetch("/api/news/trending", {
    headers: optionalAuthHeaders(),
    signal: options?.signal,
  });
  if (!res.ok) {
    throw new Error(`Couldn't load trending topics (${res.status}).`);
  }
  return res.json();
}

/** Scope ids the backend emits, with the headings the panel shows for them. */
export const SCOPE_LABELS: Record<string, string> = {
  sri_lanka: "Sri Lanka",
  global: "Global",
};
