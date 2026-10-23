# UK Wind Power Generation Forecast Evaluation — Backend

A production-grade Python FastAPI backend designed for energy trading and utility analytics. The service ingests actual and forecasted wind generation data from Elexon BMRS (Balancing Mechanism Reporting Service) APIs, aligns time-series datasets using Pandas, enforces day-ahead market vintage selection, calculates forecast accuracy metrics (MAE, RMSE, Bias), and serves optimized REST API endpoints for frontend dashboards.

---

## Architecture & File Structure

```
backend/
├── data_service.py       # Core service layer: Elexon API ingestion, day-ahead vintage logic, alignment & caching
├── main.py               # FastAPI application, route handlers, CORS middleware, and Pydantic schemas
├── requirements.txt      # Python dependencies
├── docs/                 # Requirements & architectural documentation
│   ├── Phase1.md
│   └── Backend_README_Prompt.md
└── venv/                 # Local Python virtual environment
```

### Module Responsibilities

- **`main.py`**:
  - Initializes the FastAPI app with interactive OpenAPI documentation (`/docs`, `/redoc`).
  - Configures `CORSMiddleware` to permit requests from local React frontend dev servers (`localhost:5173`, `127.0.0.1:5173`, `localhost:3000`, etc.).
  - Declares REST endpoints:
    - `GET /api/wind-data`: Returns aligned actuals, forecasts, and calculated errors.
    - `GET /api/metrics`: Returns aggregated monthly MAE and RMSE metrics.
    - `GET /api/health`: Health status and cache diagnostics.
    - `POST /api/cache/clear`: Invalidate in-memory cache on demand.
  - Offloads synchronous Pandas and network I/O operations to worker threads via `asyncio.to_thread` to maintain a non-blocking event loop.
  - Defines strict Pydantic v2 validation models (`WindDataPoint`, `MetricsResponse`, `HealthResponse`).

- **`data_service.py`**:
  - Encapsulates `ElexonDataService` singleton for API ingestion and data processing.
  - Manages HTTP connection pooling and automatic retry policies via `urllib3.util.Retry` (handling status codes `429`, `500`, `502`, `503`, `504` with exponential backoff).
  - Implements thread-safe in-memory caching with double-checked locking (`threading.Lock`) to prevent redundant upstream API queries.

---

## Core Business Logic

### 1. Elexon API Integration

The service queries two dedicated BMRS Insights Solution streaming endpoints:

| Dataset | Endpoint URL | Parameters & Filters | Target Fields |
| :--- | :--- | :--- | :--- |
| **Actual Generation** | `/datasets/FUELHH/stream` | `settlementDateFrom=2026-01-01`<br>`settlementDateTo=2026-01-31`<br>Filtered in code for `fuelType == "WIND"` | `startTime`, `generation` (renamed to `actual`) |
| **Forecast Generation** | `/datasets/WINDFOR/stream` | `publishDateTimeFrom=2025-12-30T00:00:00Z`<br>`publishDateTimeTo=2026-01-31T23:59:59Z`<br>Filtered for `startTime` in January 2026 | `startTime`, `publishTime`, `generation` (renamed to `forecast`) |

*Note on date range:* Day-ahead forecasts for January 1st are published by National Grid ESO during the day on December 31st (D-1). Querying publication timestamps from `2025-12-30` guarantees complete day-ahead coverage for the beginning of January.

### 2. Day-Ahead Forecast Vintage Selection

In UK and European wholesale power markets, day-ahead contracts for delivery day $D$ (from 00:00 to 23:30/24:00 UTC) are finalized on day $D-1$ before delivery commences. The forecast selection applies the following rules:

1. **Exclusion of Intraday Runs:** Forecasts published on delivery day $D$ itself are intraday updates, not day-ahead forecasts. Records are filtered strictly such that:
   $$\text{publishTime} < \text{startTime.floor('D')}$$
2. **Latest Available Vintage on Day D-1:** National Grid ESO issues forecast updates multiple times on day $D-1$ (e.g., at 03:30, 08:30, 11:30, 15:30, 22:30 UTC). To reflect the operational forecast available to traders at day-ahead gate closure, the pipeline selects the latest forecast vintage published on day $D-1$ for each delivery hour:
   ```python
   df_forecast_selected = (
       df_day_ahead.sort_values("publishTime")
       .groupby("startTime", as_index=False)
       .last()
   )
   ```

### 3. Data Alignment & Error Metrics

- **Alignment:** Elexon outturn data (`FUELHH`) is recorded at half-hourly intervals (:00 and :30), whereas `WINDFOR` stream forecasts are issued at hourly resolution (:00). An inner join on `startTime` aligns actual outturns directly with corresponding day-ahead forecasts for each hour of January 2026 (744 total intervals).
- **Error Formulation:**
  $$\text{Error} = \text{Actual} - \text{Forecast} \quad (\text{MW})$$
  - Positive Error ($> 0\text{ MW}$): Actual wind generation exceeded forecast (under-prediction / generation surplus).
  - Negative Error ($< 0\text{ MW}$): Actual wind generation fell short of forecast (over-prediction / generation shortfall).
- **Aggregated Metrics (January 2026):**
  - **Mean Absolute Error (MAE):** $\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} |\text{Error}_i| \approx 1,919.28\text{ MW}$
  - **Root Mean Squared Error (RMSE):** $\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} \text{Error}_i^2} \approx 2,395.25\text{ MW}$
  - **Mean Bias:** $\text{Bias} = \frac{1}{N} \sum_{i=1}^{N} \text{Error}_i \approx -1,713.34\text{ MW}$ (indicating day-ahead forecasts tended to over-predict output)

---

## API Endpoints Reference

### `GET /api/wind-data`
Returns an array of aligned hourly time-series points for January 2026.
- **Query Parameter:** `refresh=true` (optional, forces fresh fetch from Elexon)
- **Response Shape:**
  ```json
  [
    {
      "startTime": "2026-01-01T00:00:00Z",
      "actual": 13756,
      "forecast": 20032,
      "error": -6276
    }
  ]
  ```

### `GET /api/metrics`
Returns aggregate forecast accuracy metrics across the entire month.
- **Response Shape:**
  ```json
  {
    "mae": 1919.28,
    "rmse": 2395.25
  }
  ```

### `GET /api/health`
Returns backend health status, service name, version, and cache state (`"cached": true | false`).

### `POST /api/cache/clear`
Clears the in-memory cache to force upstream retrieval on subsequent requests.

---

## Setup & Run Instructions

### Prerequisites
- Python 3.10+ (tested with Python 3.11 / 3.12)
- Network access to `https://data.elexon.co.uk`

### 1. Create and Activate Virtual Environment

**Windows PowerShell:**
```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start the FastAPI Development Server
```bash
# Using uvicorn directly
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Or run main.py as a script
python main.py
```

The server will initialize at `http://127.0.0.1:8000`.

### 4. Verify Server & Endpoints

You can verify the backend using `curl` or any browser:

```bash
# Health check
curl http://127.0.0.1:8000/api/health

# Fetch aggregated metrics
curl http://127.0.0.1:8000/api/metrics

# Fetch time-series wind data
curl http://127.0.0.1:8000/api/wind-data

# Interactive Swagger documentation
# Open http://127.0.0.1:8000/docs in your browser
```
