import axios from 'axios';

/**
 * Base URL for the FastAPI backend.
 * Falls back to localhost:8000 if not specified in environment variables.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // External Elexon API requests may take up to 10-15s on first cold fetch
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch aligned actual vs forecasted wind generation time-series for January 2026.
 * @param {boolean} refresh - Force cache refresh on the backend.
 * @returns {Promise<Array<{startTime: string, actual: number, forecast: number, error: number}>>}
 */
export const getWindData = async (refresh = false) => {
  const response = await apiClient.get('/api/wind-data', {
    params: { refresh },
  });
  return response.data;
};

/**
 * Fetch aggregated accuracy metrics (MAE, RMSE) for January 2026.
 * @param {boolean} refresh - Force cache refresh on the backend.
 * @returns {Promise<{mae: number, rmse: number}>}
 */
export const getMetrics = async (refresh = false) => {
  const response = await apiClient.get('/api/metrics', {
    params: { refresh },
  });
  return response.data;
};

/**
 * Check backend health and cache status.
 * @returns {Promise<{status: string, service: string, version: string, cached: boolean}>}
 */
export const getHealth = async () => {
  const response = await apiClient.get('/api/health');
  return response.data;
};

/**
 * Clear backend in-memory cache.
 * @returns {Promise<{message: string}>}
 */
export const clearCache = async () => {
  const response = await apiClient.post('/api/cache/clear');
  return response.data;
};

export default apiClient;
