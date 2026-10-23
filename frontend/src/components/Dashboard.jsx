import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Metrics from './Metrics';
import ComparisonChart from './ComparisonChart';
import ErrorChart from './ErrorChart';
import { getWindData, getMetrics } from '../apiClient';

/**
 * Main Dashboard container managing data fetching, loading, error states, and child components.
 */
export default function Dashboard() {
  const [windData, setWindData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  /**
   * Fetch data from FastAPI backend endpoints:
   * 1. GET /api/wind-data
   * 2. GET /api/metrics
   */
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Parallel requests for optimal speed
      const [dataResponse, metricsResponse] = await Promise.all([
        getWindData(isRefresh),
        getMetrics(isRefresh),
      ]);

      setWindData(dataResponse || []);
      setMetrics(metricsResponse || null);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      let errorMsg = 'Failed to connect to the FastAPI backend service.';
      if (err.response) {
        errorMsg = `Backend returned error ${err.response.status}: ${
          err.response.data?.detail || err.response.statusText
        }`;
      } else if (err.request) {
        errorMsg =
          'No response from backend at http://localhost:8000. Please verify that the Python FastAPI server is running (`uvicorn main:app --port 8000`).';
      } else {
        errorMsg = err.message || errorMsg;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <Header
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Error State Banner */}
        {error && (
          <div className="error-banner" role="alert">
            <div className="error-icon-box">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="error-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="error-content">
              <h3 className="error-title">Backend Connection Error</h3>
              <p className="error-message">{error}</p>
              <div className="error-actions">
                <button
                  type="button"
                  className="btn-retry"
                  onClick={() => loadDashboardData(false)}
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <h2 className="loading-title">Ingesting & Aligning Elexon BMRS Datasets</h2>
            <p className="loading-subtitle">
              Retrieving actuals (FUELHH) and day-ahead forecasts (WINDFOR) for January 2026...
            </p>
          </div>
        ) : (
          !error && (
            <>
              {/* Aggregated KPI Metrics Cards */}
              <Metrics metrics={metrics} windData={windData} />

              {/* Primary Comparison Time-Series Chart */}
              <ComparisonChart data={windData} />

              {/* Error Distribution Bar Chart */}
              <ErrorChart data={windData} />

              {/* Energy Trader Insights Footer */}
              <footer className="dashboard-footer-insights">
                <div className="insight-card">
                  <h4 className="insight-title">Trading Takeaway</h4>
                  <p className="insight-text">
                    January 2026 exhibited periods of high wind output variability. An MAE of{' '}
                    <strong>{metrics?.mae?.toLocaleString()} MW</strong> underlines substantial day-ahead imbalance
                    risk, highlighting the necessity of dynamic intraday hedging to minimize Balancing Mechanism penalties.
                  </p>
                </div>
              </footer>
            </>
          )
        )}
      </main>
    </div>
  );
}
