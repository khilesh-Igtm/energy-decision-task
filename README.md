# UK Wind Power Generation Forecast Accuracy & Trading Dashboard

An enterprise-grade, full-stack decision-support platform designed for energy traders, power portfolio managers, and market analysts. The system evaluates the accuracy of UK day-ahead wind power generation forecasts against actual metered outturns for **January 2026**, ingesting live stream data from the **Elexon BMRS Insights Solution APIs**, calculating forecast error metrics (MAE, RMSE, Bias), and visualizing the results through a modern single-page React analytics dashboard.

---

## Key Highlights

- **Automated Elexon Ingestion:** Fetches half-hourly actual outturns (`FUELHH`) and wind generation forecasts (`WINDFOR`) via streaming endpoints.
- **Wholesale Day-Ahead Alignment:** Enforces day-ahead market commitment rules by filtering for forecast vintages published strictly on day $D-1$ before delivery day $D$ gate closure.
- **Quantitative Error Analytics:** Computes Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and systemic forecast bias across 744 continuous hourly intervals.
- **High-Performance In-Memory Caching:** Sub-millisecond response times for frontend queries using a thread-safe, double-checked locking cache.
- **Interactive Data Visualizations:** Recharts comparison line charts with timeline scrubbing (`<Brush>`), time-range filtering (`Week 1`–`Week 4`), and error distribution bar charts color-coding generation surplus vs. deficit.
- **Production Containerization:** Fully orchestrated multi-container deployment using Docker and Docker Compose.

---

## System Architecture

```
                                  +------------------------------------+
                                  |         Elexon BMRS APIs           |
                                  |  - FUELHH/stream  (Actuals)        |
                                  |  - WINDFOR/stream (Forecasts)      |
                                  +-----------------+------------------+
                                                    | HTTP REST / JSON
                                                    v
+-------------------------------+         +----------------------------+
|        React Frontend         |  HTTP   |      FastAPI Backend       |
|  - Vite, Axios, Recharts 3    |<------->|  - Python 3.11, Pandas     |
|  - Nginx Alpine Container     |  :8000  |  - In-Memory Caching       |
|  - Port 80 (Host)             |         |  - Port 8000 (Host)        |
+-------------------------------+         +----------------------------+
```

---

## Repository Structure

```
energy-decision-task/
├── docker-compose.yml              # Multi-container orchestration (frontend + backend)
├── README.md                       # Root repository documentation
├── docs/                           # Architecture and containerization specifications
│   └── dockerize.md
├── backend/                        # Python FastAPI backend service
│   ├── Dockerfile                  # Production container definition (python:3.11-slim)
│   ├── .dockerignore               # Build context exclusions
│   ├── main.py                     # FastAPI routes, CORS, Pydantic schemas, thread offloading
│   ├── data_service.py             # Elexon API ingestion, day-ahead vintage logic, caching
│   ├── requirements.txt            # Python dependencies (fastapi, uvicorn, pandas, requests)
│   ├── README.md                   # Comprehensive backend documentation
│   ├── app/                        # Module entry points (app.main:app)
│   │   ├── __init__.py
│   │   ├── main.py
│   │   └── data_service.py
│   └── docs/                       # Backend specifications and prompt references
│       ├── Phase1.md
│       └── Backend_README_Prompt.md
└── frontend/                       # React 19 + Vite dashboard application
    ├── Dockerfile                  # Multi-stage production build (Node 20 -> Nginx Alpine)
    ├── .dockerignore               # Build context exclusions
    ├── nginx.conf                  # Nginx configuration for SPA routing & reverse proxy
    ├── package.json                # Dependencies (react, recharts, axios)
    ├── vite.config.js              # Vite configuration
    ├── README.md                   # Comprehensive frontend documentation
    ├── src/
    │   ├── apiClient.js            # Axios client with fallback and timeout handling
    │   ├── App.jsx                 # Top-level app with ErrorBoundary
    │   ├── App.css                 # Custom enterprise dark-theme stylesheet
    │   ├── index.css               # Typography and CSS custom properties
    │   ├── main.jsx                # React DOM entry point
    │   └── components/
    │       ├── Header.jsx          # Dashboard branding, badges, and cache-refresh action
    │       ├── Metrics.jsx         # Executive KPI cards (MAE, RMSE, Bias, Generation Stats)
    │       ├── ComparisonChart.jsx # Actual vs. Forecast LineChart with Brush scrubber
    │       ├── ErrorChart.jsx      # Hourly error distribution BarChart with delta coloring
    │       └── Dashboard.jsx       # State management, data fetching, and loading/error states
    └── docs/                       # Frontend specifications and prompt references
        ├── Phase1.md
        └── Frontend_README_Prompt.md
```

---

## Core Market Logic & Analytics

### 1. Day-Ahead Decision Horizon & Forecast Vintage Selection

