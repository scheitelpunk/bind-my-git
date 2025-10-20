# Project Management System - Backend API

A comprehensive FastAPI-based backend service for project management with Keycloak OIDC authentication, PostgreSQL database, and RESTful API design.

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Database Models](#database-models)
- [API Endpoints](#api-endpoints)
- [Development](#development)
- [Testing](#testing)
- [Docker](#docker)
- [Project Structure](#project-structure)

## 🎯 Overview

This backend service provides a complete project management solution with features including:

- **User Management**: Keycloak-based authentication with role-based access control
- **Project Management**: Create, update, and manage projects with member assignments
- **Task Management**: Full CRUD operations for tasks with status tracking
- **Time Tracking**: Time entry management with overlap prevention
- **Customer Management**: Customer/client association with projects
- **Member Management**: Project team member assignment and permissions

## 🛠 Technology Stack

### Core Framework
- **FastAPI** (v0.104.1+): Modern, high-performance web framework
- **Python** (3.11): Programming language
- **Uvicorn** (v0.24.0+): ASGI server

### Database & ORM
- **PostgreSQL**: Primary database
- **SQLAlchemy** (v2.0.23+): ORM and database toolkit
- **Alembic** (v1.12.1+): Database migrations
- **psycopg2-binary** (v2.9.9+): PostgreSQL adapter

### Authentication & Security
- **Keycloak**: Identity and access management
- **Authlib** (v1.2.1+): OAuth/OIDC client library
- **PyJWT** (v2.8.0+): JSON Web Token implementation
- **Cryptography** (v44.0.1+): Cryptographic operations
- **python-jose[cryptography]** (v3.3.0+): JWT encoding/decoding

### Utilities
- **Pydantic** (v2.5.0+): Data validation and settings management
- **Loguru** (v0.1.0+): Advanced logging
- **httpx** (v0.25.2+): HTTP client for async requests

### Testing
- **pytest** (v7.4.3+): Testing framework
- **pytest-asyncio** (v0.21.1+): Async test support
- **pytest-cov** (v4.1.0+): Code coverage
- **pytest-mock** (v3.12.0+): Mocking support
- **factory-boy** (v3.3.0+): Test fixture factories

### Task Processing (Optional)
- **Celery** (v5.3.4+): Distributed task queue
- **Redis** (v5.0.1+): Message broker and cache

## 🏗 Architecture

### Application Structure

```
backend/
├── main.py                 # Application entry point
├── config/
│   └── settings.py        # Application configuration
├── database/
│   └── connection.py      # Database connection and session management
├── auth/
│   ├── oidc_auth.py      # OIDC authentication implementation
│   └── user.py           # User authentication utilities
├── models/
│   ├── user.py           # User model and schemas
│   ├── project.py        # Project model and schemas
│   ├── task.py           # Task model and schemas
│   ├── time_entry.py     # Time entry models
│   ├── time_tracking.py  # Time tracking models
│   ├── customers.py      # Customer models
│   └── members.py        # Project member models
└── routers/
    ├── users.py          # User endpoints
    ├── projects.py       # Project endpoints
    ├── tasks.py          # Task endpoints
    ├── time_entries.py   # Time entry endpoints
    ├── time_tracking.py  # Time tracking endpoints
    ├── customers.py      # Customer endpoints
    └── members.py        # Member management endpoints
```

### Design Patterns

1. **Layered Architecture**: Clear separation between routes, business logic, and data access
2. **Dependency Injection**: FastAPI's dependency system for database sessions and authentication
3. **Repository Pattern**: Database access through SQLAlchemy ORM
4. **Schema Validation**: Pydantic models for request/response validation
5. **Middleware Pattern**: CORS, logging, and error handling middleware

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 12+
- Keycloak 21+ (running instance)
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**:
```bash
cd backend
```

2. **Create virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure environment variables** (see [Configuration](#configuration))

5. **Run database migrations** (if using Alembic):
```bash
alembic upgrade head
```

6. **Start the server**:
```bash
# Development mode (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

### Quick Start with Docker

```bash
# Build and run
docker build -t pm-backend .
docker run -p 8000:8000 pm-backend
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# Server Configuration
PORT=8000
DEBUG=true
LOG_LEVEL=INFO

# Database Configuration
DATABASE_URL=postgresql://pm_user:pm_password@db:5432/project_management

# Keycloak OIDC Configuration
KEYCLOAK_URL=http://127.0.0.1:8180
KEYCLOAK_REALM=project-management
KEYCLOAK_CLIENT_ID=pm-backend
KEYCLOAK_CLIENT_SECRET=your-backend-client-secret

# JWT Configuration
JWT_ALGORITHM=RS256
JWT_AUDIENCE=account
JWT_TOKEN_EXPIRY_TOLERANCE=30

# Public Key Cache
PUBLIC_KEY_CACHE_TTL=3600

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://frontend:3000

# Security
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
APP_NAME=Project Management API
APP_VERSION=1.0.0
API_V1_PREFIX=/api/v1

# Time Tracking
MAX_DAILY_HOURS=24
OVERLAP_TOLERANCE_MINUTES=0
```

### Settings Management

The application uses Pydantic Settings for configuration management (`config/settings.py`):

- Automatic `.env` file loading
- Type validation
- Computed properties for derived values
- Environment variable override support

## 📖 API Documentation

### Interactive Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

### Base URL

```
http://localhost:8000/api/v1
```

### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

## 🔐 Authentication & Authorization

### OIDC/Keycloak Integration

The backend uses Keycloak for authentication and authorization:

#### Token Verification Flow

1. **Client obtains JWT** from Keycloak
2. **Client sends JWT** in Authorization header
3. **Backend verifies JWT** using Keycloak's public keys (JWKS)
4. **Backend extracts user claims** from validated token
5. **Backend checks roles** for authorization

#### Implementation Details

**OIDCAuth Class** (`auth/oidc_auth.py`):
- Public key caching with TTL
- Async HTTP client for Keycloak communication
- Token verification with RS256 algorithm
- Role checking (realm and client roles)
- Comprehensive error handling

**Key Features**:
- Automatic public key rotation handling
- Token expiry tolerance (configurable)
- User info retrieval from Keycloak
- Role-based access control (RBAC)

### Role-Based Access Control

**Available Role Checkers**:

```python
# Require single role
@router.get("/admin-only", dependencies=[Depends(require_role("admin"))])

# Require any of multiple roles
@router.get("/managers", dependencies=[Depends(require_any_role("admin", "manager"))])

# Optional authentication
@router.get("/public", dependencies=[Depends(get_current_user_optional)])
```

### Authentication Endpoints

#### Get User Info
```http
GET /auth/user
Authorization: Bearer <token>

Response:
{
  "user_id": "uuid",
  "username": "john.doe",
  "email": "john@example.com",
  "name": "John Doe",
  "realm_roles": ["user", "admin"],
  "client_roles": {...},
  "all_roles": ["user", "admin", "project-manager"]
}
```

#### Get User Roles
```http
GET /auth/roles
Authorization: Bearer <token>

Response:
{
  "roles": ["user", "admin", "project-manager"]
}
```

#### Check Role
```http
GET /auth/check/{role}
Authorization: Bearer <token>

Response:
{
  "user_id": "uuid",
  "role": "admin",
  "has_role": true,
  "all_roles": ["user", "admin"]
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>

Response:
{
  "message": "Logged out successfully",
  "user_id": "uuid"
}
```

## 📊 Database Models

### User Model

```python
class User:
    id: UUID
    email: str
    first_name: str
    last_name: str
    keycloak_id: str
    is_active: bool
    roles: List[str]
    created_at: datetime
    updated_at: datetime
```

### Project Model

```python
class Project:
    id: UUID
    name: str
    description: str
    owner_id: UUID
    customer_id: UUID (optional)
    status: str  # active, completed, on-hold
    start_date: date
    end_date: date (optional)
    created_at: datetime
    updated_at: datetime

    # Relationships
    owner: User
    members: List[User]
    tasks: List[Task]
    time_entries: List[TimeEntry]
```

### Task Model

```python
class Task:
    id: UUID
    title: str
    description: str
    project_id: UUID
    assignee_id: UUID (optional)
    status: str  # todo, in-progress, done
    priority: str  # low, medium, high
    due_date: date (optional)
    created_at: datetime
    updated_at: datetime

    # Relationships
    project: Project
    assignee: User
    time_entries: List[TimeEntry]
```

### TimeEntry Model

```python
class TimeEntry:
    id: UUID
    user_id: UUID
    project_id: UUID
    task_id: UUID (optional)
    start_time: datetime
    end_time: datetime (optional)
    duration_minutes: int (optional)
    description: str
    created_at: datetime
    updated_at: datetime
```

### Customer Model

```python
class Customer:
    id: UUID
    name: str
    email: str (optional)
    phone: str (optional)
    company: str (optional)
    address: str (optional)
    created_at: datetime
    updated_at: datetime

    # Relationships
    projects: List[Project]
```

## 🔌 API Endpoints

### Health Check

```http
GET /health
Response: {"status": "healthy", "service": "project-management-api"}
```

### Users

```http
GET    /api/v1/users              # List all users (paginated)
GET    /api/v1/users/{id}         # Get user by ID
POST   /api/v1/users              # Create user
PUT    /api/v1/users/{id}         # Update user
DELETE /api/v1/users/{id}         # Delete user
```

### Projects

```http
GET    /api/v1/projects           # List all projects (paginated)
GET    /api/v1/projects/my        # Get current user's projects
GET    /api/v1/projects/{id}      # Get project by ID
POST   /api/v1/projects           # Create project
PUT    /api/v1/projects/{id}      # Update project
DELETE /api/v1/projects/{id}      # Delete project
GET    /api/v1/projects/{id}/tasks # Get project tasks

# Project Members
GET    /api/v1/projects/{id}/members        # List project members
POST   /api/v1/projects/{id}/members        # Add member to project
DELETE /api/v1/projects/{id}/members/{uid}  # Remove member
```

### Tasks

```http
GET    /api/v1/tasks              # List all tasks (paginated)
GET    /api/v1/tasks/my           # Get current user's tasks
GET    /api/v1/tasks/{id}         # Get task by ID
POST   /api/v1/tasks              # Create task
PUT    /api/v1/tasks/{id}         # Update task
PATCH  /api/v1/tasks/{id}/status  # Update task status
DELETE /api/v1/tasks/{id}         # Delete task
```

### Time Tracking

```http
GET    /api/v1/time-entries       # List time entries (paginated)
GET    /api/v1/time-entries/{id}  # Get time entry
POST   /api/v1/time-entries       # Create time entry
PUT    /api/v1/time-entries/{id}  # Update time entry
DELETE /api/v1/time-entries/{id}  # Delete time entry

GET    /api/v1/time-tracking/active        # Get active time entry
POST   /api/v1/time-tracking/start         # Start time tracking
POST   /api/v1/time-tracking/stop          # Stop time tracking
GET    /api/v1/time-tracking/summary       # Get time summary
```

### Customers

```http
GET    /api/v1/customers          # List customers (paginated)
GET    /api/v1/customers/{id}     # Get customer by ID
POST   /api/v1/customers          # Create customer
PUT    /api/v1/customers/{id}     # Update customer
DELETE /api/v1/customers/{id}     # Delete customer
```

### Pagination

All list endpoints support pagination with query parameters:

```http
GET /api/v1/projects?page=0&size=20

Response:
{
  "data": [...],
  "page": 0,
  "size": 20,
  "totalElements": 50,
  "totalPages": 3,
  "hasNext": true,
  "hasPrevious": false
}
```

### Filtering

Many endpoints support filtering:

```http
GET /api/v1/tasks?status=in-progress
GET /api/v1/projects?status=active
```

## 💻 Development

### Code Style

- **PEP 8**: Python style guide compliance
- **Type Hints**: Extensive use of Python type hints
- **Docstrings**: Comprehensive function documentation
- **Modular Design**: Files under 500 lines

### Logging

The application uses **Loguru** for structured logging:

```python
from loguru import logger

logger.info("User created", user_id=user.id)
logger.warning("Invalid request", error=str(e))
logger.error("Database error", exc_info=True)
```

**Log Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL

### Error Handling

**HTTP Exception Handler**:
- Structured error responses
- Request path included
- Appropriate status codes

**Global Exception Handler**:
- Catches unexpected errors
- Debug mode: full error details
- Production: sanitized errors

### Middleware

1. **CORS Middleware**: Cross-origin request handling
2. **Request Logging**: Logs all requests with timing
3. **Trusted Host**: Host validation (production only)

### Database Sessions

```python
from database.connection import get_db_session

def endpoint(db: Session = Depends(get_db_session)):
    # Database operations
    user = db.query(User).first()
```

**Features**:
- Automatic session creation/cleanup
- Connection pooling (20 connections, 30 overflow)
- Pre-ping for connection health
- Automatic rollback on errors

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_projects.py

# Run with verbose output
pytest -v

# Run tests matching pattern
pytest -k "test_create"
```

### Test Configuration

`pytest.ini`:
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
```

### Writing Tests

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/v1/projects",
        json={"name": "Test Project", "start_date": "2024-01-01"},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Test Project"
```

### Test Coverage Goals

- **Unit Tests**: Individual functions and methods
- **Integration Tests**: API endpoints with database
- **Authentication Tests**: Token validation and roles
- **Edge Cases**: Error handling and validation

## 🐳 Docker

### Dockerfile

The application includes a multi-stage Dockerfile:

**Base Stage**:
- Python 3.11-slim base image
- System dependencies (PostgreSQL, build tools)
- Python dependencies installation
- Non-root user for security

**Production Stage**:
```bash
docker build --target production -t pm-backend:prod .
docker run -p 8000:8000 pm-backend:prod
```

**Development Stage**:
```bash
docker build --target development -t pm-backend:dev .
docker run -p 8000:8000 -v $(pwd):/app pm-backend:dev
```

### Docker Compose

See the root `docker-compose.yml` for the complete stack including:
- Backend API
- PostgreSQL database
- Keycloak identity provider
- Frontend application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Health Checks

Docker health check endpoint:
```bash
curl http://localhost:8000/health
```

Health check runs every 30 seconds with 3 retries.

## 📁 Project Structure

```
backend/
├── main.py                    # Application entry point and configuration
│   ├── FastAPI app initialization
│   ├── Middleware setup (CORS, logging, security)
│   ├── Router registration
│   ├── Exception handlers
│   └── Authentication endpoints
│
├── config/
│   └── settings.py           # Environment configuration and validation
│       ├── Database settings
│       ├── Keycloak configuration
│       ├── JWT settings
│       └── Application settings
│
├── database/
│   └── connection.py         # Database connection management
│       ├── SQLAlchemy engine
│       ├── Session factory
│       ├── Base model class
│       └── Session dependency
│
├── auth/
│   ├── oidc_auth.py         # OIDC authentication implementation
│   │   ├── OIDCAuth class
│   │   ├── Token verification
│   │   ├── Public key management
│   │   └── Role checking
│   └── user.py              # User authentication utilities
│       └── get_current_user dependency
│
├── models/                   # SQLAlchemy models and Pydantic schemas
│   ├── user.py              # User model and schemas
│   ├── project.py           # Project model and schemas
│   ├── task.py              # Task model and schemas
│   ├── time_entry.py        # Time entry model
│   ├── time_tracking.py     # Time tracking models
│   ├── customers.py         # Customer model
│   └── members.py           # Project member model
│
├── routers/                  # API route handlers
│   ├── users.py             # User CRUD endpoints
│   ├── projects.py          # Project CRUD endpoints
│   ├── tasks.py             # Task CRUD endpoints
│   ├── time_entries.py      # Time entry endpoints
│   ├── time_tracking.py     # Time tracking endpoints
│   ├── customers.py         # Customer endpoints
│   └── members.py           # Member management endpoints
│
├── requirements.txt          # Python dependencies
├── Dockerfile               # Multi-stage Docker configuration
├── pytest.ini               # Pytest configuration
└── README.md                # This file
```

## 🔧 Common Issues & Troubleshooting

### Database Connection Issues

**Problem**: `FATAL: password authentication failed`
- Verify `DATABASE_URL` in `.env`
- Check PostgreSQL is running
- Confirm user/password are correct

### Keycloak Connection Issues

**Problem**: `Authentication service unavailable`
- Verify `KEYCLOAK_URL` is accessible
- Check realm name is correct
- Ensure client ID and secret are valid
- Verify network connectivity to Keycloak

### Token Validation Errors

**Problem**: `Invalid token signature`
- Check JWT_ALGORITHM matches Keycloak (RS256)
- Verify token audience configuration
- Clear public key cache
- Check system time synchronization

### CORS Errors

**Problem**: CORS policy blocking requests
- Add frontend URL to `ALLOWED_ORIGINS`
- Verify CORS middleware is configured
- Check credentials are included in requests

## 📝 Best Practices

### Security
- Always use HTTPS in production
- Rotate `SECRET_KEY` regularly
- Never commit `.env` files
- Use environment-specific configurations
- Enable TrustedHostMiddleware in production
- Implement rate limiting for public endpoints

### Performance
- Use connection pooling (configured by default)
- Enable caching for expensive operations
- Implement pagination for large datasets
- Use async/await for I/O operations
- Monitor slow queries with database logging

### Code Quality
- Write comprehensive docstrings
- Add type hints to all functions
- Validate input with Pydantic models
- Handle errors gracefully
- Write tests for new features
- Keep functions focused and small

### Database
- Use migrations for schema changes
- Index frequently queried fields
- Avoid N+1 query problems
- Use transactions for multi-step operations
- Regular backups and disaster recovery planning

## 🤝 Contributing

### Development Workflow

1. Create feature branch
2. Implement changes with tests
3. Run test suite
4. Update documentation
5. Submit pull request

### Code Review Checklist

- [ ] Tests pass
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance considered
- [ ] Error handling implemented

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 📄 License

See the root project LICENSE file for details.

## 👥 Support

For issues, questions, or contributions, please refer to the main project repository.

---

**Version**: 1.0.0
**Last Updated**: 2025-10-07
