/**
 * The workbench's pure logic (backend deviation D17): what the controls are,
 * how a page state round-trips through the URL, and how a chat answer offers
 * to open one. No fetching, no React — so it is tested without either.
 */

import type { ParameterName, Sector, Shock } from "./scenarioApi";

export const SHOCKS: { value: Shock; label: string; magnitudeLabel: string | null }[] = [
  { value: "fx", label: "Rupee depreciation", magnitudeLabel: "Depreciation" },
  { value: "tariff", label: "Tariff in the buying market", magnitudeLabel: "Tariff" },
  // The agreement shock's magnitude is the MFN rate, which is a parameter.
  { value: "agreement", label: "Loss of a trade preference", magnitudeLabel: null },
];

export const SECTORS: { value: Sector; label: string }[] = [
  { value: "agriculture", label: "Agriculture" },
  { value: "apparel", label: "Apparel" },
];

/** The items the graph records, per sector — mirrors the agent's SECTOR_OF_ITEM. */
export const ITEMS: Record<Sector, { value: string; label: string }[]> = {
  agriculture: [
    { value: "tea", label: "Tea" },
    { value: "cinnamon", label: "Cinnamon" },
    { value: "rubber", label: "Rubber" },
    { value: "coconut", label: "Coconut" },
  ],
  apparel: [
    { value: "apparel_knit", label: "Knitted apparel (HS 61)" },
    { value: "apparel_woven", label: "Woven apparel (HS 62)" },
  ],
};

export interface ParameterControl {
  name: ParameterName;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  /** Shown as a percentage rather than a bare fraction. */
  percent: boolean;
  shocks: Shock[];
}

/** Bounds match the backend schema's, so a slider can never produce a 422. */
export const PARAMETERS: ParameterControl[] = [
  {
    name: "fx_pass_through",
    label: "FX pass-through",
    hint: "Share of a depreciation that reaches the foreign-currency price within a year.",
    min: 0, max: 1, step: 0.05, percent: false, shocks: ["fx"],
  },
  {
    name: "export_demand_elasticity",
    label: "Export demand elasticity",
    hint: "Percent change in volume per 1% change in the buyer's landed price. Negative.",
    min: -5, max: 0, step: 0.1, percent: false, shocks: ["fx", "tariff", "agreement"],
  },
  {
    name: "tariff_incidence",
    label: "Tariff incidence on the exporter",
    hint: "Share of a tariff borne by the Sri Lankan exporter rather than the importer.",
    min: 0, max: 1, step: 0.05, percent: false, shocks: ["tariff", "agreement"],
  },
  {
    name: "agreement_loss_mfn_tariff",
    label: "MFN tariff if the preference is lost",
    hint: "The rate that would apply once GSP+ or DCTS no longer does.",
    min: 0, max: 0.5, step: 0.005, percent: true, shocks: ["agreement"],
  },
];

export function parametersFor(shock: Shock): ParameterControl[] {
  return PARAMETERS.filter((p) => p.shocks.includes(shock));
}

export interface WorkbenchState {
  shock: Shock;
  sector: Sector;
  item: string;
  /** A fraction, as the API takes it. */
  magnitude: number;
  overrides: Partial<Record<ParameterName, number>>;
}

export const DEFAULT_STATE: WorkbenchState = {
  shock: "fx",
  sector: "agriculture",
  item: "tea",
  magnitude: 0.05,
  overrides: {},
};

const PARAMETER_NAMES = new Set<string>(PARAMETERS.map((p) => p.name));

function isShock(value: string | null): value is Shock {
  return SHOCKS.some((s) => s.value === value);
}

function isSector(value: string | null): value is Sector {
  return SECTORS.some((s) => s.value === value);
}

/**
 * A page state from a query string, ignoring anything malformed. Lets a chat
 * answer link straight into a pre-filled workbench, and lets a reader share a
 * position by copying the URL.
 */