In UK and European wholesale power markets, day-ahead contracts for delivery day $D$ (from 00:00 to 24:00 UTC) are finalized on day $D-1$ before gate closure. 

- **Intraday Exclusion:** Any forecast published on delivery day $D$ is an intraday revision and is strictly excluded:
  $$\text{publishTime} < \text{startTime.floor('D')}$$
- **Latest Vintage Selection:** When National Grid ESO issues multiple forecast runs across day $D-1$ (e.g., at 03:30, 08:30, 11:30, 15:30, 22:30 UTC), the pipeline selects the latest published run on day $D-1$ for each delivery hour. This represents the most accurate operational forecast available to market participants at day-ahead bidding closure.
- **Coverage for Month Start:** Day-ahead forecasts for January 1st were published on December 31st (D-1). Querying from `2025-12-30T00:00:00Z` ensures complete coverage across all 744 hours of January 2026.

### 2. Time-Series Alignment & Resolution

- **Actual Generation (`FUELHH/stream`):** Half-hourly settlement periods (:00 and :30), filtered for `fuelType == 'WIND'`.
- **Forecast Generation (`WINDFOR/stream`):** Hourly forecasts (:00).
- **Alignment:** Merged on `startTime` via an inner join to align actual generation directly with the corresponding day-ahead forecast for each hour of January 2026 (744 total intervals).

### 3. Forecast Accuracy Metrics (January 2026 Outturn)

$$\text{Error} = \text{Actual} - \text{Forecast} \quad (\text{MW})$$

| Metric | Formula | Value (Jan 2026) | Market Significance |
| :--- | :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | $\frac{1}{N} \sum_{i=1}^{N} \|\text{Error}_i\|$ | **1,919.28 MW** | Baseline forecast divergence; directly correlates with baseline balancing volume required. |
| **Root Mean Squared Error (RMSE)** | $\sqrt{\frac{1}{N} \sum_{i=1}^{N} \text{Error}_i^2}$ | **2,395.25 MW** | Heavily penalizes large forecast outliers that drive steep system buy/sell price spreads. |
| **Mean Forecast Bias** | $\frac{1}{N} \sum_{i=1}^{N} \text{Error}_i$ | **-1,713.34 MW** | Negative bias indicates day-ahead models consistently over-predicted wind outturns (88.3% of hours). |
| **Peak Wind Outturn** | $\max(\text{Actual})$ | **17,805 MW** | Maximum instantaneous generation achieved during January storm fronts. |

---

## Quick Start with Docker Compose (Recommended)

Docker Compose builds both the backend and frontend into lightweight, production-ready containers.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed and running.
- [Docker Compose](https://docs.docker.com/compose/) v2.0+.

### 1. Start the Multi-Container Application
```bash
# Clone or navigate to the repository root
cd energy-decision-task

# Build and start services in the background
docker compose up --build -d
```

### 2. Access the Application
- **Frontend Dashboard:** [http://localhost](http://localhost) (port `80`)
- **FastAPI Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Wind Time-Series Endpoint:** [http://localhost:8000/api/wind-data](http://localhost:8000/api/wind-data)
- **Aggregated Metrics Endpoint:** [http://localhost:8000/api/metrics](http://localhost:8000/api/metrics)

### 3. Stop Containers
```bash
docker compose down
```

---

## Local Development Setup

If you prefer to run each service natively outside of Docker:

### 1. Run the Python FastAPI Backend

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
# Windows:
python -m venv venv
.\venv\Scripts\Activate.ps1
# Linux/macOS:
# python3 -m venv venv && source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the Uvicorn server with hot-reload
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The backend initializes at `http://127.0.0.1:8000`.

### 2. Run the React Frontend

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend dev server launches at `http://127.0.0.1:5173`.

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/wind-data` | Returns aligned hourly time-series array: `[{ startTime, actual, forecast, error }]`. Supports optional `?refresh=true`. |
| `GET` | `/api/metrics` | Returns aggregated accuracy KPIs: `{ mae: 1919.28, rmse: 2395.25 }`. Supports optional `?refresh=true`. |
| `GET` | `/api/health` | Service health check and cache status diagnostics. |
| `POST` | `/api/cache/clear` | Manually clears the backend in-memory cache to trigger fresh Elexon API requests. |
| `GET` | `/docs` | Interactive OpenAPI Swagger UI documentation. |
| `GET` | `/redoc` | ReDoc alternative API documentation. |

---

## Detailed Sub-Module Documentation

For in-depth explanations of individual sub-systems, refer to:
- **Backend Architecture & Deep Dive:** [`backend/README.md`](backend/README.md)
- **Frontend Components & Visualization Logic:** [`frontend/README.md`](frontend/README.md)
- **Containerization Specification:** [`docs/dockerize.md`](docs/dockerize.md)
