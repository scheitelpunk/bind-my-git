# Authentication and Security Architecture

## OIDC Authentication Flow

### Authorization Code Flow with PKCE

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │   React     │    │  Keycloak   │    │   FastAPI   │
│             │    │  Frontend   │    │   Server    │    │   Backend   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
        │                   │                   │                   │
        │ 1. Visit App      │                   │                   │
        ├──────────────────▶│                   │                   │
        │                   │ 2. Check Auth     │                   │
        │                   │   Status          │                   │
        │                   ├──────────────────▶│                   │
        │                   │ 3. Not Authorized │                   │
        │                   │◀──────────────────┤                   │
        │                   │ 4. Generate PKCE  │                   │
        │                   │   Challenge        │                   │
        │ 5. Redirect to    │                   │                   │
        │    Auth Server    │                   │                   │
        │◀──────────────────┤                   │                   │
        │                   │                   │                   │
        │ 6. Login Request with PKCE Challenge  │                   │
        ├─────────────────────────────────────▶│                   │
        │ 7. User Login     │                   │                   │
        ├─────────────────────────────────────▶│                   │
        │ 8. Auth Code      │                   │                   │
        │◀─────────────────────────────────────┤                   │
        │                   │                   │                   │
        │ 9. Auth Code      │                   │                   │
        ├──────────────────▶│                   │                   │
        │                   │ 10. Exchange Code │                   │
        │                   │     + PKCE Verify │                   │
        │                   ├──────────────────▶│                   │
        │                   │ 11. JWT Tokens    │                   │
        │                   │◀──────────────────┤                   │
        │                   │                   │                   │
        │                   │ 12. API Request + │                   │
        │                   │     JWT Token     │                   │
        │                   ├─────────────────────────────────────▶│
        │                   │ 13. Validate JWT  │                   │
        │                   │                   │                   │
        │                   │ 14. API Response  │                   │
        │                   │◀─────────────────────────────────────┤
```

## JWT Token Structure

### Access Token Claims
```json
{
  "iss": "https://auth.domain.com/realms/project-mgmt",
  "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "aud": "project-management-api",
  "exp": 1640995200,
  "iat": 1640991600,
  "auth_time": 1640991600,
  "jti": "a4f32e5a-8b7c-4d3e-9f1a-2b3c4d5e6f7g",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "preferred_username": "johndoe",
  "given_name": "John",
  "family_name": "Doe",
  "realm_access": {
    "roles": ["user", "project_manager"]
  },
  "resource_access": {
    "project-management-api": {
      "roles": ["time_tracker", "project_admin"]
    }
  },
  "scope": "openid email profile"
}
```

### Refresh Token Handling
- Secure storage in httpOnly cookies
- Automatic refresh before expiration
- Revocation on logout
- Rotation on each use

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
System Administrator
├── Organization Admin
    ├── Project Manager
        ├── Team Lead
            └── Team Member
```

### Permission Matrix

| Resource | Admin | Org Admin | PM | Team Lead | Member |
|----------|-------|-----------|----|-----------| -------|
| Organizations | CRUD | RU | R | R | R |
| Projects | CRUD | CRUD | CRUD | RU | R |
| Project Members | CRUD | CRUD | CRUD | RU | R |
| Tasks | CRUD | CRUD | CRUD | CRUD | RU |
| Time Entries (Own) | CRUD | CRUD | CRUD | CRUD | CRUD |
| Time Entries (Others) | CRUD | CRUD | CRUD | R | - |
| Reports | CRUD | CRUD | CRUD | R | R |
| System Settings | CRUD | - | - | - | - |

### Permission Codes
- **C**: Create
- **R**: Read
- **U**: Update
- **D**: Delete
- **-**: No Access

## Security Middleware Stack

### FastAPI Security Layers

```python
# Security dependency injection order
1. CORS Middleware
2. Rate Limiting Middleware
3. Authentication Middleware (JWT validation)
4. Authorization Middleware (RBAC)
5. Input Validation (Pydantic)
6. Business Logic
7. Output Sanitization
```

### CORS Configuration
```python
CORS_SETTINGS = {
    "allow_origins": [
        "https://app.domain.com",
        "https://localhost:3000"  # Development only
    ],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE"],
    "allow_headers": [
        "Authorization",
        "Content-Type",
        "X-Requested-With"
    ],
    "expose_headers": ["X-Total-Count"]
}
```

### Rate Limiting Strategy
```python
RATE_LIMITS = {
    "auth": "5/minute",      # Authentication endpoints
    "api": "100/minute",     # General API endpoints
    "upload": "10/minute",   # File upload endpoints
    "reports": "20/minute"   # Report generation
}
```

## Security Best Practices

### Input Validation
- Pydantic models for all inputs
- SQL injection prevention with parameterized queries
- XSS protection with output encoding
- File upload validation (type, size, content)

### Password Security
- Delegated to Keycloak
- Minimum complexity requirements
- Account lockout policies
- Password history tracking

### Session Management
- JWT with short expiration (15 minutes)
- Refresh token rotation
- Session invalidation on security events
- Concurrent session limits

### Data Protection
- Encryption at rest for sensitive data
- TLS 1.3 for data in transit
- Database connection encryption
- Secure cookie settings

### Audit Logging
- Authentication events
- Authorization failures
- Data modification events
- Administrative actions
- API access patterns

### Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| CSRF | SameSite cookies, CSRF tokens |
| XSS | Content Security Policy, output encoding |
| SQL Injection | Parameterized queries, ORM usage |
| Clickjacking | X-Frame-Options header |
| MITM | HTTPS enforcement, HSTS |
| Brute Force | Rate limiting, account lockout |
| Token Theft | Short expiration, token rotation |
| Privilege Escalation | Principle of least privilege |

## Keycloak Configuration

### Realm Settings
- User registration: Disabled (admin-managed)
- Email verification: Required
- Login with email: Enabled
- Remember me: 30 days
- Password policy: Strong requirements

### Client Configuration
```json
{
  "clientId": "project-management-spa",
  "protocol": "openid-connect",
  "publicClient": true,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "webOrigins": ["https://app.domain.com"],
  "redirectUris": ["https://app.domain.com/*"],
  "postLogoutRedirectUris": ["https://app.domain.com/logout"],
  "pkceCodeChallengeMethod": "S256"
}
```

### Role Mapping
- Realm roles for system-wide permissions
- Client roles for application-specific permissions
- Group-based role assignment
- Role composition for hierarchical permissions