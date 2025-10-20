# Project Management API Documentation

## Overview

A comprehensive FastAPI-based project management system with time tracking capabilities, OIDC authentication, and role-based access control.

## Features

- **Authentication**: OIDC JWT token-based authentication
- **Authorization**: Role-based access control (RBAC)
- **Project Management**: Create and manage projects
- **Task Management**: Create and track tasks within projects
- **Time Tracking**: Log time entries with overlap validation
- **Reporting**: Generate time reports and analytics
- **Audit Logging**: Comprehensive audit trail for all actions

## User Roles

### Admin
- Full access to all resources
- User management capabilities
- System-wide reporting

### Project Manager
- Create and manage projects
- Manage tasks within their projects
- View reports for their projects

### Developer
- View projects and tasks
- Log time entries
- Update task status

### Viewer
- Read-only access to projects and tasks
- View time entries

## API Endpoints

### Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update current user profile
- `GET /api/v1/users/` - List all users (admin only)
- `GET /api/v1/users/{user_id}` - Get specific user (admin only)
- `PUT /api/v1/users/{user_id}/role` - Update user role (admin only)

### Projects
- `POST /api/v1/projects/` - Create new project
- `GET /api/v1/projects/` - List projects
- `GET /api/v1/projects/{project_id}` - Get specific project
- `PUT /api/v1/projects/{project_id}` - Update project
- `DELETE /api/v1/projects/{project_id}` - Delete project

### Tasks
- `POST /api/v1/tasks/` - Create new task
- `GET /api/v1/tasks/` - List tasks
- `GET /api/v1/tasks/{task_id}` - Get specific task
- `PUT /api/v1/tasks/{task_id}` - Update task
- `DELETE /api/v1/tasks/{task_id}` - Delete task

### Time Entries
- `POST /api/v1/time-entries/` - Create time entry
- `GET /api/v1/time-entries/` - List user's time entries
- `GET /api/v1/time-entries/all` - List all time entries (admin only)
- `GET /api/v1/time-entries/{time_entry_id}` - Get specific time entry
- `PUT /api/v1/time-entries/{time_entry_id}` - Update time entry
- `DELETE /api/v1/time-entries/{time_entry_id}` - Delete time entry

### Reports
- `GET /api/v1/reports/my-time` - Get current user's time report
- `GET /api/v1/reports/project/{project_id}` - Get project time report
- `GET /api/v1/reports/weekly` - Get weekly summary
- `GET /api/v1/reports/user/{user_id}` - Get user time report (admin only)

## Time Entry Validation

The system enforces several validation rules for time entries:

1. **No Overlaps**: Users cannot log overlapping time entries
2. **Positive Duration**: Time entries must have positive duration
3. **Maximum Duration**: No single entry can exceed 24 hours
4. **Task Status**: Time can only be logged to tasks in progress or under review

## Audit Logging

All significant actions are logged with:
- User information
- Action type (create, update, delete)
- Entity details
- Timestamps
- IP address and user agent
- Before/after values for updates

## Configuration

Key environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# OIDC
OIDC_ISSUER=https://your-oidc-provider.com
OIDC_AUDIENCE=your-audience
OIDC_CLIENT_ID=your-client-id

# Application
DEBUG=false
API_V1_PREFIX=/api/v1
ALLOWED_ORIGINS=["http://localhost:3000"]
```

## Development Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Update configuration in `.env`

3. Start development environment:
   ```bash
   ./scripts/start-dev.sh
   ```

4. Run migrations:
   ```bash
   ./scripts/run-migrations.sh
   ```

## Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": {
    "code": 400,
    "message": "Validation error message",
    "type": "validation_error"
  }
}
```

Common error codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (e.g., overlapping time entries)
- `500`: Internal Server Error