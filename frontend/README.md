# UK Wind Generation Forecast Accuracy Dashboard — Frontend

A responsive single-page React analytics dashboard built with Vite, Axios, and Recharts. The application helps energy traders, power portfolio managers, and market analysts visualize UK wind generation outturns against day-ahead forecasts for January 2026, evaluate forecast error distributions, and manage imbalance risk in wholesale power trading.

---

## Overview

The dashboard connects to a local FastAPI backend running on `http://localhost:8000` and displays:
- **Executive KPI Metrics:** Monthly Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), Systemic Forecast Bias, and Peak Generation Outturn.
- **Comparison Time-Series (`LineChart`):** Plots actual wind generation against day-ahead forecasts with quick time-filtering and zoom/scrubbing controls.
- **Error Distribution (`BarChart`):** Highlights hourly forecast deviations, color-coding generation surplus (under-forecast) in emerald green and generation shortfall (over-forecast) in rose red.

---

## Architecture & Component Breakdown

The frontend adopts a modular component hierarchy located in `src/components/` (with re-exports in `src/`):

```
frontend/
├── src/
│   ├── apiClient.js                  # Axios client with helper methods and error handling
│   ├── App.jsx                       # Root component with Global Error Boundary
│   ├── App.css                       # Enterprise dark-theme dashboard stylesheet
│   ├── index.css                     # Base styling, font definitions, and CSS variables
│   ├── main.jsx                      # Vite React 19 entry point
│   ├── components/
│   │   ├── Header.jsx                # Header banner, market badges, and cache-refresh action
│   │   ├── Metrics.jsx               # Primary KPI cards (MAE, RMSE, Bias, Generation Stats)
│   │   ├── ComparisonChart.jsx       # Recharts LineChart for Actual vs. Forecast with Brush scrubber
│   │   ├── ErrorChart.jsx            # Recharts BarChart for hourly delta distribution
│   │   └── Dashboard.jsx             # Top-level state orchestration, async fetching, and loading/error states
│   ├── Header.jsx                    # Direct re-export of components/Header.jsx
│   ├── Metrics.jsx                   # Direct re-export of components/Metrics.jsx
│   ├── ComparisonChart.jsx           # Direct re-export of components/ComparisonChart.jsx
│   ├── ErrorChart.jsx                # Direct re-export of components/ErrorChart.jsx
│   └── Dashboard.jsx                 # Direct re-export of components/Dashboard.jsx
├── docs/                             # Project instructions and requirements
│   ├── Phase1.md
│   └── Frontend_README_Prompt.md
├── package.json                      # Dependencies (React 19, Recharts 3, Axios 1.20)
└── vite.config.js                    # Vite configuration
```

### Module Responsibilities

1. **`apiClient.js`**:
   - Centralizes API communication with the FastAPI backend using `axios`.
   - Defaults to `http://localhost:8000` (customizable via `VITE_API_BASE_URL`).
   - Exports `getWindData(refresh)`, `getMetrics(refresh)`, `getHealth()`, and `clearCache()`.
   - Configures a 45-second timeout to handle upstream cold-cache retrieval from Elexon BMRS gracefully.

2. **`Dashboard.jsx`**:
   - Orchestrates component state (`windData`, `metrics`, `loading`, `refreshing`, `error`).
   - Executes parallel asynchronous requests on mount via `Promise.all([getWindData(), getMetrics()])`.
   - Renders a prominent loading indicator during initial data ingestion.
   - Provides a resilient error banner with a "Retry Connection" action if the FastAPI backend is unavailable.

3. **`Header.jsx`**:
   - Displays project title (*"UK Wind Generation Forecast Accuracy - Jan 2026"*).
   - Shows metadata tags: `"Day-Ahead Market"`, `"January 2026"`, `"Hourly Resolution (744 pts)"`.
   - Houses the "Refresh" button that triggers a force-refresh of the backend cache with spinning feedback.

4. **`Metrics.jsx`**:
   - **MAE Card:** Mean Absolute Error ($1,919.28\text{ MW}$) depicting average magnitude of forecast divergence.
   - **RMSE Card:** Root Mean Squared Error ($2,395.25\text{ MW}$) reflecting variance and penalty risk for large deviations.
   - **Bias Card:** Mean signed error ($-1,713.34\text{ MW}$) with a visual split-bar showing over-predicted ($88.3\%$) vs. under-predicted ($11.7\%$) hours.
   - **Generation Profile Card:** Peak actual outturn ($17,805\text{ MW}$) and mean outturn ($11,581\text{ MW}$).

5. **`ComparisonChart.jsx`**:
   - Wide, responsive Recharts `LineChart` plotting actual outturn (solid sky blue line) and day-ahead forecast (dashed amber line).
   - Includes interactive quick-filter buttons (`Full Month`, `Week 1`, `Week 2`, `Week 3`, `Week 4`).
   - Line visibility toggle buttons to isolate actuals or forecasts.
   - Interactive `<Brush>` component allowing traders to scrub and zoom across specific storm cycles.
   - Custom floating tooltip showing formatted date/time, exact MW values, and delta.

6. **`ErrorChart.jsx`**:
   - Responsive Recharts `BarChart` plotting forecast error ($\text{Actual} - \text{Forecast}$).
   - Per-bar dynamic coloring using `<Cell>`:
     - Emerald Green ($\ge 0\text{ MW}$): Actual outturn exceeded day-ahead forecast (Surplus).
     - Rose Red ($< 0\text{ MW}$): Actual outturn fell short of forecast (Shortfall).
   - Zero-reference baseline (`ReferenceLine y={0}`) and custom tooltip describing trading impact.

---

## Key Functionality & UX Design

- **Date & Timestamp Formatting:**
  - Raw ISO 8601 strings (e.g., `2026-01-05T12:00:00Z`) are formatted into clean axis ticks (`05 Jan`) using `tickFormatter` and `minTickGap={45}` to prevent tick overlap across 744 data points.
  - Interactive tooltips render complete UTC timestamps (e.g., `Mon, 05 Jan 2026 12:00:00 UTC`).
- **Resilient Error Boundaries:**
  - Top-level `ErrorBoundary` in `App.jsx` prevents entire application crashes and displays a recovery button.
  - In-page backend connection error banner provides specific troubleshooting guidance (e.g., advising how to start Uvicorn).
- **Smooth Loading States:**
  - Animated spinner and explanatory status text appear during initial API data retrieval.
- **Modern Dark-Slate Aesthetic:**
  - Built with custom CSS variables, glassmorphic container cards, and responsive CSS grid/flexbox layouts without heavy UI framework bloat.

---

## Setup & Run Instructions

### Prerequisites
- Node.js 18+ (tested with Node.js 20/22)
- Fast API Backend running on `http://localhost:8000` (see `../backend/README.md`)

### 1. Install Dependencies
```bash
# Navigate to the frontend directory
cd frontend

# Install node modules
npm install
```

### 2. Start Vite Development Server
```bash
npm run dev
```

The application will launch at `http://127.0.0.1:5173/` with hot module replacement (HMR).

### 3. Production Build & Preview
```bash
# Compile and bundle assets for production
npm run build

# Preview production build locally
npm run preview
```
Production build bundles are generated in `frontend/dist/`.
