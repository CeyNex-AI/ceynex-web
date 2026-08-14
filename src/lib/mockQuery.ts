import type { ForecastPoint, QueryResponse } from "../types/contracts";

/**
 * Stands in for `POST /api/query` (ceynex-api-gateway, not built yet).
 * Figures below are real — pulled from the apparel knowledge graph loaded
 * in ceynex-core this session (EDB/JAAF connectors -> KG loader -> agent),
 * not placeholder numbers. Swap this module for a real `fetch("/api/query")`
 * once the gateway exists; QueryResponse's shape won't need to change.
 *
 * The forecast block is illustrative only (a simple linear extrapolation of
 * the real historical EDB figures, not a fitted model) — it exists so the
 * chart component has real-shaped data to render the SRS 3.1.3-required
 * confidence band against. Replace once ceynex-apparel-pipeline's forecast
 * model exists.
 */

function mockForecast(): ForecastPoint[] {
  // Linear extrapolation from real EDB US Apparel figures (2020-2024) —
  // illustrative only, see module docstring.
  return [
    { period: "2025", point: 1_950_000_000, lower: 1_700_000_000, upper: 2_200_000_000, unit: "USD" },
    { period: "2026", point: 2_020_000_000, lower: 1_680_000_000, upper: 2_360_000_000, unit: "USD" },
    { period: "2027", point: 2_090_000_000, lower: 1_650_000_000, upper: 2_530_000_000, unit: "USD" },
  ];
}

const RESPONSES: Record<string, QueryResponse> = {
  us: {
    query: "How are apparel exports to the United States doing?",
    final_answer:
      "Sri Lanka's apparel exports to the United States totaled $1.88B in 2024 (EDB), up from $1.78B in 2023. " +
      "JAAF's broader Total Apparel & Textiles figure for the US reached $1.95B in 2025. The US remains Sri " +
      "Lanka's largest single apparel export market by a wide margin.",
    final_confidence: 0.74,
    merged_evidence: [
      {
        source_id: "EDB",
        claim: "Sri Lanka's EDB-reported Apparel sub-category exports to USA, most recent 5 years.",
        detail:
          "MATCH (:Country {iso3:'LKA'})-[:REPORTED]->(r:ExportRecord {source_id:'EDB'})" +
          "-[:TO]->(:Country {iso3:'USA'}), (r)-[:OF]->(p:Product) WHERE p.key IN " +
          "['apparel:apprel','apparel:apparel'] AND r.frequency = 'A' RETURN r.period_start, r.export_value_usd",
        period: "2024-01-01",
      },
      {
        source_id: "JAAF",
        claim: "JAAF-reported Total apparel & textile exports to USA (broader category than EDB's Apparel sub-category above).",
        detail:
          "MATCH (:Country {iso3:'LKA'})-[:REPORTED]->(r:ExportRecord {source_id:'JAAF'})" +
          "-[:TO]->(:Country {iso3:'USA'}) WHERE r.frequency = 'M' WITH date.truncate('year', " +
          "r.period_start) AS year, sum(r.export_value_usd) AS total RETURN year, total",
        period: "2025-05-01",
      },
    ],
    forecast: mockForecast(),
    degraded: true,
  },
  overview: {
    query: "What are Sri Lanka's top apparel export markets?",
    final_answer:
      "Sri Lanka's top apparel export markets in 2024 (EDB Apparel sub-category): United States ($1.88B), " +
      "United Kingdom ($660M), Italy ($472M), Germany ($251M), and the Netherlands ($219M).",
    final_confidence: 0.6,
    merged_evidence: [
      {
        source_id: "EDB",
        claim: "Sri Lanka's top 5 apparel-export destination markets (Apparel sub-category), latest available year.",
        detail:
          "MATCH (:Country {iso3:'LKA'})-[:REPORTED]->(r:ExportRecord {source_id:'EDB'})" +
          "-[:TO]->(partner:Country), (r)-[:OF]->(p:Product) WHERE p.key IN " +
          "['apparel:apprel','apparel:apparel'] AND r.frequency = 'A' AND partner.iso3 <> 'WLD' " +
          "RETURN partner.iso3, r.export_value_usd ORDER BY r.export_value_usd DESC LIMIT 5",
        period: "2024-01-01",
      },
    ],
    degraded: true,
  },
};

function pickResponse(query: string): QueryResponse {
  const q = query.toLowerCase();
  if (q.includes("united states") || q.includes(" us ") || q.includes("usa") || q.endsWith(" us")) {
    return RESPONSES.us;
  }
  return RESPONSES.overview;
}

export async function runQuery(query: string): Promise<QueryResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { ...pickResponse(query), query };
}
