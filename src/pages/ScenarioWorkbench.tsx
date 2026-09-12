/**
 * The scenario workbench (backend deviation D17, SRS 3.1.5).
 *
 * The trade-economics analysis simulates a rupee depreciation, a tariff, or the
 * loss of a preference from a question. This page runs the same three shocks
 * from sliders and re-runs in place, over the same formulas
 * (`ceynex/models/shocks.py`) and the same baseline read. Nothing on it is
 * written by a model.
 *
 * **Every parameter is shown with where it came from.** Several sources in the
 * backend's `config/elasticities.yaml` are still `TBD` placeholders. They are
 * printed as such: a slider over a number nobody has sourced must not look like
 * a fitted estimate, and hiding the column would be the quiet way to make it
 * look like one.
 *
 * Accessibility: every control is a labelled native input (range paired with a
 * number field so a value can be typed as well as dragged), the result region
 * is announced through one polite `role="status"` line rather than by
 * re-reading the whole panel, and nothing animates.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EvidencePanel from "../components/EvidencePanel";
import { Button, Card, ErrorBanner, Pill } from "../components/ui";
import {
  ITEMS,
  PARAMETERS,
  SECTORS,
  SHOCKS,
  formatPct,
  formatUsd,
  parametersFor,
  parseWorkbenchParams,
  toSearchParams,
  withSector,
  withShock,
  type ParameterControl,
  type WorkbenchState,
} from "../lib/scenario";
import { runScenario, type ScenarioParameter, type ScenarioResponse } from "../lib/scenarioApi";
import usePageTitle from "../lib/usePageTitle";

/** How long a slider may keep moving before a run is sent. */
const DEBOUNCE_MS = 300;

