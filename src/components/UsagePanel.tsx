/**
 * What the language models cost, and what the limits are — backend D15.
 *
 * **SRS 3.4.6 is why this exists**, and it is worth being precise about which
 * half: the rate limiter has been enforcing since it shipped, but the
 * requirement asks for restrictions to be "disclosed to the user within the
 * application rather than enforced silently". Until there was a page saying so,
 * it was enforcing silently. The limits list below is that disclosure — so it is
 * a requirement being met, not a dashboard.
 *
 * The chart follows the pattern `ForecastChart` and `KnowledgeGraphPanel`
 * already use: the bars are `aria-hidden` and an `sr-only` table beside them
 * carries the same numbers as text, because an SVG has no text equivalent.
 */

import { useEffect, useState } from "react";
import type { UsageLimits, UsageSummary } from "../lib/accountApi";
import { fetchUsage, fetchUsageLimits } from "../lib/accountApi";
import { Card, ErrorBanner, Skeleton } from "./ui";

function money(value: number): string {
  return value < 0.01 && value > 0 ? `$${value.toFixed(6)}` : `$${value.toFixed(2)}`;
}

/** "00:00 UTC (05:30 your time)" — the limit is a UTC day, the reader is not. */
function resetTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "00:00 UTC";
  const local = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `00:00 UTC (${local} your time)`;
}

export default function UsagePanel({ scope = "user" }: { scope?: "user" | "all" }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchUsage(30, scope), scope === "user" ? fetchUsageLimits() : null])
      .then(([summary, lim]) => {
        if (!live) return;
        setUsage(summary);
        setLimits(lim);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Could not load usage.");
      });
    return () => {
      live = false;
    };
  }, [scope]);

  if (error) return <ErrorBanner>{error}</ErrorBanner>;
  if (!usage) return <Skeleton />;

  const peak = Math.max(...usage.by_day.map((d) => d.cost_usd), 0.000001);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-medium text-gray-900 mb-3">
          {scope === "all" ? "All users" : "Your usage"} — last {usage.days} days
        </h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            ["Cost", money(usage.total_cost_usd)],
            ["Model calls", usage.total_calls.toLocaleString()],
            ["Tokens in", usage.total_tokens_in.toLocaleString()],
            ["Tokens out", usage.total_tokens_out.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 rounded-md px-3 py-2">
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        {usage.by_day.length > 0 && (
          <div className="mt-4">
            {/* Pulled from the a11y tree; the table below is the equivalent. */}
            <div aria-hidden="true" className="flex items-end gap-1 h-24">
              {usage.by_day.map((day) => (
                <div
                  key={day.key}
                  title={`${day.key}: ${money(day.cost_usd)}`}
                  style={{ height: `${Math.max(2, (day.cost_usd / peak) * 100)}%` }}
                  className="flex-1 bg-teal-500/70 rounded-t-sm min-w-[3px]"
                />
              ))}
            </div>
            <table className="sr-only">
              <caption>Cost and model calls per day</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Calls</th>
                  <th scope="col">Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {usage.by_day.map((day) => (
                  <tr key={day.key}>
                    <th scope="row">{day.key}</th>
                    <td>{day.calls}</td>
                    <td>{day.cost_usd.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {usage.by_role.length > 0 && (
        <Card className="p-5">
          <h3 className="font-medium text-gray-900 mb-3">Where it went</h3>
          <ul className="text-sm divide-y divide-gray-100">
            {usage.by_role.map((row) => (
              <li key={row.key} className="flex justify-between gap-4 py-1.5">
                <span className="text-gray-700 font-mono text-xs">{row.key}</span>
                <span className="text-gray-500 shrink-0">
                  {row.calls} × · {money(row.cost_usd)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {limits && (
        <Card className="p-5">
          <h3 className="font-medium text-gray-900 mb-1">Limits that apply to your account</h3>
          <p className="text-xs text-gray-500 mb-3">
            Shown here rather than applied silently, as the system's usage policy requires.
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            {limits.limits.map((limit) => (
              <li key={limit.key}>{limit.key}</li>
            ))}
          </ul>
          {limits.per_user_daily_cap_usd > 0 && (
            <p className="mt-3 text-sm text-gray-600">
              Your daily model budget: {money(limits.per_user_daily_cap_usd)}. Used today:{" "}
              {money(limits.spent_today_by_you_usd)}.
              {limits.resets_at && <> Resets at {resetTime(limits.resets_at)}.</>}
              {limits.your_budget_spent && (
                // What reaching the limit *means*, not just that it was reached:
                // answers keep coming, only the model-written prose stops.
                <span className="block text-xs text-amber-800 mt-1">
                  <span aria-hidden="true">⚠ </span>
                  Used up for today. Until it resets, answers still carry their figures,
                  evidence and confidence, but without model-written prose.
                </span>
              )}
            </p>
          )}
          {limits.daily_spend_cap_usd > 0 && (
            <p className="mt-3 text-sm text-gray-600">
              Daily model-spend cap: {money(limits.daily_spend_cap_usd)}. Spent today:{" "}
              {money(limits.spent_today_usd)}.
              {limits.deployment_cap_spent && (
                <span className="block text-xs text-amber-800 mt-1">
                  <span aria-hidden="true">⚠ </span>
                  Reached for the whole deployment today; answers are figures and evidence
                  without model-written prose until it resets.
                </span>
              )}
              {limits.cap_is_per_worker && (
                // Said plainly rather than hidden: the cap is enforced per
                // server process, so the real ceiling is a multiple of it. A page
                // presenting the cap as exact would be the silent enforcement the
                // requirement is about.
                <span className="block text-xs text-amber-700 mt-1">
                  The cap is applied per server process, and this deployment runs{" "}
                  {limits.worker_count}. Actual spend can reach {limits.worker_count}× the
                  figure above before it takes effect.
                </span>
              )}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
