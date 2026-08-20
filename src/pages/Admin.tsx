import { useEffect, useState } from "react";

/**
 * There's no admin API to back user/role management, so rather than fabricate
 * one, this reuses the real GET /health endpoint (same one nginx proxies for
 * the app's own health check) to show actual system status -- real data,
 * just not the kind of "admin panel" the name usually implies.
 */
interface HealthResponse {
  status: string;
  postgres: boolean;
  neo4j: boolean;
  llm: boolean;
  detail?: {
    fact_trade_rows?: number;
    reasoning?: string;
  };
}

function StatusRow({ label, up, note }: { label: string; up: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${up ? "bg-emerald-500" : "bg-red-500"}`} />
        <span className="text-sm text-gray-800">{label}</span>
      </div>
      <span className={`text-xs font-medium ${up ? "text-emerald-700" : "text-red-700"}`}>
        {note ?? (up ? "up" : "down")}
      </span>
    </div>
  );
}

export default function Admin() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/health")
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then(setHealth)
      .catch(() => setError("Couldn't reach the health endpoint."));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Admin</h1>
        <p className="text-sm text-gray-500 mb-6">
          No admin API exists yet — this is a real system status view instead.
        </p>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          {error && <p className="text-sm text-gray-500">{error}</p>}
          {!error && !health && <p className="text-sm text-gray-400">Checking system status…</p>}
          {health && (
            <>
              <StatusRow label="Postgres" up={health.postgres} />
              <StatusRow label="Neo4j" up={health.neo4j} />
              <StatusRow
                label="LLM reasoning"
                up={health.llm}
                note={health.llm ? "up" : "degraded"}
              />
              {health.detail?.fact_trade_rows !== undefined && (
                <div className="pt-3 mt-1 text-xs text-gray-400">
                  {health.detail.fact_trade_rows.toLocaleString()} fact_trade rows
                </div>
              )}
              {health.detail?.reasoning && (
                <div className="text-xs text-gray-400">{health.detail.reasoning}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
