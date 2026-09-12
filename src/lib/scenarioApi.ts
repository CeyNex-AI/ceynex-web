/**
 * The scenario workbench's one call (backend deviation D17).
 *
 * `POST /api/scenario/run` is deterministic and model-free: two bounded graph
 * reads and the same arithmetic the trade-economics analysis uses. It is
 * authenticated, and has its own rate-limit allowance sized for a slider.
 */

import { apiJson } from "./apiFetch";
import type { Evidence } from "../types/contracts";

export type Shock = "fx" | "tariff" | "agreement";
export type Sector = "agriculture" | "apparel";
export type ParameterName =
  | "fx_pass_through"
  | "export_demand_elasticity"
  | "tariff_incidence"
  | "agreement_loss_mfn_tariff";

export interface ScenarioRequest {
  shock: Shock;
  sector: Sector;
  item?: string;
  /** A fraction: 0.05 is a 5% depreciation or a 5-point tariff. */
  magnitude: number;
  overrides?: Partial<Record<ParameterName, number>>;
}

export interface ScenarioParameter {
  name: ParameterName;
  value: number;
  default: number;
  /** literature_range | assumption | override | fallback | sourced */
  basis: string;
  /** Verbatim from config/elasticities.yaml — several are still "TBD". */
  source: string;
  overridden: boolean;
}

export interface ScenarioOutcome {
  shock: Shock;
  sector: Sector;
  baseline_usd: number;
  revenue_change_usd: number;
  revenue_change_pct: number;
  price_change_pct: number;
  volume_change_pct: number;
  parameters: ScenarioParameter[];
  detail: string;
}

export interface ScenarioResponse {
  shock: Shock;
  sector: Sector;
  item: string;
  magnitude: number;
  refused: boolean;
  reason: string | null;
  baseline_usd: number | null;
  baseline_year: number | null;
  baseline_cypher: string | null;
  outcome: ScenarioOutcome | null;
  assumptions: string[];
  evidence: Evidence[];
}

export function runScenario(body: ScenarioRequest, signal?: AbortSignal): Promise<ScenarioResponse> {
  return apiJson<ScenarioResponse>("/api/scenario/run", { method: "POST", body, auth: true, signal });
}
