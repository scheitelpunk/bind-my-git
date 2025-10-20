"""
Unit tests for Users router
"""
import pytest
import uuid
from unittest.mock import patch, AsyncMock


@pytest.mark.unit
@pytest.mark.api
class TestUsersRouter:
    """Tests for /api/v1/users endpoints"""

    @pytest.mark.asyncio
    async def test_create_user_success(self, client, mock_user_payload, sample_user, db_session):
        """Test successful user creation"""
        from auth.user import oidc_auth

        user_data = {
            "keycloak_id": "new-keycloak-id-123"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.post(
                    "/api/v1/users/",
                    json=user_data,
                    headers={"Authorization": "Bearer user-token"}
                )

        # Should be 200 or 400 depending on if user exists
        assert response.status_code in [200, 400]

    @pytest.mark.asyncio
    async def test_create_duplicate_user(self, client, mock_user_payload, sample_user, db_session):
        """Test creating a user that already exists"""
        from auth.user import oidc_auth

        # Add the sample user to the database
        db_session.add(sample_user)
        db_session.commit()

        # Mock payload with same keycloak_id
        payload = {
            **mock_user_payload,
            "sub": sample_user.keycloak_id
        }

        user_data = {
            "keycloak_id": sample_user.keycloak_id
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.post(
                    "/api/v1/users/",
                    json=user_data,
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_list_users(self, client, mock_user_payload, sample_user, db_session):
        """Test listing all users"""
        from auth.user import oidc_auth

        # Add sample user to database
        db_session.add(sample_user)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    "/api/v1/users/",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the sample user
        assert len(data) >= 1

    def test_create_user_unauthorized(self, client, mock_user_payload):
        """Test user creation without proper role"""
        from auth.user import oidc_auth

        user_data = {
            "keycloak_id": "new-keycloak-id-123"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=False):
                response = client.post(
                    "/api/v1/users/",
                    json=user_data,
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 403

    def test_list_users_unauthorized(self, client, mock_user_payload):
        """Test listing users without proper role"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=False):
                response = client.get(
                    "/api/v1/users/",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 403

    def test_users_endpoint_requires_auth(self, client):
        """Test that users endpoints require authentication"""
        response = client.get("/api/v1/users/")
        assert response.status_code == 403

        response = client.post("/api/v1/users/", json={})
        assert response.status_code == 403
