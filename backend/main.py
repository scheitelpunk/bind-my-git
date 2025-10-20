"""
FastAPI Project Management System Backend
Main application entry point with OIDC authentication
"""
import uuid
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from contextlib import asynccontextmanager
import time
from typing import Dict, Any, List
from auth.user import get_current_user, oidc_auth

from config.settings import get_settings
from routers import time_entries, projects, tasks, users, time_tracking, members, customers, comments, orders, items, \
    notifications
from loguru import logger

# Configure logging
settings = get_settings()


# Initialize OIDC authentication
# oidc_auth = OIDCAuth(settings)
# security = HTTPBearer()

@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifespan manager with proper cleanup"""
    logger.info("Starting Project Management System API")
    try:
        yield
    finally:
        logger.info("Shutting down Project Management System API")
        # Clean up OIDC auth resources
        if hasattr(application.state, 'oidc_auth'):
            await application.state.oidc_auth.close()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="A comprehensive project management system with Keycloak OIDC authentication",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    openapi_url="/openapi.json"
)

# Store OIDC auth in app state
app.state.oidc_auth = oidc_auth

# Add security middleware
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*"]
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.4f}s"
    )
    return response


async def get_current_user_optional(
        credentials: HTTPAuthorizationCredentials = Depends(
            HTTPBearer(auto_error=False)
        )
) -> Dict[str, Any] | None:
    """
    Optional authentication dependency for public endpoints
    """
    if not credentials:
        return None

    try:
        x = await get_current_user(credentials)
        return x
    except HTTPException:
        return None


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "project-management-api"}


# Authentication endpoints
@app.get("/auth/user")
async def get_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user information with enhanced details"""
    all_roles = oidc_auth.get_all_roles(current_user)

    return {
        "user_id": current_user.get("sub"),
        "username": current_user.get("preferred_username"),
        "email": current_user.get("email"),
        "email_verified": current_user.get("email_verified", False),
        "name": current_user.get("name"),
        "given_name": current_user.get("given_name"),
        "family_name": current_user.get("family_name"),
        "realm_roles": current_user.get("realm_access", {}).get("roles", []),
        "client_roles": current_user.get("resource_access", {}),
        "all_roles": all_roles,
        "groups": current_user.get("groups", []),
        "session_state": current_user.get("session_state"),
        "issued_at": current_user.get("iat"),
        "expires_at": current_user.get("exp")
    }


@app.get("/auth/roles")
async def get_user_roles(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get all user roles"""
    return {
        "roles": oidc_auth.get_all_roles(current_user)
    }


@app.post("/auth/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout endpoint - token invalidation handled by Keycloak"""
    return {
        "message": "Logged out successfully",
        "user_id": current_user.get("sub")
    }


@app.get("/auth/check/{role}")
async def check_role_endpoint(
        role: str,
        current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Check if current user has specific role"""
    has_role = oidc_auth.check_role(current_user, role)
    return {
        "user_id": current_user.get("sub"),
        "role": role,
        "has_role": has_role,
        "all_roles": oidc_auth.get_all_roles(current_user)
    }


# Include routers with proper prefix
api_prefix = "/api/v1"  # settings.API_V1_PREFIX

app.include_router(
    users.router,
    prefix=f"{api_prefix}/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    tasks.router,
    prefix=f"{api_prefix}/tasks",
    tags=["tasks"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    projects.router,
    prefix=f"{api_prefix}/projects",
    tags=["projects"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    time_entries.router,
    prefix=f"{api_prefix}/time-entries",
    tags=["time-entries"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    time_tracking.router,
    prefix=f"{api_prefix}/time-tracking",
    tags=["time-tracking"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    members.router,
    prefix=f"{api_prefix}/members",
    tags=["members"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    customers.router,
    prefix=f"{api_prefix}/customers",
    tags=["customers"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    comments.router,
    prefix=f"{api_prefix}/comments",
    tags=["comments"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    orders.router,
    prefix=f"{api_prefix}/orders",
    tags=["orders"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    items.router,
    prefix=f"{api_prefix}/items",
    tags=["items"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    notifications.router,
    prefix=f"{api_prefix}/notifications",
    tags=["notifications"],
    dependencies=[Depends(get_current_user)]
)


# Enhanced exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper logging"""
    logger.warning(f"HTTP {exc.status_code} - {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path)
        },
        headers=exc.headers
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)

    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "error": str(exc),
                "type": type(exc).__name__,
                "path": str(request.url.path)
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "path": str(request.url.path)
            }
        )


def main():
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=settings.DEBUG
    )


if __name__ == "__main__":
    main()
