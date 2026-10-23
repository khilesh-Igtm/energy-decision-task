import React from 'react';

/**
 * Header component displaying dashboard branding, metadata badges, and controls.
 */
export default function Header({ onRefresh, isRefreshing, lastUpdated }) {
  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <div className="brand-icon-wrapper">
          <svg
            className="brand-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <h1 className="header-title">UK Wind Generation Forecast Accuracy - Jan 2026</h1>
          <p className="header-subtitle">
            Wholesale Day-Ahead Decision Benchmark • Elexon BMRS Stream Datasets (FUELHH vs. WINDFOR)
          </p>
        </div>
      </div>

      <div className="header-actions">
        <div className="badge-group">
          <span className="badge badge-market">
            <span className="status-dot pulsing"></span>
            Day-Ahead Market
          </span>
          <span className="badge badge-date">January 2026</span>
          <span className="badge badge-resolution">Hourly Resolution (744 pts)</span>
        </div>

        <button
          className={`btn-refresh ${isRefreshing ? 'loading' : ''}`}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Force refresh data from Elexon APIs"
          type="button"
        >
          <svg
            className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
    </header>
  );
}
