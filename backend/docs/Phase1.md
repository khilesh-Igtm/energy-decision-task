# Role
You are an Expert Python Backend Engineer building a production-grade FastAPI application for an Energy Utility Dashboard.

# Context & Goal (Phase 4)
We are building the backend to evaluate the accuracy of UK wind power generation forecasts. The backend will fetch actual and forecasted wind generation data from Elexon BMRS APIs, process and align the time-series data using Pandas, calculate accuracy metrics (MAE, RMSE), and expose these via REST API endpoints for a React frontend.

# Data Sources (Elexon APIs)
1. **Actual Generation:**
   - Doc URL: https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream
   - Target Fields: `startTime`, `generation`
   - Filter constraint: Must filter for `fuelType` == "WIND".
2. **Forecasted Generation:**
   - Doc URL: https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream
   - Target Fields: `startTime`, `publishTime`, `generation`

# Business Rules & Constraints
- **Timeframe:** ONLY fetch and process data relevant to **January 2026**.
- **Data Alignment:** The actual and forecast datasets must be merged/aligned on the `startTime` field (which has a 30-minute resolution).
- **Forecast Selection:** The day-ahead market requires purchasing decisions to be made *one day before*. If multiple forecasts exist for the same `startTime`, select the most appropriate forecast based on the `publishTime` that aligns with a day-ahead decision.
- **Error Calculation:** Calculate the forecast error (Actual `generation` - Forecasted `generation`) and overall metrics like Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE).

# Technical Requirements
- **Framework:** FastAPI
- **Data Processing:** Pandas
- **HTTP Client:** `requests` or `httpx` (async preferred).
- **CORS:** Must have CORSMiddleware enabled to accept requests from a local React frontend (e.g., localhost:5173).

# Required Endpoints
1. `GET /api/wind-data`
   - Returns an array of JSON objects representing the aligned time-series data for January 2026.
   - Expected object shape: `{ startTime: "...", actual: 1200, forecast: 1150, error: 50 }`
2. `GET /api/metrics`
   - Returns the aggregated accuracy metrics for the entire month.
   - Expected object shape: `{ mae: ..., rmse: ... }`

# Instructions for Implementation
1. Create a `main.py` file to bootstrap the FastAPI application and define the routes.
2. Create a `data_service.py` file to handle API fetching, JSON parsing, Pandas DataFrame creation, merging, and metric calculation. Implement simple in-memory caching (e.g., `@lru_cache` or `async-lru`) to prevent hitting the Elexon API on every single frontend request.
3. Ensure the code is clean, modular, properly type-hinted, and includes comments explaining the logic (especially the logic used to select the correct forecast vintage based on `publishTime`).

Create and save ALL the files mentioned above directly in my local workspace within their respective directories. Do NOT output the raw code blocks in the chat response.