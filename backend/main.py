"""
main.py
=======
FastAPI application bootstrapping and REST API endpoints for the Energy Utility Dashboard.

Endpoints:
- GET /api/wind-data: Aligned actual vs forecast wind generation time-series for January 2026.
- GET /api/metrics: Aggregated accuracy metrics (MAE, RMSE) for January 2026.
- GET /api/health: Health check and service metadata.
- POST /api/cache/clear: Invalidate the in-memory cache.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict, List, Union

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from data_service import ElexonDataService, get_data_service

logger = logging.getLogger("energy_dashboard.main")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


# ------------------------------------------------------------------------------
# Pydantic Response Models
# ------------------------------------------------------------------------------

class WindDataPoint(BaseModel):
    """Schema representing an aligned time-series observation for wind generation."""
    startTime: str = Field(
        ...,
        description="Delivery interval start timestamp in ISO 8601 UTC format (e.g. 2026-01-01T00:00:00Z)",
        examples=["2026-01-01T00:00:00Z"],
    )
    actual: Union[int, float] = Field(
        ...,
        description="Actual outturn wind generation in MW",
        examples=[1200],
    )
    forecast: Union[int, float] = Field(
        ...,
        description="Day-ahead forecasted wind generation in MW",
        examples=[1150],
    )
    error: Union[int, float] = Field(
        ...,
        description="Forecast error in MW, defined as (actual - forecast)",
        examples=[50],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "startTime": "2026-01-01T00:00:00Z",
                "actual": 1200,
                "forecast": 1150,
                "error": 50,
            }
        }
    }


class MetricsResponse(BaseModel):
    """Schema representing aggregate forecast accuracy metrics for the entire month."""
    mae: float = Field(
        ...,
        description="Mean Absolute Error in MW across January 2026",
        examples=[1919.28],
    )
    rmse: float = Field(
        ...,
        description="Root Mean Squared Error in MW across January 2026",
        examples=[2395.25],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "mae": 1919.28,
                "rmse": 2395.25,
            }
        }
    }


class HealthResponse(BaseModel):
    """Schema for health-check endpoint."""
    status: str
    service: str
    version: str
    cached: bool


# ------------------------------------------------------------------------------
# Lifespan Context Manager
# ------------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context for startup and shutdown procedures."""
    logger.info("Initializing UK Wind Forecast Evaluation API...")
    # Service singleton initialized cleanly
    data_svc = get_data_service()
    logger.info("Service initialized. Ready to receive requests.")
    yield
    logger.info("Shutting down UK Wind Forecast Evaluation API...")


# ------------------------------------------------------------------------------
# FastAPI Application Initialization
# ------------------------------------------------------------------------------

app = FastAPI(
    title="UK Wind Power Generation Forecast Evaluation API",
    description=(
        "Production-grade backend service to evaluate the accuracy of UK day-ahead "
        "wind power generation forecasts against actual outturn data for January 2026. "
        "Data is sourced from Elexon BMRS FUELHH (actuals) and WINDFOR (forecasts) APIs."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ------------------------------------------------------------------------------
# CORS Middleware Configuration
# ------------------------------------------------------------------------------
# Configured to permit requests from local React frontend dev servers (e.g. Vite on 5173, Next.js on 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------------------

@app.get(
    "/api/wind-data",
    response_model=List[WindDataPoint],
    summary="Get aligned actual and forecasted wind generation time-series",
    tags=["Wind Generation"],
)
async def get_wind_data(
    refresh: bool = Query(
        False,
        description="Set to true to force a fresh fetch from Elexon APIs and invalidate the cache.",
    ),
    service: ElexonDataService = Depends(get_data_service),
) -> List[Dict[str, Any]]:
    """Retrieve aligned time-series of actual and day-ahead forecasted wind generation for January 2026.

    - **actual**: Wind generation outturn from Elexon `FUELHH/stream` (filtered for `fuelType == 'WIND'`).
    - **forecast**: Selected Day-Ahead forecast from Elexon `WINDFOR/stream` (latest publishTime on day D-1).
    - **error**: Forecast error defined as `actual - forecast` in MW.
    - **startTime**: Timestamp in ISO 8601 UTC format.
    """
    try:
        # Offload synchronous network I/O and pandas operations to worker thread
        data = await asyncio.to_thread(service.get_wind_data, force_refresh=refresh)
        return data
    except RuntimeError as err:
        logger.error("Upstream error while fetching wind data: %s", err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error communicating with Elexon API: {str(err)}",
        ) from err
    except Exception as err:
        logger.exception("Unexpected error while processing wind data: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error processing wind data: {str(err)}",
        ) from err


@app.get(
    "/api/metrics",
    response_model=MetricsResponse,
    summary="Get aggregate forecast accuracy metrics (MAE, RMSE)",
    tags=["Metrics"],
)
async def get_metrics(
    refresh: bool = Query(
        False,
        description="Set to true to force a fresh fetch from Elexon APIs and invalidate the cache.",
    ),
    service: ElexonDataService = Depends(get_data_service),
) -> Dict[str, float]:
    """Retrieve aggregate accuracy metrics for the entire month of January 2026.

    - **mae**: Mean Absolute Error = mean(|actual - forecast|)
    - **rmse**: Root Mean Squared Error = sqrt(mean((actual - forecast)^2))
    """
    try:
        metrics = await asyncio.to_thread(service.get_metrics, force_refresh=refresh)
        return metrics
    except RuntimeError as err:
        logger.error("Upstream error while calculating metrics: %s", err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error communicating with Elexon API: {str(err)}",
        ) from err
    except Exception as err:
        logger.exception("Unexpected error while calculating metrics: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error calculating metrics: {str(err)}",
        ) from err


@app.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Service health check",
    tags=["System"],
)
async def health_check(
    service: ElexonDataService = Depends(get_data_service),
) -> HealthResponse:
    """Returns service health status and caching state."""
    is_cached = service._cached_records is not None
    return HealthResponse(
        status="healthy",
        service="UK Wind Power Generation Forecast Evaluation Backend",
        version="1.0.0",
        cached=is_cached,
    )


@app.post(
    "/api/cache/clear",
    summary="Clear in-memory cache",
    tags=["System"],
)
async def clear_cache(
    service: ElexonDataService = Depends(get_data_service),
) -> Dict[str, str]:
    """Manually invalidates the in-memory cache to force re-fetching on subsequent requests."""
    service.clear_cache()
    return {"message": "In-memory cache successfully cleared."}


@app.get(
    "/",
    summary="Root overview",
    include_in_schema=False,
)
async def root() -> Dict[str, Any]:
    """Root endpoint providing links to documentation and key API endpoints."""
    return {
        "title": "UK Wind Generation Forecast Evaluation API",
        "status": "online",
        "documentation": "/docs",
        "endpoints": {
            "wind_data": "/api/wind-data",
            "metrics": "/api/metrics",
            "health": "/api/health",
        },
    }


# ------------------------------------------------------------------------------
# Local Execution Entry Point
# ------------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
