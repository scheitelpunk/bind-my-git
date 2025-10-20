# Keycloak Content Security Policy (CSP) Fix

## Problem
The frontend application at `localhost:3000` was unable to embed or frame Keycloak authentication pages from `localhost:8180` due to Content Security Policy restrictions. The error was:

```
Refused to frame 'http://localhost:8180/' because an ancestor violates the following Content Security Policy directive: 'frame-ancestors 'self'
```

## Solution
We've implemented a comprehensive CSP configuration that allows secure iframe embedding from the frontend while maintaining security best practices.

## Changes Made

### 1. Docker Compose Configuration (`docker-compose.yml`)
Added the following environment variables to the Keycloak service:

```yaml
environment:
  # CSP Configuration to allow iframe embedding from localhost:3000
  - KC_HTTP_HEADERS_CONTENT_SECURITY_POLICY=frame-ancestors 'self' http://localhost:3000 https://localhost:3000
  - KC_HTTP_HEADERS_X_FRAME_OPTIONS=ALLOW-FROM http://localhost:3000
  # Additional security headers while allowing iframe embedding
  - KC_HTTP_HEADERS_X_CONTENT_TYPE_OPTIONS=nosniff
  - KC_HTTP_HEADERS_X_XSS_PROTECTION=1; mode=block
  - KC_HTTP_HEADERS_REFERRER_POLICY=strict-origin-when-cross-origin
```

### 2. Realm Configuration (`config/keycloak/import/project-management-realm.json`)
Added browser security headers at the realm level:

```json
"browserSecurityHeaders": {
  "contentSecurityPolicyReportOnly": "",
  "xContentTypeOptions": "nosniff",
  "xRobotsTag": "none",
  "xFrameOptions": "SAMEORIGIN",
  "contentSecurityPolicy": "frame-ancestors 'self' http://localhost:3000 https://localhost:3000; frame-src 'self'; object-src 'none';",
  "xXSSProtection": "1; mode=block",
  "strictTransportSecurity": "max-age=31536000; includeSubDomains"
}
```

Updated frontend client attributes:

```json
"attributes": {
  "pkce.code.challenge.method": "S256",
  "post.logout.redirect.uris": "http://localhost:3000/*",
  "backchannel.logout.session.required": "true",
  "backchannel.logout.revoke.offline.tokens": "false"
}
```

## Security Considerations

### ✅ Secure Configuration
- **Specific Origins**: Only allows framing from `localhost:3000` and `https://localhost:3000`
- **Additional Security Headers**: Maintains XSS protection, content type validation, and referrer policy
- **HTTPS Support**: Configuration ready for HTTPS deployment
- **Object Source Restriction**: Prevents object embedding for additional security

### ✅ Development vs Production
This configuration is designed for development environments. For production:

1. Replace `localhost:3000` with your actual domain
2. Remove HTTP origins and use only HTTPS
3. Consider additional CSP directives based on your security requirements
4. Update the `strictTransportSecurity` header for production use

## Testing the Fix

### 1. Restart Keycloak
Use the provided script to restart Keycloak with new configuration:

```bash
./scripts/restart-keycloak.sh
```

### 2. Verify Configuration
Check that Keycloak is running and configured correctly:

```bash
# Check Keycloak status
docker-compose ps keycloak

# View Keycloak logs
docker-compose logs keycloak

# Test CSP headers
curl -I http://localhost:8180/realms/project-management/protocol/openid-connect/auth
```

### 3. Test Frontend Integration
1. Start your frontend application at `localhost:3000`
2. Navigate to authentication flows
3. Verify that Keycloak pages can be embedded without CSP errors
4. Check browser developer tools for any remaining CSP violations

## Common Authentication Flows

### Standard Flow (Recommended)
The current configuration supports the standard OAuth2/OIDC flow where:
1. Frontend redirects to Keycloak for authentication
2. User authenticates on Keycloak pages
3. Keycloak redirects back to frontend with authorization code
4. Frontend exchanges code for tokens

### Iframe/Silent Flow
If using iframe for silent token refresh:
1. Ensure `checkLoginIframe: false` in frontend Keycloak config (already configured)
2. Use the `silentCheckSsoRedirectUri` for silent authentication checks
3. Monitor browser console for any CSP warnings

## Troubleshooting

### Still Getting CSP Errors?
1. **Clear Browser Cache**: CSP headers are often cached
2. **Check Network Tab**: Verify CSP headers are present in responses
3. **Restart Services**: Ensure all services are using new configuration
4. **Check Logs**: Review Keycloak logs for any configuration errors

### Example CSP Header Check
```bash
curl -I http://localhost:8180/realms/project-management/protocol/openid-connect/auth | grep -i "content-security-policy\|x-frame-options"
```

Expected output should include:
```
Content-Security-Policy: frame-ancestors 'self' http://localhost:3000 https://localhost:3000
X-Frame-Options: ALLOW-FROM http://localhost:3000
```

### Production Deployment
For production environments, update the CSP configuration to use your actual domain:

```yaml
- KC_HTTP_HEADERS_CONTENT_SECURITY_POLICY=frame-ancestors 'self' https://yourdomain.com
```

## Related Files
- `/docker-compose.yml` - Keycloak service configuration
- `/config/keycloak/import/project-management-realm.json` - Realm configuration
- `/frontend/src/services/keycloak.ts` - Frontend Keycloak integration
- `/scripts/restart-keycloak.sh` - Utility script for applying changes

## Additional Resources
- [Keycloak Security Headers Documentation](https://www.keycloak.org/docs/latest/server_admin/index.html#_security_headers)
- [Content Security Policy MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP CSP Guide](https://owasp.org/www-community/controls/Content_Security_Policy)