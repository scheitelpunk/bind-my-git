# Security Considerations and Implementation

## Security Threat Model

### Attack Vectors and Mitigations

| Attack Vector | Risk Level | Mitigation Strategy |
|---------------|------------|-------------------|
| SQL Injection | High | Parameterized queries, ORM usage, input validation |
| XSS (Cross-Site Scripting) | High | Content Security Policy, output encoding, React's built-in XSS protection |
| CSRF (Cross-Site Request Forgery) | Medium | SameSite cookies, CSRF tokens, CORS policy |
| JWT Token Theft | High | Short expiration, secure storage, token rotation |
| Privilege Escalation | High | Principle of least privilege, role-based access control |
| Data Breach | Critical | Encryption at rest/transit, access logging, data masking |
| DDoS Attacks | Medium | Rate limiting, load balancing, CDN usage |
| Man-in-the-Middle | High | TLS 1.3, certificate pinning, HSTS |
| Clickjacking | Medium | X-Frame-Options, Content Security Policy |
| Brute Force | Medium | Account lockout, rate limiting, CAPTCHA |

## Input Validation and Sanitization

### Backend Validation (Pydantic Models)
```python
from pydantic import BaseModel, validator, EmailStr
from typing import Optional
import re
from datetime import datetime

class TimeEntryCreate(BaseModel):
    task_id: str
    project_id: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    is_billable: bool = True
    hourly_rate: Optional[float] = None

    @validator('description')
    def validate_description(cls, v):
        if v:
            # Remove HTML tags and validate length
            clean_desc = re.sub(r'<[^>]*>', '', v)
            if len(clean_desc) > 1000:
                raise ValueError('Description too long')
            # Check for malicious patterns
            if re.search(r'(javascript:|data:|vbscript:)', clean_desc, re.IGNORECASE):
                raise ValueError('Invalid characters in description')
        return v

    @validator('start_time', 'end_time')
    def validate_timestamps(cls, v):
        # Ensure timestamps are not too far in the past or future
        now = datetime.utcnow()
        if v < now.replace(year=now.year - 1):
            raise ValueError('Timestamp too far in the past')
        if v > now.replace(year=now.year + 1):
            raise ValueError('Timestamp too far in the future')
        return v

    @validator('hourly_rate')
    def validate_hourly_rate(cls, v):
        if v is not None:
            if v < 0 or v > 10000:  # Reasonable bounds
                raise ValueError('Invalid hourly rate')
        return v

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    organization_id: Optional[str] = None

    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if not re.match(r'^[a-zA-Z\s\-\'\.]{1,50}$', v):
            raise ValueError('Invalid name format')
        return v.strip()
```

### Frontend Validation (React Hook Form + Yup)
```typescript
import * as yup from 'yup';

const timeEntrySchema = yup.object({
  task_id: yup.string().uuid('Invalid task ID').required('Task is required'),
  project_id: yup.string().uuid('Invalid project ID').required('Project is required'),
  description: yup
    .string()
    .max(1000, 'Description too long')
    .test('no-html', 'HTML not allowed', (value) => {
      if (!value) return true;
      return !/<[^>]*>/.test(value);
    }),
  start_time: yup
    .date()
    .required('Start time is required')
    .max(new Date(), 'Start time cannot be in the future'),
  end_time: yup
    .date()
    .required('End time is required')
    .min(yup.ref('start_time'), 'End time must be after start time'),
  hourly_rate: yup
    .number()
    .positive('Hourly rate must be positive')
    .max(10000, 'Hourly rate too high')
    .nullable(),
});
```

## Authentication Security Implementation

### JWT Token Security
```python
import jwt
from datetime import datetime, timedelta
from typing import Optional
import secrets

class TokenManager:
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire_minutes = 15
        self.refresh_token_expire_days = 30

    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": secrets.token_urlsafe(32),  # JWT ID for revocation
            "type": "access"
        })
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, user_id: str) -> str:
        to_encode = {
            "sub": user_id,
            "type": "refresh",
            "jti": secrets.token_urlsafe(32),
            "exp": datetime.utcnow() + timedelta(days=self.refresh_token_expire_days),
            "iat": datetime.utcnow()
        }
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str, token_type: str = "access") -> Optional[dict]:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("type") != token_type:
                return None
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
```

