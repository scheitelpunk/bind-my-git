"""
OIDC Authentication with Keycloak integration
"""

import httpx
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
from fastapi import HTTPException, status
from typing import Dict, Any, Optional, List
from loguru import logger
import asyncio
from datetime import datetime, timedelta
from config.settings import Settings


class OIDCAuth:
    """Enhanced OIDC Authentication handler with caching and error handling"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._public_keys: Dict[str, Any] = {}
        self._public_keys_cache_time: Optional[datetime] = None
        self._lock = asyncio.Lock()

        # Initialize HTTP client with reasonable defaults
        self._http_client: Optional[httpx.AsyncClient] = None

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0),
                follow_redirects=True
            )
        return self._http_client

    async def close(self):
        """Close HTTP client"""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    async def get_public_keys(self) -> Dict[str, Any]:
        """Get Keycloak public keys with caching"""
        async with self._lock:
            # Check if cached keys are still valid
            if (
                    self._public_keys_cache_time
                    and datetime.utcnow() - self._public_keys_cache_time < timedelta(
                seconds=self.settings.PUBLIC_KEY_CACHE_TTL)
                    and self._public_keys
            ):
                return self._public_keys

            try:
                client = await self._get_http_client()
                response = await client.get(self.settings.keycloak_certs_url)
                response.raise_for_status()
                certs = response.json()

                if not certs.get("keys"):
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="No public keys found in Keycloak"
                    )

                # Convert JWKs to public keys and cache them
                public_keys = {}
                for key_data in certs["keys"]:
                    kid = key_data.get("kid")
                    if kid:
                        try:
                            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
                            public_keys[kid] = public_key
                        except Exception as e:
                            logger.warning(f"Failed to parse key {kid}: {e}")

                self._public_keys = public_keys
                self._public_keys_cache_time = datetime.utcnow()
                return public_keys

            except httpx.RequestError as e:
                logger.error(f"Network error getting Keycloak public keys: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service unavailable"
                )
            except Exception as e:
                logger.error(f"Failed to get Keycloak public keys: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve authentication keys"
                )

    async def get_public_key_by_kid(self, kid: str) -> Any:
        """Get specific public key by key ID"""
        public_keys = await self.get_public_keys()
        key = public_keys.get(kid)
        if not key:
            # Refresh keys and try again
            self._public_keys_cache_time = None
            public_keys = await self.get_public_keys()
            key = public_keys.get(kid)
            if not key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Public key not found for kid: {kid}"
                )
        return key

    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token with enhanced error handling"""

        print(f"token: {token}")

        try:
            # First decode header to get key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing key ID"
                )

            # Get the appropriate public key
            public_key = await self.get_public_key_by_kid(kid)

            # Decode and verify the token
            payload = jwt.decode(
                token,
                public_key,
                algorithms=[self.settings.JWT_ALGORITHM],
                audience=self.settings.JWT_AUDIENCE,
                # issuer=self.settings.keycloak_realm_url,
                leeway=timedelta(seconds=self.settings.JWT_TOKEN_EXPIRY_TOLERANCE)
            )

            # Additional validation
            self._validate_token_payload(payload)
            return payload

        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidAudienceError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience"
            )
        except jwt.InvalidIssuerError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token issuer"
            )
        except jwt.InvalidSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token signature"
            )
        except InvalidTokenError as e:
            logger.error(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format"
            )
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed"
            )

    def _validate_token_payload(self, payload: Dict[str, Any]) -> None:
        """Additional token payload validation"""
        # Check if token has required claims
        required_claims = ["sub", "iat", "exp", "iss"]
        missing_claims = [claim for claim in required_claims if claim not in payload]
        if missing_claims:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token missing required claims: {missing_claims}"
            )

        # Check if token is active (not yet valid)
        current_time = datetime.utcnow().timestamp()
        if payload.get("nbf") and current_time < payload["nbf"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token not yet valid"
            )

    async def get_user_info(self, token: str) -> Dict[str, Any]:
        """Get user information from Keycloak userinfo endpoint"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            client = await self._get_http_client()
            response = await client.get(self.settings.keycloak_userinfo_url, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token"
                )
            logger.error(f"HTTP error getting user info: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="User information service unavailable"
            )
        except Exception as e:
            logger.error(f"Failed to get user info: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve user information"
            )

    def check_role(self, user_info: Dict[str, Any], required_role: str) -> bool:
        """Check if user has required role (realm or client level)"""
        # Check realm roles
        realm_roles = user_info.get("realm_access", {}).get("roles", [])
        if required_role in realm_roles:
            return True

        # Check client roles
        resource_access = user_info.get("resource_access", {})
        for client_id, client_info in resource_access.items():
            client_roles = client_info.get("roles", [])
            if required_role in client_roles:
                return True

        return False

    def get_all_roles(self, user_info: Dict[str, Any]) -> List[str]:
        """Get all user roles (realm and client)"""
        roles = []

        # Add realm roles
        realm_roles = user_info.get("realm_access", {}).get("roles", [])
        roles.extend(realm_roles)

        # Add client roles
        resource_access = user_info.get("resource_access", {})
        for client_info in resource_access.values():
            client_roles = client_info.get("roles", [])
            roles.extend(client_roles)

        return list(set(roles))  # Remove duplicates

    def require_role(self, required_role: str):
        """Decorator to require specific role"""

        def decorator(func):
            async def wrapper(*args, **kwargs):
                # Extract user from kwargs (assuming it's passed as current_user)
                current_user = kwargs.get("current_user")
                if not current_user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not authenticated"
                    )

                if not self.check_role(current_user, required_role):
                    user_roles = self.get_all_roles(current_user)
                    logger.warning(
                        f"User {current_user.get('sub')} with roles {user_roles} "
                        f"attempted to access resource requiring role: {required_role}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied. Required role: {required_role}"
                    )

                return await func(*args, **kwargs)

            return wrapper

        return decorator

    def require_any_role(self, required_roles: List[str]):
        """Decorator to require any of the specified roles"""

        def decorator(func):
            async def wrapper(*args, **kwargs):
                current_user = kwargs.get("current_user")
                if not current_user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not authenticated"
                    )

                has_required_role = any(
                    self.check_role(current_user, role) for role in required_roles
                )

                if not has_required_role:
                    user_roles = self.get_all_roles(current_user)
                    logger.warning(
                        f"User {current_user.get('sub')} with roles {user_roles} "
                        f"attempted to access resource requiring any of roles: {required_roles}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied. Required any of roles: {required_roles}"
                    )

                return await func(*args, **kwargs)

            return wrapper

        return decorator
