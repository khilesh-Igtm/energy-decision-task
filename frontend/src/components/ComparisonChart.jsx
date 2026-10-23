import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
} from 'recharts';

/**
 * Format ISO datetime into readable tick string (e.g., "Jan 01" or "01 Jan 12:00").
 */
function formatTick(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  // If midnight, show Day + Month, else show Hour:Minute
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
 * Custom interactive tooltip for the Comparison LineChart.
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const actualItem = payload.find((p) => p.dataKey === 'actual');
  const forecastItem = payload.find((p) => p.dataKey === 'forecast');

  const actualVal = actualItem ? Number(actualItem.value) : null;
  const forecastVal = forecastItem ? Number(forecastItem.value) : null;
  const errorVal = actualVal !== null && forecastVal !== null ? actualVal - forecastVal : null;

  return (
    <div className="custom-chart-tooltip">
      <div className="tooltip-header">{formatTooltipHeader(label)}</div>
      <div className="tooltip-rows">
        {actualVal !== null && (
          <div className="tooltip-row actual-row">
            <span className="tooltip-legend-dot dot-actual" />
            <span className="tooltip-label">Actual Generation:</span>
            <span className="tooltip-value">{actualVal.toLocaleString()} MW</span>
          </div>
        )}
        {forecastVal !== null && (
          <div className="tooltip-row forecast-row">
            <span className="tooltip-legend-dot dot-forecast" />
            <span className="tooltip-label">Day-Ahead Forecast:</span>
            <span className="tooltip-value">{forecastVal.toLocaleString()} MW</span>
          </div>
        )}
        {errorVal !== null && (
          <div className="tooltip-row error-row">
            <span className="tooltip-legend-dot dot-error" />
            <span className="tooltip-label">Delta (Error):</span>
            <span className={`tooltip-value ${errorVal >= 0 ? 'text-positive' : 'text-negative'}`}>
              {errorVal > 0 ? `+${errorVal.toLocaleString()}` : errorVal.toLocaleString()} MW
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Wide, responsive Comparison LineChart displaying Actual vs. Forecast wind generation.
 */
export default function ComparisonChart({ data = [] }) {
  const [selectedRange, setSelectedRange] = useState('ALL');
  const [showActual, setShowActual] = useState(true);
  const [showForecast, setShowForecast] = useState(true);

  // Filter data based on selected quick range tab
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (selectedRange === 'ALL') return data;

    // Filter by day intervals in January 2026
    const filterByDayRange = (startDay, endDay) => {
      return data.filter((item) => {
        const d = new Date(item.startTime);
        const day = d.getUTCDate();
        return day >= startDay && day <= endDay;
      });
    };

    switch (selectedRange) {
      case 'W1': // Jan 1 - Jan 7
        return filterByDayRange(1, 7);
      case 'W2': // Jan 8 - Jan 14
        return filterByDayRange(8, 14);
      case 'W3': // Jan 15 - Jan 21
        return filterByDayRange(15, 21);
      case 'W4': // Jan 22 - Jan 31
        return filterByDayRange(22, 31);
      default:
        return data;
    }
  }, [data, selectedRange]);

  return (
    <div className="chart-card comparison-chart-card">
      <div className="chart-card-header">
        <div>
          <h2 className="chart-title">Actual vs. Day-Ahead Forecasted Wind Generation</h2>
          <p className="chart-subtitle">
            Solid line shows actual generation outturn (MW); dashed line depicts the day-ahead benchmark
          </p>
        </div>

        <div className="chart-controls">
          {/* Quick Time Range Selector */}
          <div className="time-filter-buttons" role="group" aria-label="Time Filter">
            <button
              type="button"
              className={`filter-btn ${selectedRange === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedRange('ALL')}
            >
              Full Month
            </button>
            <button
              type="button"
              className={`filter-btn ${selectedRange === 'W1' ? 'active' : ''}`}
              onClick={() => setSelectedRange('W1')}
            >
              Week 1
            </button>
            <button
              type="button"
              className={`filter-btn ${selectedRange === 'W2' ? 'active' : ''}`}
              onClick={() => setSelectedRange('W2')}
            >
              Week 2
            </button>
            <button
              type="button"
              className={`filter-btn ${selectedRange === 'W3' ? 'active' : ''}`}
              onClick={() => setSelectedRange('W3')}
            >
              Week 3
            </button>
            <button
              type="button"
              className={`filter-btn ${selectedRange === 'W4' ? 'active' : ''}`}
              onClick={() => setSelectedRange('W4')}
            >
              Week 4
            </button>
          </div>

          {/* Series Toggles */}
          <div className="series-toggles">
            <button
              type="button"
              className={`toggle-btn actual-toggle ${showActual ? 'active' : 'inactive'}`}
              onClick={() => setShowActual(!showActual)}
              title="Toggle Actual Line"
            >
              <span className="toggle-dot actual-color" />
              Actual
            </button>
            <button
              type="button"
              className={`toggle-btn forecast-toggle ${showForecast ? 'active' : 'inactive'}`}
              onClick={() => setShowForecast(!showForecast)}
              title="Toggle Forecast Line"
            >
              <span className="toggle-dash forecast-color" />
              Forecast
            </button>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={430}>
          <LineChart
            data={filteredData}
            margin={{ top: 15, right: 30, left: 15, bottom: 25 }}
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
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
              width={65}
              tickLine={{ stroke: '#475569' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 12 }}
              formatter={(value) => (
                <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
                  {value === 'actual' ? 'Actual Generation' : 'Day-Ahead Forecast'}
                </span>
              )}
            />

            {/* Actual Outturn Line: Solid Sky Blue */}
            {showActual && (
              <Line
                type="monotone"
                dataKey="actual"
                name="actual"
                stroke="#0ea5e9"
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}

            {/* Forecast Line: Dashed Amber/Orange */}
            {showForecast && (
              <Line
                type="monotone"
                dataKey="forecast"
                name="forecast"
                stroke="#f59e0b"
                strokeWidth={2.2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}

            {/* Interactive timeline scrubber / brush */}
            {selectedRange === 'ALL' && (
              <Brush
                dataKey="startTime"
                height={26}
                stroke="#475569"
                fill="#1e293b"
                tickFormatter={formatTick}
                travellerWidth={10}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
