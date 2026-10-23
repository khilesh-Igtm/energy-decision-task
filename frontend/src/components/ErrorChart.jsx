import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

/**
 * Format ISO datetime into readable tick string.
 */
function formatTick(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${day} ${month}`;
}

/**
 * Detailed ISO formatter for tooltip header.
 */
function formatTooltipHeader(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toUTCString().replace('GMT', 'UTC');
}

/**
 * Custom interactive tooltip for ErrorChart.
 */
function CustomErrorTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const errorVal = Number(payload[0]?.value);
  const isSurplus = errorVal >= 0;

  return (
    <div className="custom-chart-tooltip error-tooltip">
      <div className="tooltip-header">{formatTooltipHeader(label)}</div>
      <div className="tooltip-rows">
        <div className="tooltip-row">
          <span className="tooltip-label">Forecast Error:</span>
          <span className={`tooltip-value ${isSurplus ? 'text-positive' : 'text-negative'}`}>
            {isSurplus ? `+${errorVal.toLocaleString()}` : errorVal.toLocaleString()} MW
          </span>
        </div>
        <div className="tooltip-delta-badge">
          {isSurplus ? (
            <span className="badge-surplus">▲ Under-forecasted (Surplus Outturn)</span>
          ) : (
            <span className="badge-deficit">▼ Over-forecasted (Generation Deficit)</span>
          )}
        </div>
        <div className="tooltip-explanation">
          {isSurplus
            ? 'Actual outturn exceeded day-ahead expectations.'
            : 'Actual outturn fell below day-ahead commitment.'}
        </div>
      </div>
    </div>
  );
}

/**
 * Responsive BarChart displaying forecast error (Actual - Forecast) over time.
 */
export default function ErrorChart({ data = [] }) {
  return (
    <div className="chart-card error-chart-card">
      <div className="chart-card-header">
        <div>
          <h2 className="chart-title">Forecast Error Distribution (Actual − Forecast)</h2>
          <p className="chart-subtitle">
            Positive error (green) indicates under-prediction; negative error (red) indicates over-prediction
          </p>
        </div>

        {/* Legend pills */}
        <div className="error-legend-pills">
          <span className="legend-pill pill-surplus">
            <span className="pill-square bg-emerald" />
            Actual &gt; Forecast (+ Surplus)
          </span>
          <span className="legend-pill pill-deficit">
            <span className="pill-square bg-rose" />
            Actual &lt; Forecast (− Shortfall)
          </span>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={290}>
          <BarChart
            data={data}
            margin={{ top: 15, right: 30, left: 15, bottom: 15 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="startTime"
              tickFormatter={formatTick}
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              minTickGap={45}
              tickLine={{ stroke: '#475569' }}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              unit=" MW"
              width={65}
              tickLine={{ stroke: '#475569' }}
            />
            <Tooltip content={<CustomErrorTooltip />} />
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.2} />

            <Bar dataKey="error" maxBarSize={6} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.error >= 0 ? '#10b981' : '#f43f5e'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
