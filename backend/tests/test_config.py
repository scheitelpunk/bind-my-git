"""
Unit tests for configuration settings
"""
import pytest
from config.settings import Settings, get_settings


@pytest.mark.unit
class TestSettings:
    """Tests for Settings configuration"""

    def test_settings_defaults(self):
        """Test default settings values"""
        settings = Settings()

        assert settings.PORT == 8000
        assert settings.APP_NAME == "Project Management API"
        assert settings.APP_VERSION == "1.0.0"
        assert settings.DEBUG is True
        assert settings.LOG_LEVEL == "INFO"
        assert settings.JWT_ALGORITHM == "RS256"
        assert settings.JWT_AUDIENCE == "account"

    def test_settings_keycloak_url_construction(self):
        """Test Keycloak URL properties are constructed correctly"""
        settings = Settings(
            KEYCLOAK_URL="http://localhost:8180",
            KEYCLOAK_REALM="test-realm"
        )

        assert settings.keycloak_realm_url == "http://localhost:8180/realms/test-realm"
        assert settings.keycloak_certs_url == "http://localhost:8180/realms/test-realm/protocol/openid-connect/certs"
        assert settings.keycloak_userinfo_url == "http://localhost:8180/realms/test-realm/protocol/openid-connect/userinfo"

    def test_settings_keycloak_url_trailing_slash(self):
        """Test Keycloak URL handles trailing slash correctly"""
        settings = Settings(
            KEYCLOAK_URL="http://localhost:8180/",
            KEYCLOAK_REALM="test-realm"
        )

        assert settings.keycloak_realm_url == "http://localhost:8180/realms/test-realm"

    def test_settings_cors_origins_string_parsing(self):
        """Test CORS origins parsing from comma-separated string"""
        settings = Settings(
            ALLOWED_ORIGINS="http://localhost:3000,http://localhost:8080,http://example.com"
        )

        assert isinstance(settings.ALLOWED_ORIGINS, list)
        assert len(settings.ALLOWED_ORIGINS) == 3
        assert "http://localhost:3000" in settings.ALLOWED_ORIGINS
        assert "http://localhost:8080" in settings.ALLOWED_ORIGINS
        assert "http://example.com" in settings.ALLOWED_ORIGINS

    def test_settings_cors_origins_list(self):
        """Test CORS origins as list"""
        origins = ["http://localhost:3000", "http://localhost:8080"]
        settings = Settings(ALLOWED_ORIGINS=origins)

        assert settings.ALLOWED_ORIGINS == origins

    def test_settings_time_tracking_config(self):
        """Test time tracking configuration"""
        settings = Settings()

        assert settings.MAX_DAILY_HOURS == 24
        assert settings.OVERLAP_TOLERANCE_MINUTES == 0

    def test_settings_jwt_config(self):
        """Test JWT configuration"""
        settings = Settings()

        assert settings.JWT_ALGORITHM == "RS256"
        assert settings.JWT_AUDIENCE == "account"
        assert settings.JWT_TOKEN_EXPIRY_TOLERANCE == 30
        assert settings.PUBLIC_KEY_CACHE_TTL == 3600

    def test_get_settings_function(self):
        """Test get_settings function returns Settings instance"""
        settings = get_settings()

        assert isinstance(settings, Settings)

    def test_settings_database_url(self):
        """Test database URL configuration"""
        settings = Settings()

        assert settings.DATABASE_URL is not None
        assert isinstance(settings.DATABASE_URL, str)

    def test_settings_custom_values(self):
        """Test settings with custom values"""
        settings = Settings(
            PORT=9000,
            DEBUG=False,
            LOG_LEVEL="ERROR",
            MAX_DAILY_HOURS=16
        )

        assert settings.PORT == 9000
        assert settings.DEBUG is False
        assert settings.LOG_LEVEL == "ERROR"
        assert settings.MAX_DAILY_HOURS == 16
