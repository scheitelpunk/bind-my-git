# FastAPI Backend Architecture

## Application Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application factory
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py         # Environment configuration
│   │   └── database.py         # Database connection setup
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py         # JWT and OIDC handling
│   │   ├── permissions.py      # RBAC implementation
│   │   ├── dependencies.py     # FastAPI dependencies
│   │   └── exceptions.py       # Custom exception handlers
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py            # SQLAlchemy base model
│   │   ├── user.py            # User model (Keycloak integration)
│   │   ├── organization.py    # Organization model
│   │   ├── project.py         # Project and ProjectMember models
│   │   ├── task.py            # Task, Comment, Attachment models
│   │   └── time_entry.py      # TimeEntry model with validation
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── base.py            # Pydantic base schemas
│   │   ├── user.py            # User request/response schemas
│   │   ├── organization.py    # Organization schemas
│   │   ├── project.py         # Project schemas
│   │   ├── task.py            # Task schemas
│   │   └── time_entry.py      # TimeEntry schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py    # Authentication service
│   │   ├── user_service.py    # User management
│   │   ├── project_service.py # Project operations
│   │   ├── task_service.py    # Task management
│   │   ├── time_service.py    # Time tracking logic
│   │   └── report_service.py  # Report generation
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py            # API dependencies
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py        # Authentication endpoints
│   │   │   ├── users.py       # User endpoints
│   │   │   ├── organizations.py # Organization endpoints
│   │   │   ├── projects.py    # Project endpoints
│   │   │   ├── tasks.py       # Task endpoints
│   │   │   ├── time_entries.py # Time tracking endpoints
│   │   │   └── reports.py     # Reporting endpoints
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py         # Database session management
│   │   └── migrations/        # Alembic migrations
│   └── utils/
│       ├── __init__.py
│       ├── validators.py      # Custom validators
│       ├── formatters.py      # Data formatters
│       └── email.py           # Email utilities
├── tests/
├── alembic.ini
├── pyproject.toml
└── Dockerfile
```

## Core Components

### 1. Application Factory (main.py)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, users, projects, tasks, time_entries, reports

def create_application() -> FastAPI:
    app = FastAPI(
        title="Project Management API",
        description="Time tracking and project management system",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json"
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
    app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
    app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
    app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
    app.include_router(time_entries.router, prefix="/api/v1/time-entries", tags=["time-tracking"])
    app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])

    return app
```

### 2. Security Implementation (core/security.py)
```python
from typing import Optional
import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security = HTTPBearer()

async def verify_jwt_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Verify JWT token and extract user information."""
    try:
        # Verify with Keycloak public key
        payload = jwt.decode(
            credentials.credentials,
            settings.KEYCLOAK_PUBLIC_KEY,
            algorithms=["RS256"],
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=settings.KEYCLOAK_ISSUER
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, token_payload: dict = Depends(verify_jwt_token)) -> dict:
        user_roles = token_payload.get("realm_access", {}).get("roles", [])
        if not any(role in user_roles for role in self.allowed_roles):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        return token_payload
```

### 3. Time Entry Validation Service (services/time_service.py)
```python
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.time_entry import TimeEntry
from app.schemas.time_entry import TimeEntryCreate, TimeEntryUpdate

class TimeEntryService:
    def __init__(self, db: Session):
        self.db = db

    async def validate_no_overlap(
        self,
        user_id: str,
        start_time: datetime,
        end_time: datetime,
        exclude_id: Optional[str] = None
    ) -> bool:
        """Validate that new time entry doesn't overlap with existing ones."""
        query = self.db.query(TimeEntry).filter(
            TimeEntry.user_id == user_id,
            TimeEntry.id != exclude_id if exclude_id else True
        ).filter(
            # Check for any overlap
            ((TimeEntry.start_time <= start_time) & (TimeEntry.end_time > start_time)) |
            ((TimeEntry.start_time < end_time) & (TimeEntry.end_time >= end_time)) |
            ((TimeEntry.start_time >= start_time) & (TimeEntry.end_time <= end_time))
        )

        overlapping_entries = query.all()
        return len(overlapping_entries) == 0

    async def create_time_entry(
        self,
        time_entry_data: TimeEntryCreate,
        user_id: str
    ) -> TimeEntry:
        """Create new time entry with validation."""
        # Validate no overlap
        if not await self.validate_no_overlap(
            user_id,
            time_entry_data.start_time,
            time_entry_data.end_time
        ):
            raise ValueError("Time entry overlaps with existing entry")

        # Create time entry
        time_entry = TimeEntry(
            **time_entry_data.dict(),
            user_id=user_id
        )

        self.db.add(time_entry)
        self.db.commit()
        self.db.refresh(time_entry)

        return time_entry
```

