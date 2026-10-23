# Role
You are an Expert React Frontend Engineer building a production-grade Energy Utility Dashboard.

# Context
We have a Python FastAPI backend running locally (typically on port 8000) that calculates the accuracy of UK wind power day-ahead forecasts for January 2026. We need to build a single-page React dashboard to help energy traders visualize the forecast accuracy and make quantitative purchasing decisions.

# Backend Endpoints
1. `GET http://localhost:8000/api/wind-data`
   - Returns an array of time-series data: `[{ startTime: string, actual: number, forecast: number, error: number }, ...]`
2. `GET http://localhost:8000/api/metrics`
   - Returns an object with aggregated accuracy metrics: `{ mae: number, rmse: number }`

# Requirements
- **Core Libraries:** Use `axios` for API requests and `recharts` for all data visualizations.
- **UI Architecture:**
  1. **Header:** Professional title (e.g., "UK Wind Generation Forecast Accuracy - Jan 2026").
  2. **Metrics Cards:** Prominently display the overall MAE and RMSE at the top of the dashboard.
  3. **Comparison Chart:** A wide, responsive `LineChart` from `recharts` plotting both `actual` and `forecast` generation over time. Use distinct styling (e.g., solid line for actual, dashed line for forecast). Include interactive tooltips, an X-axis for time, and a Y-axis for MW.
  4. **Error Chart:** A responsive `BarChart` or `ComposedChart` below the main chart showing the `error` over time to visualize exactly when the forecasts over-predicted or under-predicted.
- **State Management:** Implement proper `loading` indicators and `error` boundary states if the API is unreachable.
- **Styling:** Provide a clean, enterprise-grade layout. You may use standard CSS modules or clean inline styles to keep dependencies light.

# Instructions
Create and save ALL the files mentioned above directly in my local workspace within their respective directories. Do NOT output the raw code blocks in the chat response. You can structure everything within `src/App.jsx` (breaking it down into smaller functions/components within the file as needed) so it runs perfectly in our Vite environment. Ensure the charts format the `startTime` into readable labels.