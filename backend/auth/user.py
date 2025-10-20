# Enhanced authentication dependencies
from typing import Dict, Any

from loguru import logger
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth.oidc_auth import OIDCAuth
from config.settings import get_settings

oidc_auth = OIDCAuth(get_settings())
security = HTTPBearer()


async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user from OIDC token
    """

    print(credentials)
    try:
        user_info = await oidc_auth.verify_token(credentials.credentials)
        return user_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )
