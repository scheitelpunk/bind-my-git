# Keycloak Authentication Setup Guide

This guide explains how to set up and configure Keycloak authentication for the Project Management System.

## Overview

The system uses Keycloak for OpenID Connect (OIDC) authentication with the following components:

- **Backend**: FastAPI with JWT token verification
- **Frontend**: React with Keycloak-js client
- **Keycloak**: Identity and access management server

## Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp .env.example .env
```

Update the `.env` file with your configuration:
```env
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8180
KEYCLOAK_REALM=project-management
KEYCLOAK_CLIENT_ID=pm-backend
KEYCLOAK_CLIENT_SECRET=your-backend-client-secret

# Frontend Configuration
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=project-management
VITE_KEYCLOAK_CLIENT_ID=pm-frontend
```

### 2. Start Services

Using Docker Compose:
```bash
docker-compose up -d
```

This will start:
- Keycloak on port 8180
- Backend API on port 8000
- Frontend on port 3000
- PostgreSQL databases
- Redis cache

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Keycloak Admin**: http://localhost:8180

## Keycloak Configuration

### Default Realm Setup

The system includes a pre-configured realm with:

**Realm**: `project-management`

**Clients**:
- `pm-frontend` (Public client for React app)
- `pm-backend` (Confidential client for API)

**Roles**:
- `admin` - Full system access
- `manager` - Project management capabilities
- `user` - Standard user access

**Default Users**:
- Username: `admin`, Password: `admin123`, Roles: `admin`, `manager`, `user`
- Username: `manager`, Password: `manager123`, Roles: `manager`, `user`
- Username: `user`, Password: `user123`, Roles: `user`

### Manual Keycloak Setup

If you need to configure Keycloak manually:

1. **Access Keycloak Admin Console**
   - URL: http://localhost:8180
   - Username: `admin`
   - Password: `admin123`

2. **Create Realm**
   - Name: `project-management`
   - Display Name: `Project Management System`

3. **Create Frontend Client**
   - Client ID: `pm-frontend`
   - Client Type: `OpenID Connect`
   - Access Type: `Public`
   - Valid Redirect URIs: `http://localhost:3000/*`
   - Web Origins: `http://localhost:3000`
   - Enable PKCE: Yes

4. **Create Backend Client**
   - Client ID: `pm-backend`
   - Client Type: `OpenID Connect`
   - Access Type: `Bearer-only`
   - Enable Service Accounts: Yes

5. **Create Roles**
   - Go to Realm Roles
   - Create: `admin`, `manager`, `user`

6. **Create Users**
   - Go to Users → Add User
   - Set credentials and assign roles

## Authentication Flow

### Frontend Authentication

1. User visits protected route
2. `AuthGuard` checks authentication status
3. If not authenticated, redirects to Keycloak login
4. After successful login, user is redirected back
5. Token is stored and used for API calls

### Backend Token Verification

1. API receives request with Bearer token
2. `OIDCAuth` service verifies token:
   - Fetches Keycloak public keys
   - Validates token signature
   - Checks expiration and audience
3. User information extracted from token
4. Role-based access control applied

## Role-Based Access Control

### Frontend Components

```tsx
// Protect entire routes
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

// Conditional rendering
<RoleGuard requiredRole="manager">
  <ManagerButton />
</RoleGuard>

// Multiple roles
<RoleGuard requiredRoles={["admin", "manager"]}>
  <ManagementPanel />
</RoleGuard>
```

### Backend Endpoints

```python
# Require authentication
@app.get("/api/v1/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    return users

# Require specific role
@app.get("/api/v1/admin/users")
async def admin_get_users(current_user: dict = Depends(require_role("admin"))):
    return users

# Require any of multiple roles
@app.get("/api/v1/manage/projects")
async def manage_projects(current_user: dict = Depends(require_any_role("admin", "manager"))):
    return projects
```

## Token Management

### Automatic Token Refresh

The frontend automatically:
- Refreshes tokens before expiration
- Handles token refresh failures
- Provides seamless user experience

### Token Storage

- Access tokens: Memory only (not persisted)
- Refresh tokens: Handled by Keycloak-js
- Session persistence: Via Keycloak session

## Security Features

### Backend Security

- JWT signature verification
- Token expiration validation
- Audience and issuer checks
- Role-based access control
- CORS configuration
- Request logging and monitoring

### Frontend Security

- PKCE (Proof Key for Code Exchange)
- Silent SSO checks
- Secure token handling
- Automatic logout on token failure
- CSRF protection

## Development

### Running Tests

Backend tests:
```bash
cd backend
pytest tests/test_auth_integration.py
```

Frontend tests:
```bash
cd frontend
npm test auth
```

### Environment Variables

**Backend** (`.env`):
```env
# Required
KEYCLOAK_URL=http://localhost:8180
KEYCLOAK_REALM=project-management
KEYCLOAK_CLIENT_ID=pm-backend
KEYCLOAK_CLIENT_SECRET=your-secret

# Optional
JWT_ALGORITHM=RS256
JWT_AUDIENCE=account
JWT_TOKEN_EXPIRY_TOLERANCE=30
AUTH_CACHE_TTL=300
PUBLIC_KEY_CACHE_TTL=3600
```

**Frontend** (`.env`):
```env
# Required
VITE_API_URL=http://localhost:8000
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=project-management
VITE_KEYCLOAK_CLIENT_ID=pm-frontend
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `ALLOWED_ORIGINS` in backend settings
   - Verify Keycloak client web origins

2. **Token Verification Failures**
   - Ensure Keycloak is accessible from backend
   - Check client secret configuration
   - Verify realm and audience settings

3. **Silent SSO Not Working**
   - Ensure `silent-check-sso.html` is accessible
   - Check browser console for errors
   - Verify CORS headers

4. **Role Checks Failing**
   - Verify user has correct roles assigned
   - Check role mapping in token
   - Ensure client scope includes roles

### Debug Mode

Enable debug logging:

Backend:
```env
DEBUG=true
LOG_LEVEL=DEBUG
```

Frontend:
```env
VITE_KEYCLOAK_DEBUG=true
```

### Health Checks

- Backend: `GET /health`
- Frontend: `GET /health`
- Keycloak: `GET /auth/health`

## Production Considerations

### Security

- Use HTTPS in production
- Set secure client secrets
- Configure proper CORS origins
- Enable Keycloak security features
- Set up proper SSL certificates

### Performance

- Configure token caching
- Set appropriate token lifespans
- Use Redis for session storage
- Monitor authentication metrics

### Monitoring

- Set up logging aggregation
- Monitor authentication failures
- Track token refresh rates
- Alert on security events

## API Reference

### Authentication Endpoints

- `GET /auth/user` - Get current user info
- `GET /auth/roles` - Get user roles
- `POST /auth/logout` - Logout user
- `GET /auth/check/{role}` - Check user role

### Frontend Services

- `initKeycloak()` - Initialize authentication
- `login()` - Redirect to login
- `logout()` - Logout user
- `hasRole(role)` - Check user role
- `getUserInfo()` - Get user information

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review Keycloak documentation
3. Check application logs
4. Contact system administrators