# Project Management System

A comprehensive project management system built with FastAPI, React, PostgreSQL, and Keycloak authentication.

## Features

- **User Authentication**: OIDC integration with Keycloak
- **Role-Based Access Control**: Admin, Project Manager, Developer, Viewer roles
- **Project Management**: Create and manage projects with team members
- **Task Management**: Create, assign, and track tasks
- **Time Tracking**: Track time with overlap prevention
- **Real-time Updates**: Live updates for time tracking and project changes

## Architecture

### Backend (FastAPI)
- **Authentication**: OIDC integration with Keycloak
- **Database**: PostgreSQL with SQLAlchemy ORM
- **API**: RESTful API with OpenAPI documentation
- **Security**: Role-based access control and input validation

### Frontend (React TypeScript)
- **Authentication**: Keycloak JavaScript adapter
- **UI Framework**: Material-UI components
- **State Management**: React Query for API state
- **Routing**: React Router with protected routes

### Database (PostgreSQL)
- **Users & Roles**: RBAC implementation
- **Projects & Tasks**: Project hierarchy and task management
- **Time Tracking**: Time entries with overlap prevention
- **Audit Trail**: Created/updated timestamps

### Infrastructure (Docker)
- **Containerization**: Docker Compose for all services
- **Reverse Proxy**: NGINX for routing
- **Development**: Hot reload for development

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Production Deployment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-management-system
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Keycloak: http://localhost:8080
   - API Documentation: http://localhost:8000/docs

### Development Setup

1. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres keycloak
   ```

2. **Backend development**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Frontend development**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Configuration

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://pm_user:pm_password@localhost:5432/project_management
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=project-management
KEYCLOAK_CLIENT_ID=pm-backend
KEYCLOAK_CLIENT_SECRET=your-client-secret
SECRET_KEY=your-super-secret-key
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_KEYCLOAK_URL=http://localhost:8080
REACT_APP_KEYCLOAK_REALM=project-management
REACT_APP_KEYCLOAK_CLIENT_ID=pm-frontend
```

### Keycloak Setup

1. **Access Keycloak Admin Console**
   - URL: http://localhost:8080
   - Username: admin
   - Password: admin123

2. **Import Realm Configuration**
   - Import `config/keycloak-realm.json`
   - Or manually configure realm, clients, and roles

3. **Create Test Users**
   - Add users with appropriate roles
   - Set passwords and enable accounts

## API Documentation

### Authentication Endpoints
- `GET /auth/user` - Get current user info
- `POST /auth/logout` - Logout user

### Project Endpoints
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Task Endpoints
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/{id}` - Get task details
- `PUT /api/v1/tasks/{id}` - Update task
- `DELETE /api/v1/tasks/{id}` - Delete task

### Time Tracking Endpoints
- `POST /api/v1/time-entries` - Start time entry
- `PUT /api/v1/time-entries/{id}/stop` - Stop time entry
- `GET /api/v1/time-entries` - List time entries
- `GET /api/v1/time-entries/running` - Get running entry
- `GET /api/v1/time-entries/summary` - Get time summary
- `DELETE /api/v1/time-entries/{id}` - Delete time entry

## Time Tracking Features

### Overlap Prevention
- Only one running time entry per user
- Automatic validation prevents overlapping entries
- Database-level constraints ensure data integrity

### Time Calculation
- Automatic duration calculation
- Real-time updates for running entries
- Daily/weekly/monthly summaries

## Security Features

### Authentication
- OIDC/OAuth 2.0 with Keycloak
- JWT token validation
- Automatic token refresh

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- API endpoint protection

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d
# Run integration tests
pytest tests/integration/ -v
```

## Monitoring and Logging

### Health Checks
- `GET /health` - Backend health check
- Container health checks in Docker Compose

### Logging
- Structured logging with timestamp and levels
- Centralized logging with Docker logs
- Error tracking and monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API documentation at `/docs`