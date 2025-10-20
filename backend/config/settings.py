"""
Application settings and configuration
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import os


class Settings(BaseSettings):
    """Application settings"""
    PORT: int = 8000
    # Database settings
    DATABASE_URL: str = "postgresql://pm_user:pm_password@db:5432/project_management"

    # Keycloak OIDC settings
    KEYCLOAK_URL: str = "http://127.0.0.1:8180"
    KEYCLOAK_REALM: str = "project-management"
    KEYCLOAK_CLIENT_ID: str = "pm-backend"
    KEYCLOAK_CLIENT_SECRET: str = "your-backend-client-secret"

    # Derived Keycloak endpoints (computed from base URL and realm)
    @property
    def keycloak_realm_url(self) -> str:
        return f"{self.KEYCLOAK_URL.rstrip('/')}/realms/{self.KEYCLOAK_REALM}"

    @property
    def keycloak_certs_url(self) -> str:
        # JWKS endpoint for RS256 keys
        return f"{self.keycloak_realm_url}/protocol/openid-connect/certs"

    @property
    def keycloak_userinfo_url(self) -> str:
        return f"{self.keycloak_realm_url}/protocol/openid-connect/userinfo"

    # JWT settings
    JWT_ALGORITHM: str = "RS256"
    JWT_AUDIENCE: str = "account"
    # Tolerance when validating exp/nbf (seconds)
    JWT_TOKEN_EXPIRY_TOLERANCE: int = 30

    # Public key cache TTL (seconds)
    PUBLIC_KEY_CACHE_TTL: int = 3600

    # CORS settings
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://frontend:3000"
    ]

    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    # Security settings
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Application settings
    APP_NAME: str = "Project Management API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api/v1"

    # Time tracking settings
    MAX_DAILY_HOURS: int = 24
    OVERLAP_TOLERANCE_MINUTES: int = 0

    class Config:
        env_file = ".env"
        case_sensitive = True


def get_settings() -> Settings:
    """Get application settings"""
    return Settings()