export default function ScenarioWorkbench() {
  usePageTitle("Scenario workbench");
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<WorkbenchState>(() =>
    parseWorkbenchParams(searchParams.toString()),
  );
  const [result, setResult] = useState<ScenarioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const runCounter = useRef(0);

  // Keep the URL in step with the controls, so a position can be shared by
  // copying the address — and so Back returns to the previous one.
  useEffect(() => {
    setSearchParams(toSearchParams(state), { replace: true });
  }, [state, setSearchParams]);

  useEffect(() => {
    const run = ++runCounter.current;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPending(true);
      runScenario(
        {
          shock: state.shock,
          sector: state.sector,
          item: state.item,
          magnitude: state.shock === "agreement" ? 0 : state.magnitude,
          overrides: state.overrides,
        },
        controller.signal,
      )
        .then((response) => {
          if (run !== runCounter.current) return; // a later position superseded this one
          setResult(response);
          setError(null);
          setAnnouncement(describeRun(response));
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || run !== runCounter.current) return;
          setError(err instanceof Error ? err.message : "The scenario could not be run.");
        })
        .finally(() => {
          if (run === runCounter.current) setPending(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state]);

  const controls = useMemo(() => parametersFor(state.shock), [state.shock]);
  const parameters = useMemo(() => {
    const byName = new Map<string, ScenarioParameter>();
    for (const p of result?.outcome?.parameters ?? []) byName.set(p.name, p);
    return byName;
  }, [result]);

  const setOverride = useCallback((name: ParameterControl["name"], value: number | undefined) => {
    setState((current) => {
      const overrides = { ...current.overrides };
      if (value === undefined) delete overrides[name];
      else overrides[name] = value;
      return { ...current, overrides };
    });
  }, []);

  const shock = SHOCKS.find((s) => s.value === state.shock)!;

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-1.5 tracking-tight">
            Scenario workbench
          </h1>
          <p className="text-sm text-gray-500 max-w-3xl">
            Move a shock and the assumptions behind it; the revenue effect re-runs in place over
            the same formulas and the same baseline the analysis uses. Nothing here is written
            by a model, and every parameter is shown with where its value came from.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Card as="section" className="p-5 space-y-5" aria-labelledby="scenario-controls">
            <h2 id="scenario-controls" className="text-sm font-semibold text-gray-900">
              Shock
            </h2>

            <fieldset className="space-y-1.5">
              <legend className="sr-only">Kind of shock</legend>
              {SHOCKS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="shock"
                    value={option.value}
                    checked={state.shock === option.value}
                    onChange={() => setState((current) => withShock(current, option.value))}
                    className="accent-teal-600"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold text-gray-900 mb-1">Sector</legend>
              {SECTORS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="sector"
                    value={option.value}
                    checked={state.sector === option.value}
                    onChange={() => setState((current) => withSector(current, option.value))}
                    className="accent-teal-600"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            <div>
              <label htmlFor="scenario-item" className="block text-sm font-semibold text-gray-900 mb-1">
                Item
              </label>
              <select
                id="scenario-item"
                value={state.item}
                onChange={(event) => setState((current) => ({ ...current, item: event.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white
                           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                {ITEMS[state.sector].map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {shock.magnitudeLabel && (
              <RangeField
                id="scenario-magnitude"
                label={shock.magnitudeLabel}
                hint={
                  state.shock === "fx"
                    ? "Negative is an appreciation."
                    : "Percentage points added to the buyer's tariff."
                }
                min={-50}
                max={50}
                step={0.5}
                unit="%"
                value={round(state.magnitude * 100, 2)}
                onChange={(value) => setState((current) => ({ ...current, magnitude: value / 100 }))}
              />
            )}

            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Assumptions</h2>
              {controls.map((control) => {
                const known = parameters.get(control.name);
                const scale = control.percent ? 100 : 1;
                const shown = state.overrides[control.name] ?? known?.default;
                return (
                  <RangeField
                    key={control.name}
                    id={`scenario-${control.name}`}
                    label={control.label}
                    hint={control.hint}
                    min={control.min * scale}
                    max={control.max * scale}
                    step={control.step * scale}
                    unit={control.percent ? "%" : ""}
                    value={shown === undefined ? undefined : round(shown * scale, 4)}
                    onChange={(value) => setOverride(control.name, value / scale)}
                    defaultValue={known ? round(known.default * scale, 4) : undefined}
                    basis={known?.basis}
                    onReset={
                      state.overrides[control.name] !== undefined
                        ? () => setOverride(control.name, undefined)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </Card>

          <div className="space-y-6 min-w-0">
            <p role="status" aria-live="polite" className="text-xs text-gray-500">
              {pending ? "Recomputing…" : announcement}
            </p>
            {error && <ErrorBanner>{error}</ErrorBanner>}

            {result && <Results result={result} />}

            {result && result.outcome && (
              <ParametersTable parameters={result.outcome.parameters} />
            )}

            {result && (
              <Card as="section" className="p-5" aria-labelledby="scenario-assumptions">
                <h2 id="scenario-assumptions" className="text-sm font-semibold text-gray-900 mb-2">
                  Stated assumptions
                </h2>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {result.assumptions.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </Card>
            )}

            {result && result.evidence.length > 0 && (
              <EvidencePanel evidence={result.evidence} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function describeRun(response: ScenarioResponse): string {
  if (response.refused) return `Not simulated: ${response.reason ?? "the graph cannot support it"}.`;
  const outcome = response.outcome!;
  return `Recomputed: ${formatPct(outcome.revenue_change_pct)} on a ${response.baseline_year} baseline.`;
}

/**
 * A range input paired with a number input over the same value, so the value
 * can be dragged or typed; one label, one hint, both inputs described by it.
 */
function RangeField({
  id,
  label,
  hint,
  min,
  max,
  step,
  unit,
  value,
  onChange,
  defaultValue,
  basis,
  onReset,
}: {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: number | undefined;
  onChange: (value: number) => void;
  defaultValue?: number;
  basis?: string;
  onReset?: () => void;
}) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-gray-800">
          {label}
        </label>
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} aria-label={`Reset ${label} to its default`}>
            Reset
          </Button>
        )}
      </div>
      <p id={hintId} className="text-xs text-gray-500 mb-1">
        {hint}
        {defaultValue !== undefined && (
          <>
            {" "}
            Default {defaultValue}
            {unit}
            {basis && basis !== "override" && ` (${basis.replace("_", " ")})`}.
          </>
        )}
      </p>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? defaultValue ?? min}
          disabled={value === undefined}
          aria-describedby={hintId}
          onChange={(event) => onChange(Number(event.target.value))}
          className="flex-1 accent-teal-600 disabled:opacity-50"
        />
        <label className="sr-only" htmlFor={`${id}-number`}>
          {label}, exact value
        </label>
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <input
            id={`${id}-number`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value ?? ""}
            disabled={value === undefined}
            aria-describedby={hintId}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
            }}
            className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm bg-white
                       disabled:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-teal-600"
          />
          {unit && <span aria-hidden="true">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function Results({ result }: { result: ScenarioResponse }) {
  if (result.refused) {
    return (
      <Card as="section" className="p-5 border-amber-200 bg-amber-50" aria-labelledby="scenario-result">
        <h2 id="scenario-result" className="text-sm font-semibold text-amber-900 mb-1">
          <span aria-hidden="true">⚠ </span>Not simulated
        </h2>
        <p className="text-sm text-amber-900">{result.reason}</p>
        {result.baseline_usd != null && (
          <p className="text-sm text-amber-900 mt-2">
            The {result.baseline_year} baseline is known — USD{" "}
            {result.baseline_usd.toLocaleString("en-US", { maximumFractionDigits: 0 })} — only the
            coverage needed to shock it is missing.
          </p>
        )}
      </Card>
    );
  }
  const outcome = result.outcome!;
  const rows: [string, string][] = [
    [
      `Baseline (${result.baseline_year})`,
      `USD ${outcome.baseline_usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    ],
    ["Revenue change", `${formatUsd(outcome.revenue_change_usd)} (${formatPct(outcome.revenue_change_pct)})`],
    ["Buyer's price", formatPct(outcome.price_change_pct)],
    ["Volume", formatPct(outcome.volume_change_pct)],
  ];
  return (
    <Card as="section" className="p-5" aria-labelledby="scenario-result">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 id="scenario-result" className="text-sm font-semibold text-gray-900">
          {SHOCKS.find((s) => s.value === outcome.shock)?.label} · {result.item.replace("_", " ")}
        </h2>
        <Pill tone="gray">deterministic · no model call</Pill>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt className="text-xs text-gray-500">{term}</dt>
            <dd className="text-lg font-semibold text-gray-900 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-gray-500 mt-3">{outcome.detail}</p>
      {result.baseline_cypher && (
        <details className="mt-3">
          <summary className="text-xs text-teal-700 cursor-pointer">
            The query that read the baseline
          </summary>
          <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
            {result.baseline_cypher}
          </pre>
        </details>
      )}
    </Card>
  );
}

function ParametersTable({ parameters }: { parameters: ScenarioParameter[] }) {
  const labels = new Map(PARAMETERS.map((p) => [p.name, p]));
  return (
    <Card as="section" className="p-5" aria-labelledby="scenario-parameters">
      <h2 id="scenario-parameters" className="text-sm font-semibold text-gray-900 mb-1">
        Parameters used, and where they come from
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        These are the values the analysis itself uses (<code>config/elasticities.yaml</code>). A
        source marked <strong>TBD</strong> is a literature placeholder that nobody has yet verified
        against a published estimate — shown as such rather than tidied away.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th scope="col" className="py-1.5 pr-3 font-medium">Parameter</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Value</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Default</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Basis</th>
              <th scope="col" className="py-1.5 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((p) => {
              const control = labels.get(p.name);
              const fmt = (v: number) => (control?.percent ? `${round(v * 100, 2)}%` : String(round(v, 4)));
              return (
                <tr key={p.name} className="border-b border-gray-100 align-top">
                  <th scope="row" className="py-1.5 pr-3 font-medium text-gray-800 text-left">
                    {control?.label ?? p.name}
                  </th>
                  <td className="py-1.5 pr-3 tabular-nums">
                    {fmt(p.value)}
                    {p.overridden && (
                      <Pill tone="amber" className="ml-2">
                        overridden
                      </Pill>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums text-gray-600">{fmt(p.default)}</td>
                  <td className="py-1.5 pr-3 text-gray-600">{p.basis.replace("_", " ")}</td>
                  <td className="py-1.5 text-gray-600 break-words">
                    {p.source.startsWith("TBD") ? (
                      <span className="text-amber-800">{p.source}</span>
                    ) : (
                      p.source
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
