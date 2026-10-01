import { useEffect, useState } from "react";
import { fetchPipelineFreshness, type PipelineFreshness, type SourceFreshnessItem } from "../lib/adminApi";
import timeAgo from "../lib/timeAgo";

/**
 * Every data source against its refresh cadence (FR-DAT-03, ceynex-core D19).
 *
 * The run log below this card answers "what ran"; this answers "is each source
 * current", which is the question the monthly refresh exists for. A source past
 * its cadence is stale (amber). One refreshed by hand from saved files has no
 * cadence and is marked manual rather than ever being called stale. A failure
 * newer than the last success is shown, because that is usually why a source
 * went stale.
 */
export default function FreshnessCard() {
  const [data, setData] = useState<PipelineFreshness | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPipelineFreshness()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load data freshness."));
  }, []);

  return (
    <div className="cx-panel-flat p-5">
      <h2 className="cx-panel-title">Data freshness</h2>
      <p className="text-xs text-gray-500 mt-1 mb-3">
        {data
          ? data.stale === 0
            ? "Every scheduled source is within its refresh cadence."
            : `${data.stale} source${data.stale === 1 ? " is" : "s are"} past its refresh cadence.`
          : "Each source's last successful ingest, against how often it should refresh."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!data && !error && <p className="text-sm text-gray-500">Loading…</p>}
      {data && (
        <table className="w-full text-sm">
          <caption className="sr-only">Data freshness by source</caption>
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th scope="col" className="py-1.5 pr-3 font-medium">Source</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Refresh</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Last success</th>
              <th scope="col" className="py-1.5 font-medium">State</th>
            </tr>
          </thead>
          <tbody>
            {data.sources.map((source) => (
              <SourceRow key={source.source_id} source={source} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SourceRow({ source }: { source: SourceFreshnessItem }) {
  const failedSince =
    source.last_failure_at !== null &&
    (source.last_success_at === null || source.last_failure_at > source.last_success_at);
  return (
    <tr className="border-b border-gray-100 last:border-0 align-top">
      <th scope="row" className="py-1.5 pr-3 font-medium text-gray-800 text-left">
        {source.source_id}
        {failedSince && (
          <span className="block text-xs font-normal text-red-700">
            Failed {timeAgo(source.last_failure_at!)}
            {source.last_error ? `: ${source.last_error}` : ""}
          </span>
        )}
      </th>
      <td className="py-1.5 pr-3 text-gray-600">
        {source.cadence_days === null
          ? "by hand"
          : `${source.refresh ? "monthly" : "by hand"}, within ${source.cadence_days} days`}
      </td>
      <td className="py-1.5 pr-3 text-gray-600">
        {source.last_success_at ? (
          <>
            {timeAgo(source.last_success_at)}
            {source.last_success_rows !== null && (
              <span className="text-gray-500"> · {source.last_success_rows.toLocaleString()} rows</span>
            )}
          </>
        ) : (
          "never"
        )}
      </td>
      <td className="py-1.5">
        {source.cadence_days === null ? (
          <span className="text-xs text-gray-500">manual</span>
        ) : source.stale ? (
          <span className="text-xs font-medium text-amber-700">stale</span>
        ) : (
          <span className="text-xs font-medium text-emerald-700">current</span>
        )}
      </td>
    </tr>
  );
}