### Password Security (Delegated to Keycloak)
```python
# Keycloak Password Policy Configuration
KEYCLOAK_PASSWORD_POLICY = {
    "length": 12,           # Minimum length
    "upperCase": 1,         # Uppercase letters required
    "lowerCase": 1,         # Lowercase letters required
    "digits": 1,            # Digits required
    "specialChars": 1,      # Special characters required
    "notUsername": True,    # Cannot contain username
    "notEmail": True,       # Cannot contain email
    "blacklist": [          # Common passwords blacklist
        "password123",
        "admin123",
        "qwerty123"
    ],
    "passwordHistory": 12,  # Remember last 12 passwords
    "maxAge": 90,          # Password expires after 90 days
    "failureCount": 5,     # Lock account after 5 failures
    "lockDuration": 1800   # Lock for 30 minutes
}
```

## Data Protection and Encryption

### Database Encryption
```python
from cryptography.fernet import Fernet
import os

class DataEncryption:
    def __init__(self):
        # Use environment variable for encryption key
        key = os.environ.get("ENCRYPTION_KEY")
        if not key:
            raise ValueError("ENCRYPTION_KEY environment variable not set")
        self.cipher_suite = Fernet(key.encode())

    def encrypt_sensitive_data(self, data: str) -> str:
        """Encrypt sensitive data like SSN, credit card numbers"""
        return self.cipher_suite.encrypt(data.encode()).decode()

    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return self.cipher_suite.decrypt(encrypted_data.encode()).decode()

# SQLAlchemy column with automatic encryption
from sqlalchemy_utils import EncryptedType
from sqlalchemy_utils.types.encrypted.encrypted_type import AesEngine

class User(Base):
    __tablename__ = "users"

    id = Column(UUID, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    # Encrypt sensitive fields
    ssn = Column(EncryptedType(String, secret_key, AesEngine, 'pkcs5'))
    phone = Column(EncryptedType(String, secret_key, AesEngine, 'pkcs5'))
```

### File Upload Security
```python
import magic
from pathlib import Path
import uuid

class SecureFileUpload:
    ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.gif'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    UPLOAD_FOLDER = "/app/uploads"

    @staticmethod
    def validate_file(file) -> bool:
        # Check file size
        if file.size > SecureFileUpload.MAX_FILE_SIZE:
            raise ValueError("File too large")

        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in SecureFileUpload.ALLOWED_EXTENSIONS:
            raise ValueError("File type not allowed")

        # Check MIME type using python-magic
        file_content = file.read()
        file.seek(0)  # Reset file pointer

        mime_type = magic.from_buffer(file_content, mime=True)
        allowed_mimes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif'
        }

        if mime_type != allowed_mimes.get(file_ext):
            raise ValueError("File content doesn't match extension")

        return True

    @staticmethod
    def save_file(file, user_id: str) -> str:
        SecureFileUpload.validate_file(file)

        # Generate secure filename
        file_ext = Path(file.filename).suffix.lower()
        secure_filename = f"{uuid.uuid4()}{file_ext}"

        # Create user-specific folder
        user_folder = Path(SecureFileUpload.UPLOAD_FOLDER) / user_id
        user_folder.mkdir(parents=True, exist_ok=True)

        file_path = user_folder / secure_filename

        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(file.read())

        return str(file_path)
```

## API Security Middleware

### Rate Limiting Implementation
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import redis

# Initialize rate limiter with Redis backend
redis_client = redis.Redis(host="redis", port=6379, db=0)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://redis:6379/0"
)

# Rate limit decorator
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Apply different limits based on endpoint
    if request.url.path.startswith("/api/v1/auth"):
        # Stricter limits for auth endpoints
        await limiter.check_request(request, "5/minute")
    elif request.url.path.startswith("/api/v1/upload"):
        # File upload limits
        await limiter.check_request(request, "10/minute")
    else:
        # General API limits
        await limiter.check_request(request, "100/minute")

    response = await call_next(request)
    return response
```

### CORS Security Configuration
```python
from fastapi.middleware.cors import CORSMiddleware

# Strict CORS configuration
CORS_SETTINGS = {
    "allow_origins": [
        "https://app.projectmanagement.com",
        "https://staging.projectmanagement.com"
        # Never use "*" in production
    ],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE"],
    "allow_headers": [
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "X-CSRF-Token"
    ],
    "expose_headers": ["X-Total-Count"],
    "max_age": 600  # Cache preflight requests
}

app.add_middleware(CORSMiddleware, **CORS_SETTINGS)
```

## Security Headers Implementation

### Nginx Security Headers
```nginx
# Security headers configuration
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Content Security Policy
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https://auth.projectmanagement.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
" always;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### FastAPI Security Headers Middleware
```python
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # API-specific headers
    response.headers["X-API-Version"] = "1.0.0"
    response.headers["X-Rate-Limit-Remaining"] = "100"  # Update with actual count

    return response
```

