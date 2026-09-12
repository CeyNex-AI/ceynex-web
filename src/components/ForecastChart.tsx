import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint } from "../types/contracts";

/**
 * SRS 3.1.3: a forecast must never be presented as an unqualified point
 * estimate — the shaded band here (lower..upper) is required, not optional.
 * Implemented as two stacked Areas (a transparent base up to `lower`, then
 * a shaded range from `lower` to `upper`) topped with a Line for the point
 * forecast — the standard Recharts confidence-band pattern.
 */
export default function ForecastChart({ data }: { data: ForecastPoint[] }) {
  if (data.length === 0) return null;

  const unit = data[0].unit;
  const chartData = data.map((d) => ({
    period: d.period,
    point: d.point,
    lowerBase: d.lower,
    bandRange: d.upper - d.lower,
    lower: d.lower,
    upper: d.upper,
  }));

  const formatValue = (v: number) =>
    unit === "USD" ? `$${(v / 1_000_000).toFixed(0)}M` : `${v.toLocaleString()} ${unit}`;

  return (
    <div className="cx-panel p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="cx-panel-title">Forecast</h2>
        <span className="text-xs text-gray-500">shaded band = uncertainty interval</span>
      </div>
      {/* The chart is an SVG rendered by Recharts with no text equivalent of
       * its own -- a screen reader gets nothing from it. aria-hidden pulls it
       * out of the accessibility tree entirely; the sr-only table below is
       * the real, complete text equivalent (every period/lower/upper, not
       * just a compressed summary), so nothing is actually lost. */}
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--color-gray-500)" }}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--color-gray-500)" }}
              width={70}
            />
            <Tooltip content={<ForecastTooltip formatValue={formatValue} />} />
            <Area
              type="monotone"
              dataKey="lowerBase"
              stackId="band"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="bandRange"
              stackId="band"
              stroke="none"
              fill="var(--color-teal-500)"
              fillOpacity={0.16}
              isAnimationActive={false}
              name="Confidence interval"
            />
            <Line
              type="monotone"
              dataKey="point"
              stroke="var(--color-teal-600)"
              strokeWidth={2}
              dot={{ r: 4, fill: "#fff", stroke: "var(--color-teal-600)", strokeWidth: 2 }}
              name="Forecast"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Forecast by period, with an 80% confidence interval</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Forecast</th>
            <th scope="col">Lower bound</th>
            <th scope="col">Upper bound</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.period}>
              <th scope="row">{d.period}</th>
              <td>{formatValue(d.point)}</td>
              <td>{formatValue(d.lower)}</td>
              <td>{formatValue(d.upper)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TooltipDatum {
  dataKey?: string;
  value?: number;
}

function ForecastTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: TooltipDatum[];
  label?: string;
  formatValue: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload.find((p) => p.dataKey === "point")?.value;
  const lower = payload.find((p) => p.dataKey === "lower")?.value;
  const upper = payload.find((p) => p.dataKey === "upper")?.value;
  if (point === undefined) return null;

  return (
    <div className="cx-panel-flat px-3 py-2 text-xs font-mono">
      <p className="font-sans font-semibold text-gray-900 mb-1">{label}</p>
      <p className="text-teal-700">Forecast: {formatValue(point)}</p>
      {lower !== undefined && upper !== undefined && (
        <p className="text-gray-500">
          Range: {formatValue(lower)} to {formatValue(upper)}
        </p>
      )}
    </div>
  );
}
