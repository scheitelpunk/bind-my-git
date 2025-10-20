# Keycloak CSP-Compliant Authentication Setup

This document outlines the configuration required for CSP-compliant Keycloak authentication that avoids iframe-related security violations.

## Frontend Configuration Changes

### 1. CSP-Compliant Authentication Flow

The authentication has been updated to use redirect-based OIDC flow instead of iframe-based silent authentication:

- **Removed**: `silentCheckSsoRedirectUri` and iframe-based silent checks
- **Updated**: CSP headers to deny iframe embedding (`X-Frame-Options: DENY`)
- **Added**: Smart initialization with fallback mechanisms
- **Implemented**: Proper OIDC redirect flow with PKCE

### 2. Updated Files

#### `/src/services/keycloak.ts`
- CSP-compliant initialization options
- Smart initialization with fallback to redirect-only mode
- Enhanced error handling and recovery
- Proper token refresh without iframe dependencies

#### `/src/contexts/AuthContext.tsx` and `/src/hooks/useAuth.tsx`
- Updated to use smart initialization
- Better error handling for authentication failures
- Consistent authentication state management

#### `/src/components/auth/AuthGuard.tsx`
- CSP-compliant redirect authentication
- Intended path preservation for post-login redirect
- Enhanced loading states and error handling

#### `/src/components/auth/AuthCallback.tsx` (New)
- Handles authentication callback from Keycloak
- Processes authentication results and redirects
- Error handling for failed authentication

#### `/frontend/nginx.conf`
- Enhanced CSP headers with specific Keycloak domains
- `X-Frame-Options: DENY` to prevent iframe embedding
- Strict content security policy

## Keycloak Server Configuration

### Required Client Settings

For the frontend client (`pm-frontend`), configure:

```
Access Type: Public
Standard Flow Enabled: ON
Direct Access Grants Enabled: OFF
Valid Redirect URIs:
  - http://localhost:3000/*
  - http://localhost:3000/auth/callback
  - https://yourdomain.com/*
  - https://yourdomain.com/auth/callback
Web Origins:
  - http://localhost:3000
  - https://yourdomain.com
Client Protocol: openid-connect
PKCE Code Challenge Method: S256
```

### Realm Settings

Ensure these security settings:

```
Login Settings:
  - Require SSL: External requests (Production: All requests)
  - User Registration: OFF (unless needed)
  - Edit username: OFF
  - Forgot password: ON (if needed)
  - Remember me: ON
  - Verify email: ON (recommended)

Security Defenses:
  - Headers:
    - X-Frame-Options: DENY
    - Content-Security-Policy: (configure based on your needs)
    - X-Content-Type-Options: nosniff
    - X-XSS-Protection: 1; mode=block
```

## Environment Variables

Update your `.env` files:

```bash
# Frontend (.env.development, .env.production)
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=project-management
VITE_KEYCLOAK_CLIENT_ID=pm-frontend
VITE_DEBUG=true
```

## CSP Headers Configuration

The nginx configuration includes these CSP-compliant headers:

```nginx
add_header X-Frame-Options "DENY" always;
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' http://localhost:8180 https://localhost:8180 http://keycloak:8080 https://keycloak:8080;
  frame-ancestors 'none';
" always;
```

## Authentication Flow

### 1. Initial Load
- App attempts smart initialization
- If user not authenticated, redirects to Keycloak
- No iframe usage - pure redirect flow

### 2. Login Process
```
User → Frontend → Keycloak Login → Redirect back to /auth/callback → Process auth → Redirect to intended page
```

### 3. Token Management
- Automatic token refresh every 30 seconds
- No iframe-based refresh - uses standard OIDC refresh tokens
- Logout cleanup and redirect to Keycloak logout

## Security Benefits

1. **CSP Compliance**: No iframe violations
2. **Enhanced Security**: X-Frame-Options prevents clickjacking
3. **PKCE Protection**: Code challenge prevents authorization code interception
4. **Secure Redirects**: Proper validation of redirect URIs
5. **Token Security**: Secure token storage and refresh

## Troubleshooting

### Common Issues

1. **Authentication Loops**:
   - Check redirect URIs in Keycloak client
   - Verify environment variables are correct

2. **CSP Violations**:
   - Ensure nginx CSP headers include Keycloak domain
   - Check browser developer tools for violations

3. **CORS Issues**:
   - Verify Web Origins in Keycloak client
   - Check API CORS configuration

### Debug Mode

Enable debug logging:
```bash
VITE_DEBUG=true
```

This will provide detailed console logging for authentication flow debugging.

## Migration from Iframe-based Auth

If migrating from iframe-based authentication:

1. Update Keycloak client configuration as above
2. Remove any custom iframe handling code
3. Update CSP headers to deny frame embedding
4. Test authentication flow thoroughly
5. Monitor for any remaining CSP violations

## Testing

To test the CSP-compliant authentication:

1. Clear browser cache and storage
2. Navigate to the application
3. Verify redirect to Keycloak login
4. Complete login and verify redirect back to app
5. Check browser console for any CSP violations
6. Test token refresh behavior
7. Test logout and re-login flow

The authentication should work smoothly without any iframe-related errors or CSP violations.