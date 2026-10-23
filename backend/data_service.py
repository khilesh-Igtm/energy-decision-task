"""
data_service.py
================
Data service layer responsible for fetching, processing, and calculating accuracy
metrics for UK wind power generation data from the Elexon BMRS APIs.

Features:
- Fetches actual wind generation from the FUELHH stream dataset.
- Fetches wind generation forecasts from the WINDFOR stream dataset.
- Filters and scopes data strictly to January 2026.
- Implements Day-Ahead forecast selection based on publishTime relative to delivery day.
- Merges and aligns actual and forecast time-series on startTime.
- Computes error, Mean Absolute Error (MAE), and Root Mean Squared Error (RMSE).
- Provides thread-safe, in-memory caching to avoid repetitive API requests.
"""

from __future__ import annotations

import logging
import threading
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

logger = logging.getLogger("energy_dashboard.data_service")
logging.basicConfig(level=logging.INFO)

# Base API URLs for Elexon Insights Solution
ELEXON_API_BASE = "https://data.elexon.co.uk/bmrs/api/v1"
FUELHH_ENDPOINT = f"{ELEXON_API_BASE}/datasets/FUELHH/stream"
WINDFOR_ENDPOINT = f"{ELEXON_API_BASE}/datasets/WINDFOR/stream"

# January 2026 timeframe boundaries (UTC)
JAN_START = "2026-01-01T00:00:00Z"
JAN_END = "2026-01-31T23:59:59Z"

# In the day-ahead wholesale electricity market, day-ahead forecasts for January 1st
# are published on December 31st (D-1). Thus, we retrieve forecast publications starting
# from 2025-12-30 to ensure full coverage of January 1st day-ahead bids.
WINDFOR_PUBLISH_FROM = "2025-12-30T00:00:00Z"
WINDFOR_PUBLISH_TO = "2026-01-31T23:59:59Z"


