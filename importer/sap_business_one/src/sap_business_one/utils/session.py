"""
Service Layer session management for SAP Business One.

This module provides helper functions for managing authenticated sessions
with the SAP Business One Service Layer.
"""

from contextlib import asynccontextmanager
import httpx
from loguru import logger

from sap_business_one.utils.settings import get_settings

# Get settings
settings = get_settings()

# Service Layer URLs
SERVICE_LAYER_BASE_URL = settings.sap.url
SERVICE_LAYER_BUSINESS_PARTNERS_URL = f"{SERVICE_LAYER_BASE_URL}/BusinessPartners"


@asynccontextmanager
async def get_service_layer_session():
    """
    Context manager for SAP Business One Service Layer session.

    Provides an authenticated httpx.AsyncClient with proper login/logout handling.

    Yields:
        httpx.AsyncClient: Authenticated session client
    """
    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        # Login
        login_data = {
            "CompanyDB": settings.sap.credentials.company_db,
            "UserName": settings.sap.credentials.username,
            "Password": settings.sap.credentials.password,
        }

        logger.info(f"Login data: {login_data}")


        login_response = await client.post(
            f"{SERVICE_LAYER_BASE_URL}/Login",
            json=login_data
        )
        login_response.raise_for_status()

        try:
            yield client
        finally:
            # Logout
            try:
                await client.post(f"{SERVICE_LAYER_BASE_URL}/Logout")
            except Exception:
                pass  # Ignore logout errors
