/**
 * How current the data is (execution plan §5).
 *
 * A figure invites exactly one follow-up — *is that the latest you have?* — and
 * until now the only place to find out was the admin page. One line, one query,
 * and it answers the first credibility question anyone asks.
 *
 * Silent when unavailable rather than showing an error: a missing ribbon is not
 * a broken page.
 */

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiFetch";

interface Freshness {
  available: boolean;
  latest_observation: string | null;
  observations: number;
  last_ingest_at: string | null;
}

function ago(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(days)) return null;
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default function FreshnessRibbon() {
  const [data, setData] = useState<Freshness | null>(null);

  useEffect(() => {
    let live = true;
    apiFetch<Freshness>("/api/data/freshness", { auth: true })
      .then((value) => live && setData(value))
      .catch(() => {
        /* A ribbon is not worth an error banner. */
      });
    return () => {
      live = false;
    };
  }, []);

  if (!data?.available || !data.latest_observation) return null;

  const year = data.latest_observation.slice(0, 4);
  const ingested = ago(data.last_ingest_at);

  return (
    <p className="text-xs text-gray-500">
      Trade data through {year} · {data.observations.toLocaleString()} observations
      {ingested ? ` · last updated ${ingested}` : ""}
    </p>
  );
}
