"""
Unit tests for user authentication dependencies
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from auth.user import get_current_user, oidc_auth


@pytest.mark.unit
@pytest.mark.auth
class TestUserAuth:
    """Tests for user authentication functions"""

    @pytest.mark.asyncio
    async def test_get_current_user_success(self, mock_user_payload):
        """Test successful user authentication"""
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="valid-token"
        )

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            user_info = await get_current_user(credentials)

            assert user_info["sub"] == "test-user-123"
            assert user_info["email"] == "test@example.com"
            assert user_info["preferred_username"] == "testuser"

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self):
        """Test authentication with invalid token"""
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="invalid-token"
        )

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(side_effect=HTTPException(status_code=401, detail="Invalid token"))):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(credentials)

            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_expired_token(self):
        """Test authentication with expired token"""
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="expired-token"
        )

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(side_effect=HTTPException(status_code=401, detail="Token has expired"))):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(credentials)

            assert exc_info.value.status_code == 401
            assert "expired" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_get_current_user_general_exception(self):
        """Test authentication with unexpected error"""
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="error-token"
        )

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(side_effect=Exception("Unexpected error"))):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(credentials)

            assert exc_info.value.status_code == 401
            assert "Authentication failed" in exc_info.value.detail