## Audit Logging and Monitoring

### Security Event Logging
```python
import structlog
from enum import Enum

class SecurityEventType(Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    TOKEN_REFRESH = "token_refresh"
    PERMISSION_DENIED = "permission_denied"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"

logger = structlog.get_logger()

class SecurityLogger:
    @staticmethod
    def log_security_event(
        event_type: SecurityEventType,
        user_id: str = None,
        ip_address: str = None,
        user_agent: str = None,
        resource: str = None,
        details: dict = None
    ):
        logger.warning(
            "Security event",
            event_type=event_type.value,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource=resource,
            details=details or {},
            timestamp=datetime.utcnow().isoformat()
        )

# Usage in authentication
@router.post("/login")
async def login(request: Request, credentials: LoginRequest):
    try:
        # Authentication logic...
        SecurityLogger.log_security_event(
            SecurityEventType.LOGIN_SUCCESS,
            user_id=user.id,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        )
    except AuthenticationError:
        SecurityLogger.log_security_event(
            SecurityEventType.LOGIN_FAILURE,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
            details={"email": credentials.email}
        )
        raise
```

## Vulnerability Scanning and Testing

### Automated Security Testing
```python
# pytest security tests
import pytest
from sqlinjection_test import test_sql_injection
from xss_test import test_xss_protection

class TestSecurity:
    def test_sql_injection_protection(self, client):
        """Test SQL injection protection"""
        malicious_payloads = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'/*",
            "1; SELECT * FROM users"
        ]

        for payload in malicious_payloads:
            response = client.get(f"/api/v1/users/{payload}")
            assert response.status_code in [400, 404, 422]  # Should not return 200

    def test_xss_protection(self, client):
        """Test XSS protection"""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//"
        ]

        for payload in xss_payloads:
            response = client.post("/api/v1/tasks", json={
                "title": payload,
                "description": payload
            })
            # Should either reject the input or sanitize it
            assert response.status_code in [400, 422] or payload not in response.text

    def test_authorization(self, client):
        """Test authorization controls"""
        # Test accessing admin endpoint without admin role
        response = client.get("/api/v1/admin/users", headers={
            "Authorization": "Bearer non_admin_token"
        })
        assert response.status_code == 403

    def test_rate_limiting(self, client):
        """Test rate limiting"""
        # Make multiple requests rapidly
        responses = []
        for _ in range(101):  # Exceed rate limit
            response = client.get("/api/v1/projects")
            responses.append(response.status_code)

        # Should get rate limited
        assert 429 in responses
```

## Security Compliance and Standards

### OWASP Top 10 Compliance Matrix

| OWASP Risk | Status | Implementation |
|------------|--------|----------------|
| A01 - Broken Access Control | ✅ | RBAC, JWT validation, permission checks |
| A02 - Cryptographic Failures | ✅ | TLS 1.3, AES encryption, secure key management |
| A03 - Injection | ✅ | Parameterized queries, input validation |
| A04 - Insecure Design | ✅ | Threat modeling, secure architecture |
| A05 - Security Misconfiguration | ✅ | Secure defaults, configuration management |
| A06 - Vulnerable Components | ✅ | Dependency scanning, regular updates |
| A07 - Identity & Auth Failures | ✅ | Keycloak, strong passwords, MFA support |
| A08 - Software & Data Integrity | ✅ | Code signing, integrity checks |
| A09 - Logging & Monitoring | ✅ | Security event logging, real-time monitoring |
| A10 - Server-Side Request Forgery | ✅ | Input validation, network segmentation |

### Security Checklist

#### Development Phase
- [ ] Threat modeling completed
- [ ] Security requirements defined
- [ ] Secure coding guidelines followed
- [ ] Code review includes security checks
- [ ] Static analysis security testing (SAST)
- [ ] Dynamic analysis security testing (DAST)
- [ ] Dependency vulnerability scanning

#### Deployment Phase
- [ ] Infrastructure security hardening
- [ ] SSL/TLS certificates configured
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Monitoring and alerting setup
- [ ] Incident response plan ready
- [ ] Security documentation complete

#### Operations Phase
- [ ] Regular security updates
- [ ] Vulnerability assessments
- [ ] Penetration testing
- [ ] Security monitoring
- [ ] Incident response procedures
- [ ] Backup and recovery testing
- [ ] Compliance auditing

This comprehensive security implementation ensures the project management system meets enterprise-level security standards while maintaining usability and performance.