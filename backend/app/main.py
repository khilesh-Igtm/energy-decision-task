"""
app.main
========
Module entry point allowing Uvicorn to run via `uvicorn app.main:app`.
Re-exports the FastAPI `app` instance from `main.py`.
"""

from main import app, get_data_service

__all__ = ["app", "get_data_service"]
