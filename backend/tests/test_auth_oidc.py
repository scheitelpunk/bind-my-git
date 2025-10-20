"""
Unit tests for OIDC Authentication
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from fastapi import HTTPException
import jwt

from auth.oidc_auth import OIDCAuth
from config.settings import Settings


@pytest.fixture
def settings():
    """Create test settings"""
    return Settings(
        KEYCLOAK_URL="http://localhost:8180",
        KEYCLOAK_REALM="test-realm",
        JWT_ALGORITHM="RS256",
        JWT_AUDIENCE="account",
        PUBLIC_KEY_CACHE_TTL=3600
    )


@pytest.fixture
def oidc_auth(settings):
    """Create OIDCAuth instance"""
    return OIDCAuth(settings)


@pytest.mark.unit
@pytest.mark.auth
class TestOIDCAuth:
    """Tests for OIDCAuth class"""

    def test_initialization(self, oidc_auth, settings):
        """Test OIDC auth initializes correctly"""
        assert oidc_auth.settings == settings
        assert oidc_auth._public_keys == {}
        assert oidc_auth._public_keys_cache_time is None

    @pytest.mark.asyncio
    async def test_get_http_client_creates_client(self, oidc_auth):
        """Test HTTP client is created on first access"""
        client = await oidc_auth._get_http_client()
        assert client is not None
        assert oidc_auth._http_client is not None
        await oidc_auth.close()

    @pytest.mark.asyncio
    async def test_close_http_client(self, oidc_auth):
        """Test HTTP client is properly closed"""
        await oidc_auth._get_http_client()
        assert oidc_auth._http_client is not None

        await oidc_auth.close()
        assert oidc_auth._http_client is None

    @pytest.mark.asyncio
    async def test_get_public_keys_success(self, oidc_auth):
        """Test successful retrieval of public keys"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "keys": [
                {
                    "kid": "test-key-id",
                    "kty": "RSA",
                    "use": "sig",
                    "n": "test-n",
                    "e": "AQAB"
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(oidc_auth, '_get_http_client') as mock_client:
            mock_http = AsyncMock()
            mock_http.get = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_http

            with patch('jwt.algorithms.RSAAlgorithm.from_jwk') as mock_from_jwk:
                mock_from_jwk.return_value = "mock-public-key"

                keys = await oidc_auth.get_public_keys()

                assert "test-key-id" in keys
                assert keys["test-key-id"] == "mock-public-key"
                assert oidc_auth._public_keys_cache_time is not None

    @pytest.mark.asyncio
    async def test_get_public_keys_uses_cache(self, oidc_auth):
        """Test that cached keys are used when valid"""
        oidc_auth._public_keys = {"cached-key": "cached-value"}
        oidc_auth._public_keys_cache_time = datetime.utcnow()

        keys = await oidc_auth.get_public_keys()

        assert keys == {"cached-key": "cached-value"}

    @pytest.mark.asyncio
    async def test_get_public_keys_no_keys_error(self, oidc_auth):
        """Test error when no keys are returned"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"keys": []}
        mock_response.raise_for_status = MagicMock(side_effect=Exception("Test exception"))

        with patch.object(oidc_auth, '_get_http_client') as mock_client:
            mock_http = AsyncMock()
            mock_http.get = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_http

            with pytest.raises(HTTPException) as exc_info:
                await oidc_auth.get_public_keys()

            assert exc_info.value.status_code == 500
            assert "Failed to retrieve authentication keys" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_public_key_by_kid_success(self, oidc_auth):
        """Test retrieving specific key by kid"""
        oidc_auth._public_keys = {"test-kid": "test-key"}
        oidc_auth._public_keys_cache_time = datetime.utcnow()

        key = await oidc_auth.get_public_key_by_kid("test-kid")

        assert key == "test-key"

    @pytest.mark.asyncio
    async def test_get_public_key_by_kid_not_found(self, oidc_auth):
        """Test error when key ID is not found"""
        oidc_auth._public_keys = {}
        oidc_auth._public_keys_cache_time = None

        mock_response = MagicMock()
        mock_response.json.return_value = {"keys": []}
        mock_response.raise_for_status = MagicMock(side_effect=Exception("Test exception"))

        with patch.object(oidc_auth, '_get_http_client') as mock_client:
            mock_http = AsyncMock()
            mock_http.get = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_http

            with pytest.raises(HTTPException) as exc_info:
                await oidc_auth.get_public_key_by_kid("missing-kid")

            assert exc_info.value.status_code in [401, 500]

    def test_validate_token_payload_success(self, oidc_auth):
        """Test successful token payload validation"""
        payload = {
            "sub": "user-123",
            "iat": 1234567890,
            "exp": 1234567890 + 3600,
            "iss": "http://localhost:8180/realms/test"
        }

        # Should not raise exception
        oidc_auth._validate_token_payload(payload)

    def test_validate_token_payload_missing_claims(self, oidc_auth):
        """Test validation fails with missing required claims"""
        payload = {
            "sub": "user-123",
            "iat": 1234567890
            # Missing exp and iss
        }

        with pytest.raises(HTTPException) as exc_info:
            oidc_auth._validate_token_payload(payload)

        assert exc_info.value.status_code == 401
        assert "missing required claims" in exc_info.value.detail

    def test_validate_token_payload_not_yet_valid(self, oidc_auth):
        """Test validation fails when token is not yet valid"""
        future_time = datetime.utcnow().timestamp() + 3600
        payload = {
            "sub": "user-123",
            "iat": 1234567890,
            "exp": 1234567890 + 7200,
            "iss": "http://localhost:8180/realms/test",
            "nbf": future_time
        }

        with pytest.raises(HTTPException) as exc_info:
            oidc_auth._validate_token_payload(payload)

        assert exc_info.value.status_code == 401
        assert "not yet valid" in exc_info.value.detail

    def test_check_role_realm_role(self, oidc_auth):
        """Test checking realm roles"""
        user_info = {
            "realm_access": {
                "roles": ["admin", "user"]
            }
        }

        assert oidc_auth.check_role(user_info, "admin") is True
        assert oidc_auth.check_role(user_info, "user") is True
        assert oidc_auth.check_role(user_info, "nonexistent") is False

    def test_check_role_client_role(self, oidc_auth):
        """Test checking client roles"""
        user_info = {
            "realm_access": {"roles": []},
            "resource_access": {
                "pm-backend": {
                    "roles": ["backend_admin"]
                }
            }
        }

        assert oidc_auth.check_role(user_info, "backend_admin") is True
        assert oidc_auth.check_role(user_info, "nonexistent") is False

    def test_get_all_roles(self, oidc_auth):
        """Test getting all user roles"""
        user_info = {
            "realm_access": {
                "roles": ["admin", "user"]
            },
            "resource_access": {
                "pm-backend": {
                    "roles": ["backend_admin"]
                },
                "other-client": {
                    "roles": ["other_role"]
                }
            }
        }

        roles = oidc_auth.get_all_roles(user_info)

        assert "admin" in roles
        assert "user" in roles
        assert "backend_admin" in roles
        assert "other_role" in roles
        assert len(set(roles)) == len(roles)  # No duplicates

    def test_get_all_roles_empty(self, oidc_auth):
        """Test getting roles when user has none"""
        user_info = {
            "realm_access": {"roles": []},
            "resource_access": {}
        }

        roles = oidc_auth.get_all_roles(user_info)

        assert roles == []

    @pytest.mark.asyncio
    async def test_get_user_info_success(self, oidc_auth):
        """Test successful user info retrieval"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "sub": "user-123",
            "email": "test@example.com",
            "name": "Test User"
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(oidc_auth, '_get_http_client') as mock_client:
            mock_http = AsyncMock()
            mock_http.get = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_http

            user_info = await oidc_auth.get_user_info("test-token")

            assert user_info["sub"] == "user-123"
            assert user_info["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_verify_token_expired(self, oidc_auth):
        """Test token verification with expired token"""
        with patch('jwt.get_unverified_header') as mock_header:
            mock_header.return_value = {"kid": "test-kid"}

            with patch.object(oidc_auth, 'get_public_key_by_kid', new=AsyncMock(return_value="mock-key")):
                with patch('jwt.decode') as mock_decode:
                    mock_decode.side_effect = jwt.ExpiredSignatureError()

                    with pytest.raises(HTTPException) as exc_info:
                        await oidc_auth.verify_token("expired-token")

                    assert exc_info.value.status_code == 401
                    assert "expired" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_verify_token_invalid_signature(self, oidc_auth):
        """Test token verification with invalid signature"""
        with patch('jwt.get_unverified_header') as mock_header:
            mock_header.return_value = {"kid": "test-kid"}

            with patch.object(oidc_auth, 'get_public_key_by_kid', new=AsyncMock(return_value="mock-key")):
                with patch('jwt.decode') as mock_decode:
                    mock_decode.side_effect = jwt.InvalidSignatureError()

                    with pytest.raises(HTTPException) as exc_info:
                        await oidc_auth.verify_token("invalid-token")

                    assert exc_info.value.status_code == 401
                    assert "signature" in exc_info.value.detail.lower()
