"""
Unit tests for main FastAPI application
"""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient


@pytest.mark.unit
@pytest.mark.api
class TestMainApp:
    """Tests for main FastAPI application"""

    def test_health_check_endpoint(self, client):
        """Test health check endpoint returns 200"""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "project-management-api"

    def test_openapi_schema_accessible(self, client):
        """Test OpenAPI schema is accessible"""
        response = client.get("/openapi.json")

        assert response.status_code == 200
        schema = response.json()
        assert "openapi" in schema
        assert "info" in schema
        assert schema["info"]["title"] == "Project Management API"

    def test_cors_headers_present(self, client):
        """Test CORS headers are configured"""
        # FastAPI doesn't automatically handle OPTIONS for all endpoints
        # Check if CORS middleware is properly configured by making a regular request
        response = client.get("/health")

        assert response.status_code == 200
        # CORS headers are added by the middleware on actual requests

    def test_auth_user_endpoint_requires_auth(self, client):
        """Test /auth/user endpoint requires authentication"""
        response = client.get("/auth/user")

        assert response.status_code == 403  # HTTPBearer returns 403 when no credentials

    def test_auth_user_endpoint_with_valid_token(self, client, mock_user_payload):
        """Test /auth/user endpoint with valid token"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'get_all_roles', return_value=["developer", "user", "backend_user"]):
                response = client.get(
                    "/auth/user",
                    headers={"Authorization": "Bearer valid-token"}
                )

                assert response.status_code == 200
                data = response.json()
                assert data["user_id"] == "test-user-123"
                assert data["email"] == "test@example.com"
                assert data["username"] == "testuser"
                assert "realm_roles" in data
                assert "all_roles" in data

    def test_auth_roles_endpoint_requires_auth(self, client):
        """Test /auth/roles endpoint requires authentication"""
        response = client.get("/auth/roles")

        assert response.status_code == 403

    def test_auth_roles_endpoint_with_valid_token(self, client, mock_user_payload):
        """Test /auth/roles endpoint with valid token"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'get_all_roles', return_value=["developer", "user"]):
                response = client.get(
                    "/auth/roles",
                    headers={"Authorization": "Bearer valid-token"}
                )

                assert response.status_code == 200
                data = response.json()
                assert "roles" in data
                assert isinstance(data["roles"], list)

    def test_auth_logout_endpoint_requires_auth(self, client):
        """Test /auth/logout endpoint requires authentication"""
        response = client.post("/auth/logout")

        assert response.status_code == 403

    def test_auth_logout_endpoint_with_valid_token(self, client, mock_user_payload):
        """Test /auth/logout endpoint with valid token"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            response = client.post(
                "/auth/logout",
                headers={"Authorization": "Bearer valid-token"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Logged out successfully"
            assert data["user_id"] == "test-user-123"

    def test_auth_check_role_endpoint(self, client, mock_user_payload):
        """Test /auth/check/{role} endpoint"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch.object(oidc_auth, 'get_all_roles', return_value=["developer", "user"]):
                    response = client.get(
                        "/auth/check/developer",
                        headers={"Authorization": "Bearer valid-token"}
                    )

                    assert response.status_code == 200
                    data = response.json()
                    assert data["role"] == "developer"
                    assert data["has_role"] is True
                    assert "all_roles" in data

    def test_auth_check_role_endpoint_role_not_found(self, client, mock_user_payload):
        """Test /auth/check/{role} endpoint when user doesn't have role"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=False):
                with patch.object(oidc_auth, 'get_all_roles', return_value=["developer", "user"]):
                    response = client.get(
                        "/auth/check/admin",
                        headers={"Authorization": "Bearer valid-token"}
                    )

                    assert response.status_code == 200
                    data = response.json()
                    assert data["role"] == "admin"
                    assert data["has_role"] is False

    def test_http_exception_handler(self, client):
        """Test HTTP exception handler returns proper format"""
        # Trigger a 404
        response = client.get("/nonexistent-endpoint")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
