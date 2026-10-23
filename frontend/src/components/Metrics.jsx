import React, { useMemo } from 'react';

/**
 * Formats numbers with thousands separators and optional fixed decimal places.
 */
function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return Number(num).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Metrics component displaying executive cards for MAE, RMSE, and key market stats.
 */
export default function Metrics({ metrics, windData = [] }) {
  // Compute auxiliary trading stats from windData
  const stats = useMemo(() => {
    if (!windData || windData.length === 0) return null;

    let maxActual = -Infinity;
    let minActual = Infinity;
    let totalActual = 0;
    let totalForecast = 0;
    let totalError = 0;
    let positiveErrors = 0; // actual > forecast (under-forecast)
    let negativeErrors = 0; // actual < forecast (over-forecast)

    for (let i = 0; i < windData.length; i++) {
      const { actual, forecast, error } = windData[i];
      if (actual > maxActual) maxActual = actual;
      if (actual < minActual) minActual = actual;
      totalActual += actual;
      totalForecast += forecast;
      totalError += error;
      if (error > 0) positiveErrors++;
      else if (error < 0) negativeErrors++;
    }

    const n = windData.length;
    const avgActual = totalActual / n;
    const avgForecast = totalForecast / n;
    const avgError = totalError / n; // bias

    return {
      count: n,
      maxActual,
      minActual,
      avgActual,
      avgForecast,
      avgError,
      positiveErrorsRatio: ((positiveErrors / n) * 100).toFixed(1),
      negativeErrorsRatio: ((negativeErrors / n) * 100).toFixed(1),
    };
  }, [windData]);

  const mae = metrics?.mae;
  const rmse = metrics?.rmse;

  return (
    <section className="metrics-section" aria-label="Forecast Accuracy Metrics">
      {/* Primary KPI Cards */}
      <div className="metrics-grid">
        {/* MAE Card */}
        <div className="metric-card primary-card mae-card">
          <div className="metric-header">
            <span className="metric-label">Mean Absolute Error (MAE)</span>
            <span className="metric-tag">Accuracy</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{formatNumber(mae, 2)}</span>
            <span className="metric-unit">MW</span>
          </div>
          <p className="metric-description">
            Average magnitude of forecast deviations across all January settlement intervals.
          </p>
          <div className="metric-formula">
            <code>MAE = (1/N) * Σ |Actual - Forecast|</code>
          </div>
        </div>

        {/* RMSE Card */}
        <div className="metric-card primary-card rmse-card">
          <div className="metric-header">
            <span className="metric-label">Root Mean Squared Error (RMSE)</span>
            <span className="metric-tag">Volatility Risk</span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{formatNumber(rmse, 2)}</span>
            <span className="metric-unit">MW</span>
          </div>
          <p className="metric-description">
            Penalizes large outlier forecast errors that trigger costly imbalance settlement actions.
          </p>
          <div className="metric-formula">
            <code>RMSE = √((1/N) * Σ (Actual - Forecast)²)</code>
          </div>
        </div>

        {/* Mean Forecast Bias Card */}
        <div className="metric-card secondary-card">
          <div className="metric-header">
            <span className="metric-label">Systemic Bias (Mean Error)</span>
            <span className={`bias-indicator ${stats?.avgError < 0 ? 'over-forecast' : 'under-forecast'}`}>
              {stats?.avgError < 0 ? 'Over-Predicted' : 'Under-Predicted'}
            </span>
          </div>
          <div className="metric-value-container">
            <span className="metric-value">{formatNumber(stats?.avgError, 2)}</span>
            <span className="metric-unit">MW</span>
          </div>
          <p className="metric-description">
            Net average delta. Negative value indicates day-ahead forecast tended to over-predict actual output.
          </p>
          <div className="metric-progress-wrap">
            <div className="split-bar">
              <span
                className="split-fill red"
                style={{ width: `${stats ? stats.negativeErrorsRatio : 50}%` }}
                title={`Over-predicted: ${stats?.negativeErrorsRatio}%`}
              />
              <span
                className="split-fill green"
                style={{ width: `${stats ? stats.positiveErrorsRatio : 50}%` }}
                title={`Under-predicted: ${stats?.positiveErrorsRatio}%`}
              />
            </div>
            <div className="split-labels">
              <span>Over: {stats?.negativeErrorsRatio || '—'}%</span>
              <span>Under: {stats?.positiveErrorsRatio || '—'}%</span>
            </div>
          </div>
        </div>

        {/* Peak & Average Generation Card */}
        <div className="metric-card secondary-card">
          <div className="metric-header">
            <span className="metric-label">Generation Profile</span>
            <span className="metric-tag">Market Scope</span>
          </div>
          <div className="generation-stats-row">
            <div>
              <span className="sub-metric-label">Peak Outturn</span>
              <div className="sub-metric-value">
                {formatNumber(stats?.maxActual, 0)} <span className="sub-unit">MW</span>
              </div>
            </div>
            <div className="sub-divider" />
            <div>
              <span className="sub-metric-label">Mean Outturn</span>
              <div className="sub-metric-value">
                {formatNumber(stats?.avgActual, 0)} <span className="sub-unit">MW</span>
              </div>
            </div>
          </div>
          <p className="metric-description">
            Evaluated over {stats?.count || 744} continuous hourly delivery intervals in January 2026.
          </p>
          <div className="metric-footer-note">
            <span>Peak wind day reached on storm cycles</span>
          </div>
        </div>
      </div>
    </section>
  );
}