class ElexonDataService:
    """Service to fetch, clean, align, and calculate metrics for Elexon wind data."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = self._create_resilient_session()
        self._lock = threading.Lock()
        self._cached_records: Optional[List[Dict[str, Any]]] = None
        self._cached_metrics: Optional[Dict[str, float]] = None

    @staticmethod
    def _create_resilient_session() -> requests.Session:
        """Create a requests Session configured with automatic retries and connection pooling."""
        session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=1.0,
            status_forcelist=[429, 500, 502, 503, 504],
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retries)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session

    def fetch_actual_generation(self) -> pd.DataFrame:
        """Fetch actual half-hourly wind generation from Elexon FUELHH stream.

        Target Fields: `startTime`, `generation`
        Constraint: Filter for `fuelType` == "WIND" for January 2026.

        Returns:
            pd.DataFrame: Cleaned actual generation with columns ['startTime', 'actual']
        """
        params = {
            "settlementDateFrom": "2026-01-01",
            "settlementDateTo": "2026-01-31",
        }
        logger.info("Requesting actual wind generation from FUELHH endpoint: %s", FUELHH_ENDPOINT)
        try:
            response = self.session.get(FUELHH_ENDPOINT, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            logger.error("Failed to fetch FUELHH data from Elexon: %s", exc)
            raise RuntimeError(f"Error fetching FUELHH actual data: {exc}") from exc

        if not data:
            raise ValueError("No data returned from FUELHH for January 2026.")

        df = pd.DataFrame(data)
        required_cols = {"fuelType", "startTime", "generation"}
        if not required_cols.issubset(df.columns):
            raise KeyError(f"FUELHH response missing required fields: {required_cols - set(df.columns)}")

        # 1. Filter constraint: Must filter for fuelType == "WIND"
        df_wind = df[df["fuelType"] == "WIND"].copy()
        if df_wind.empty:
            raise ValueError("No records with fuelType == 'WIND' found in FUELHH dataset.")

        # 2. Parse startTime as UTC datetime
        df_wind["startTime"] = pd.to_datetime(df_wind["startTime"], utc=True)

        # 3. Rename and select target fields
        df_wind = df_wind.rename(columns={"generation": "actual"})
        df_wind = df_wind[["startTime", "actual"]]

        # 4. Strict filter for January 2026
        df_wind = df_wind[
            (df_wind["startTime"] >= pd.Timestamp(JAN_START)) &
            (df_wind["startTime"] <= pd.Timestamp(JAN_END))
        ]

        logger.info("Successfully fetched and parsed %d actual wind records.", len(df_wind))
        return df_wind

    def fetch_forecast_generation(self) -> pd.DataFrame:
        """Fetch wind generation forecast from Elexon WINDFOR stream.

        Target Fields: `startTime`, `publishTime`, `generation`

        Returns:
            pd.DataFrame: Raw forecasts with columns ['startTime', 'publishTime', 'forecast']
        """
        params = {
            "publishDateTimeFrom": WINDFOR_PUBLISH_FROM,
            "publishDateTimeTo": WINDFOR_PUBLISH_TO,
        }
        logger.info("Requesting forecast wind generation from WINDFOR endpoint: %s", WINDFOR_ENDPOINT)
        try:
            response = self.session.get(WINDFOR_ENDPOINT, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            logger.error("Failed to fetch WINDFOR data from Elexon: %s", exc)
            raise RuntimeError(f"Error fetching WINDFOR forecast data: {exc}") from exc

        if not data:
            raise ValueError("No data returned from WINDFOR for requested timeframe.")

        df = pd.DataFrame(data)
        required_cols = {"startTime", "publishTime", "generation"}
        if not required_cols.issubset(df.columns):
            raise KeyError(f"WINDFOR response missing required fields: {required_cols - set(df.columns)}")

        # Parse timestamps as UTC
        df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
        df["publishTime"] = pd.to_datetime(df["publishTime"], utc=True)
        df = df.rename(columns={"generation": "forecast"})

        # Strict filter: target startTime must be in January 2026
        df_jan = df[
            (df["startTime"] >= pd.Timestamp(JAN_START)) &
            (df["startTime"] <= pd.Timestamp(JAN_END))
        ].copy()

        logger.info("Successfully fetched %d forecast records for January 2026.", len(df_jan))
        return df_jan[["startTime", "publishTime", "forecast"]]

    def select_day_ahead_forecasts(self, df_forecast: pd.DataFrame) -> pd.DataFrame:
        """Select the appropriate Day-Ahead forecast vintage based on publishTime.

        Business Logic:
        ----------------
        In UK and European wholesale power markets:
        1. Trading and purchasing decisions for delivery day D are finalized on day D-1
           (one day before delivery).
        2. Intraday forecasts published on day D itself are NOT day-ahead forecasts, so
           they must be excluded. Hence, `publishTime < delivery_day_start` (where
           delivery_day_start = startTime.floor('D')).
        3. National Grid ESO publishes updated forecast runs multiple times on day D-1.
           To reflect the operational information available to market participants at the
           close of the day-ahead procurement window, we select the latest forecast
           published on day D-1 prior to midnight (i.e., maximum publishTime where
           publishTime < delivery_day_start).
        4. If a target hour has multiple forecasts meeting this criterion, the latest
           run is selected using `.groupby('startTime').last()`.

        Args:
            df_forecast: DataFrame containing startTime, publishTime, and forecast columns.

        Returns:
            pd.DataFrame: Deduplicated DataFrame with columns ['startTime', 'forecast'].
        """
        # Determine the start of delivery day (midnight 00:00:00 UTC of delivery date)
        delivery_day_start = df_forecast["startTime"].dt.floor("D")

        # Filter strictly for forecasts published prior to the delivery day
        df_day_ahead = df_forecast[df_forecast["publishTime"] < delivery_day_start].copy()

        if df_day_ahead.empty:
            raise ValueError("No day-ahead forecasts found published before delivery day start.")

        # Sort by publishTime ascending, then pick the last (latest) vintage for each startTime
        df_selected = (
            df_day_ahead.sort_values("publishTime")
            .groupby("startTime", as_index=False)
            .last()
        )

        logger.info(
            "Selected %d unique day-ahead hourly forecasts for January 2026.",
            len(df_selected)
        )
        return df_selected[["startTime", "forecast"]]

    def process_and_align_data(self) -> Tuple[List[Dict[str, Any]], Dict[str, float]]:
        """Fetch, filter, select day-ahead forecasts, align datasets, and compute metrics.

        Data Alignment Logic:
        ---------------------
        - `FUELHH` contains actual generation outturn at 30-minute intervals (:00 and :30).
        - `WINDFOR` contains ESO day-ahead wind generation forecasts at 60-minute intervals (:00).
        - Merging on `startTime` via an inner join aligns actual outturns directly with the
          corresponding day-ahead forecast for each hour of January 2026 (744 total intervals).
        - Error is defined as: `actual - forecast` (in MW).

        Metrics:
        --------
        - MAE (Mean Absolute Error): mean(|actual - forecast|)
        - RMSE (Root Mean Squared Error): sqrt(mean((actual - forecast)^2))

        Returns:
            Tuple containing:
            1. List of dicts: [{'startTime': '...', 'actual': ..., 'forecast': ..., 'error': ...}, ...]
            2. Dict of metrics: {'mae': ..., 'rmse': ...}
        """
        # 1. Fetch raw datasets
        df_actual = self.fetch_actual_generation()
        df_forecast = self.fetch_forecast_generation()

        # 2. Select the appropriate day-ahead forecast vintage
        df_forecast_selected = self.select_day_ahead_forecasts(df_forecast)

        # 3. Merge/align datasets on startTime
        df_merged = pd.merge(
            df_actual,
            df_forecast_selected,
            on="startTime",
            how="inner"
        )
        df_merged = df_merged.sort_values("startTime").reset_index(drop=True)

        if df_merged.empty:
            raise ValueError("Merging actual and forecast data produced an empty DataFrame.")

        # 4. Calculate error: Actual - Forecast
        df_merged["error"] = df_merged["actual"] - df_merged["forecast"]

        # 5. Calculate aggregated metrics for January 2026
        errors = df_merged["error"].to_numpy()
        mae = float(np.mean(np.abs(errors)))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        metrics = {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
        }

        # 6. Format time-series records for API response
        records: List[Dict[str, Any]] = []
        for _, row in df_merged.iterrows():
            st_iso = row["startTime"].strftime("%Y-%m-%dT%H:%M:%SZ")
            actual_val = int(row["actual"]) if float(row["actual"]).is_integer() else round(float(row["actual"]), 2)
            forecast_val = int(row["forecast"]) if float(row["forecast"]).is_integer() else round(float(row["forecast"]), 2)
            error_val = int(row["error"]) if float(row["error"]).is_integer() else round(float(row["error"]), 2)

            records.append({
                "startTime": st_iso,
                "actual": actual_val,
                "forecast": forecast_val,
                "error": error_val,
            })

        logger.info(
            "Alignment complete: %d records generated. Metrics: MAE=%.2f, RMSE=%.2f",
            len(records), metrics["mae"], metrics["rmse"]
        )
        return records, metrics

    def get_data_and_metrics(self, force_refresh: bool = False) -> Tuple[List[Dict[str, Any]], Dict[str, float]]:
        """Thread-safe retrieval of aligned wind data and metrics with in-memory caching.

        Args:
            force_refresh: If True, bypasses cache and re-queries Elexon APIs.

        Returns:
            Tuple of (records_list, metrics_dict)
        """
        if not force_refresh and self._cached_records is not None and self._cached_metrics is not None:
            logger.debug("Returning cached wind data and metrics.")
            return self._cached_records, self._cached_metrics

        with self._lock:
            # Double-check inside lock to prevent redundant fetches
            if not force_refresh and self._cached_records is not None and self._cached_metrics is not None:
                return self._cached_records, self._cached_metrics

            records, metrics = self.process_and_align_data()
            self._cached_records = records
            self._cached_metrics = metrics
            return records, metrics

    def get_wind_data(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Get aligned time-series wind data for January 2026."""
        records, _ = self.get_data_and_metrics(force_refresh=force_refresh)
        return records

    def get_metrics(self, force_refresh: bool = False) -> Dict[str, float]:
        """Get aggregated accuracy metrics for January 2026."""
        _, metrics = self.get_data_and_metrics(force_refresh=force_refresh)
        return metrics

    def clear_cache(self) -> None:
        """Clear the in-memory cache."""
        with self._lock:
            self._cached_records = None
            self._cached_metrics = None
            logger.info("In-memory cache cleared.")


# Singleton service instance for dependency injection across the FastAPI app
_data_service_instance: Optional[ElexonDataService] = None
_instance_lock = threading.Lock()


def get_data_service() -> ElexonDataService:
    """Return a shared singleton instance of ElexonDataService."""
    global _data_service_instance
    if _data_service_instance is None:
        with _instance_lock:
            if _data_service_instance is None:
                _data_service_instance = ElexonDataService()
    return _data_service_instance
