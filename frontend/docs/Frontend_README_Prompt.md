# Role
You are an Expert Technical Writer and React Frontend Engineer.

# Task
Create a comprehensive `README.md` file for the `frontend/` directory of the Energy Forecast Dashboard project.

# Content Requirements
The README must clearly explain:
1. **Overview:** The purpose of this React (Vite) application (visualizing UK wind generation actuals vs. day-ahead forecasts for January 2026).
2. **Architecture & Component Breakdown:** Explain the modular structure:
   - `apiClient.js`: API fetching logic.
   - `Dashboard.jsx`: State management and orchestration.
   - `Metrics.jsx`: KPI calculation displays (MAE, RMSE, Bias).
   - `ComparisonChart.jsx` & `ErrorChart.jsx`: Visualization logic using Recharts.
3. **Key Functionality:** Explain how the UI handles loading states, error boundaries, and data formatting (e.g., converting UTC timestamps to readable labels).
4. **Setup & Run Instructions:** Step-by-step commands to run `npm install` and `npm run dev`, as well as how to build for production.

# Instructions
Create and save the `README.md` file directly in the `frontend/` directory. Do NOT output the raw code blocks in the chat response.