## API Design Patterns

### 1. RESTful Endpoints
```python
# Standard CRUD operations
GET    /api/v1/projects           # List projects
POST   /api/v1/projects           # Create project
GET    /api/v1/projects/{id}      # Get project
PUT    /api/v1/projects/{id}      # Update project
DELETE /api/v1/projects/{id}      # Delete project

# Nested resources
GET    /api/v1/projects/{id}/tasks        # List project tasks
POST   /api/v1/projects/{id}/tasks        # Create task in project
GET    /api/v1/projects/{id}/members      # List project members
POST   /api/v1/projects/{id}/members      # Add project member

# Time tracking specific
GET    /api/v1/time-entries               # List time entries (filtered)
POST   /api/v1/time-entries               # Create time entry
PUT    /api/v1/time-entries/{id}          # Update time entry
DELETE /api/v1/time-entries/{id}          # Delete time entry
GET    /api/v1/time-entries/current       # Get current running entry
POST   /api/v1/time-entries/{id}/stop     # Stop running time entry

# Reporting
GET    /api/v1/reports/timesheet          # Generate timesheet
GET    /api/v1/reports/project-summary    # Project time summary
GET    /api/v1/reports/user-productivity  # User productivity report
```

### 2. Response Formats
```python
# Success Response
{
    "success": true,
    "data": {...},
    "message": "Operation completed successfully"
}

# Error Response
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": {...}
    }
}

# Paginated Response
{
    "success": true,
    "data": [...],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total": 150,
        "pages": 8
    }
}
```

### 3. Input Validation with Pydantic
```python
from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional

class TimeEntryCreate(BaseModel):
    task_id: str
    project_id: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    is_billable: bool = True
    hourly_rate: Optional[float] = None

    @validator('end_time')
    def end_time_after_start_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('End time must be after start time')
        return v

    @validator('hourly_rate')
    def hourly_rate_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Hourly rate must be positive')
        return v
```

## Performance Optimizations

### 1. Database Connection Pooling
```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=300
)
```

### 2. Async Operations
```python
from fastapi import BackgroundTasks

@router.post("/reports/generate")
async def generate_report(
    report_type: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(verify_jwt_token)
):
    # Queue report generation in background
    background_tasks.add_task(
        generate_report_async,
        report_type,
        current_user["sub"]
    )
    return {"message": "Report generation started"}
```

### 3. Caching Strategy
```python
from functools import lru_cache
import redis

redis_client = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT)

@lru_cache(maxsize=128)
async def get_user_permissions(user_id: str) -> list[str]:
    """Cache user permissions for performance."""
    cached = redis_client.get(f"permissions:{user_id}")
    if cached:
        return json.loads(cached)

    # Fetch from database
    permissions = await fetch_user_permissions(user_id)
    redis_client.setex(
        f"permissions:{user_id}",
        300,  # 5 minutes TTL
        json.dumps(permissions)
    )
    return permissions
```

## Error Handling and Logging

### 1. Custom Exception Handler
```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )
```

### 2. Structured Logging
```python
import structlog

logger = structlog.get_logger()

@router.post("/time-entries")
async def create_time_entry(
    time_entry_data: TimeEntryCreate,
    current_user: dict = Depends(verify_jwt_token)
):
    logger.info(
        "Creating time entry",
        user_id=current_user["sub"],
        task_id=time_entry_data.task_id,
        duration=time_entry_data.end_time - time_entry_data.start_time
    )
    # Implementation...
```