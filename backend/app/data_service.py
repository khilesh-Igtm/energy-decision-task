"""
app.data_service
================
Module entry point allowing imports via `app.data_service`.
Re-exports `ElexonDataService` and `get_data_service` from `data_service.py`.
"""

from data_service import ElexonDataService, get_data_service

__all__ = ["ElexonDataService", "get_data_service"]