export function parseWorkbenchParams(search: string): WorkbenchState {
  const params = new URLSearchParams(search);
  const state: WorkbenchState = { ...DEFAULT_STATE, overrides: {} };

  const shock = params.get("shock");
  if (isShock(shock)) state.shock = shock;
  const sector = params.get("sector");
  if (isSector(sector)) state.sector = sector;
  const item = params.get("item");
  state.item = ITEMS[state.sector].some((i) => i.value === item) && item
    ? item
    : ITEMS[state.sector][0].value;

  const magnitude = Number(params.get("magnitude"));
  if (params.has("magnitude") && Number.isFinite(magnitude) && Math.abs(magnitude) <= 1) {
    state.magnitude = magnitude;
  }

  for (const [key, raw] of params) {
    if (!PARAMETER_NAMES.has(key)) continue;
    const value = Number(raw);
    const control = PARAMETERS.find((p) => p.name === key)!;
    if (Number.isFinite(value) && value >= control.min && value <= control.max) {
      state.overrides[key as ParameterName] = value;
    }
  }
  return state;
}

/** The inverse: only what differs from the defaults, so URLs stay short. */
export function toSearchParams(state: WorkbenchState): string {
  const params = new URLSearchParams();
  params.set("shock", state.shock);
  params.set("sector", state.sector);
  params.set("item", state.item);
  if (state.shock !== "agreement") params.set("magnitude", String(state.magnitude));
  for (const control of parametersFor(state.shock)) {
    const value = state.overrides[control.name];
    if (value !== undefined) params.set(control.name, String(value));
  }
  return params.toString();
}

/** When the sector changes, the item must be one of the new sector's. */
export function withSector(state: WorkbenchState, sector: Sector): WorkbenchState {
  if (sector === state.sector) return state;
  return { ...state, sector, item: ITEMS[sector][0].value };
}

/** When the shock changes, overrides for parameters it does not use are dropped. */
export function withShock(state: WorkbenchState, shock: Shock): WorkbenchState {
  if (shock === state.shock) return state;
  const keep = new Set(parametersFor(shock).map((p) => p.name));
  const overrides: WorkbenchState["overrides"] = {};
  for (const [name, value] of Object.entries(state.overrides)) {
    if (keep.has(name as ParameterName) && value !== undefined) {
      overrides[name as ParameterName] = value;
    }
  }
  return { ...state, shock, overrides };
}

export function formatUsd(value: number): string {
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  return `${sign}USD ${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatPct(fraction: number, digits = 1): string {
  const value = fraction * 100;
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/**
 * Offer to open a chat answer in the workbench, when the analysis simulated
 * something. Only a trade-economics answer did, so only those get the link;
 * the shock and magnitude are read from the question the way the agent reads
 * them, as a starting position rather than a claim about what was run.
 */
export function workbenchHrefFor(
  question: string,
  answer: { route: string[]; sectors: string[] },
): string | null {
  if (!answer.route.includes("trade_economics")) return null;
  const lowered = question.toLowerCase();
  const shock: Shock =
    /gsp|dcts|preferen|agreement|trade deal/.test(lowered)
      ? "agreement"
      : /tariff|duty|duties|customs|import tax/.test(lowered)
        ? "tariff"
        : "fx";
  const sector: Sector = answer.sectors.includes("apparel") && !answer.sectors.includes("agriculture")
    ? "apparel"
    : "agriculture";
  const item =
    ITEMS[sector].find((i) => lowered.includes(i.value.split("_")[0]))?.value ??
    ITEMS[sector][0].value;
  const pct = /(\d+(?:\.\d+)?)\s*%/.exec(question);
  const magnitude = pct ? Math.min(1, Number(pct[1]) / 100) : DEFAULT_STATE.magnitude;
  return `/scenario?${toSearchParams({ shock, sector, item, magnitude, overrides: {} })}`;
}
