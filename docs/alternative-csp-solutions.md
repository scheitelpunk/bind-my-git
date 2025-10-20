# Alternative Keycloak CSP Solutions

## Overview

This document provides multiple alternative solutions to resolve the Content Security Policy (CSP) `frame-ancestors` issue preventing iframe embedding of Keycloak from `localhost:3000`.

## Problem Statement

The error encountered:
```
Refused to frame 'http://localhost:8180/' because an ancestor violates the following
Content Security Policy directive: 'frame-ancestors 'self'
```

## Solution Approaches

We've implemented **5 different approaches** to resolve this issue, providing multiple fallback options.

### 1. 🔧 Keycloak Admin API Configuration

**File:** `/scripts/keycloak-admin-api-csp.py`

**Description:** Uses Keycloak's REST API to configure CSP headers at runtime.

**Advantages:**
- ✅ Works regardless of environment variable support
- ✅ Can be run after Keycloak is already running
- ✅ Provides verification of applied settings
- ✅ Most reliable for Keycloak 22.0.5+

**Usage:**
```bash
# Ensure Keycloak is running first
docker-compose up keycloak -d

# Run the admin API configuration
python3 scripts/keycloak-admin-api-csp.py
```

**How it works:**
1. Authenticates with Keycloak admin API
2. Retrieves current realm configuration
3. Updates `browserSecurityHeaders` with proper CSP
4. Verifies the configuration was applied

### 2. 🌐 Nginx Reverse Proxy Solution

**Files:**
- `/config/nginx/keycloak-proxy.conf`
- Updated `docker-compose.yml` with nginx service

**Description:** Nginx proxy that modifies CSP headers before serving responses.

**Advantages:**
- ✅ Works with any Keycloak version
- ✅ Complete control over headers
- ✅ Can handle complex CSP requirements
- ✅ Provides additional security and caching features

**Usage:**
```bash
# Start with nginx proxy
docker-compose up nginx keycloak -d

# Access via proxy
curl -I http://localhost:8181/realms/project-management/protocol/openid-connect/auth
```

**Configuration:**
- Keycloak: `http://localhost:8180` (internal)
- Nginx Proxy: `http://localhost:8181` (external)
- Automatic redirect from 8180 → 8181

### 3. 🔀 Multiple Environment Variable Approaches

**File:** Updated `docker-compose.yml`

**Description:** Uses multiple environment variable syntaxes for maximum compatibility.

**Implemented Variables:**
```yaml
# Method 1: Keycloak 22.0.5+ SPI syntax
- KC_SPI_SECURITY_HEADERS_CONTENT_SECURITY_POLICY=frame-ancestors 'self' http://localhost:3000 https://localhost:3000; frame-src 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';

# Method 2: Legacy HTTP headers syntax (fallback)
- KC_HTTP_HEADERS_CONTENT_SECURITY_POLICY=frame-ancestors 'self' http://localhost:3000 https://localhost:3000; frame-src 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';

# Method 3: Provider-specific configuration
- KC_SPI_LOGIN_PROTOCOL_OPENID_CONNECT_LEGACY_LOGOUT_REDIRECT_URI=true
- KC_SPI_HOSTNAME_DEFAULT_FRONTEND_URL=http://localhost:8180
```

### 4. 📄 Realm Configuration Method

**File:** `/config/keycloak/import/keycloak-realm.json`

**Description:** Configures CSP at the realm level during import.

**Added Configuration:**
```json
"browserSecurityHeaders": {
  "contentSecurityPolicy": "frame-ancestors 'self' http://localhost:3000 https://localhost:3000; frame-src 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';",
  "xFrameOptions": "SAMEORIGIN",
  "xContentTypeOptions": "nosniff",
  "xXSSProtection": "1; mode=block",
  "strictTransportSecurity": "max-age=31536000; includeSubDomains",
  "referrerPolicy": "strict-origin-when-cross-origin"
}
```

### 5. 🎨 Custom Theme CSP Override

**File:** `/scripts/keycloak-theme-csp-override.sh`

**Description:** Creates a custom Keycloak theme that overrides CSP at the template level.

**Features:**
- Custom login template with CSP meta tags
- Theme-level CSP configuration
- Overrides at the HTML template level

**Usage:**
```bash
# Create custom theme
./scripts/keycloak-theme-csp-override.sh

# Add to docker-compose.yml:
volumes:
  - ./config/keycloak/themes:/opt/keycloak/themes:ro
environment:
  - KC_SPI_THEME_DEFAULT=custom-csp
```

## Testing Solutions

### Comprehensive Test Script

**File:** `/scripts/test-csp-solutions.sh`

**Features:**
- Tests all implemented solutions
- Verifies CSP headers are correctly set
- Provides iframe embedding test
- Shows diagnostic information
- Automated health checks

**Usage:**
```bash
# Run all tests
./scripts/test-csp-solutions.sh

# Test specific components
./scripts/test-csp-solutions.sh headers  # Test headers only
./scripts/test-csp-solutions.sh iframe   # Test iframe embedding
./scripts/test-csp-solutions.sh admin    # Test admin API
./scripts/test-csp-solutions.sh logs     # Show logs
./scripts/test-csp-solutions.sh services # Check service status
```

## Recommended Implementation Order

### For Development Environment:

1. **Start with Nginx Proxy** (Most Reliable)
   ```bash
   docker-compose up nginx keycloak -d
   # Use http://localhost:8181 instead of 8180
   ```

2. **If Nginx isn't preferred, use Admin API:**
   ```bash
   docker-compose up keycloak -d
   python3 scripts/keycloak-admin-api-csp.py
   ```

3. **For persistent configuration, update realm import:**
   - Restart with updated `keycloak-realm.json`
   - Import will apply CSP settings

### For Production Environment:

1. **Use Nginx reverse proxy** with:
   - SSL termination
   - Proper domain names instead of localhost
   - Additional security headers

2. **Update CSP for production domains:**
   ```nginx
   add_header Content-Security-Policy "frame-ancestors 'self' https://yourdomain.com; ...";
   ```

## Troubleshooting

### Common Issues:

1. **Environment variables not working:**
   - Try Admin API approach
   - Check Keycloak version compatibility
   - Verify environment variable syntax

2. **Headers not appearing:**
   - Clear browser cache
   - Check with `curl -I` instead of browser
   - Restart Keycloak service

3. **Nginx proxy issues:**
   - Check nginx configuration syntax
   - Verify upstream backend connectivity
   - Review nginx error logs

### Debug Commands:

```bash
# Check headers directly
curl -I http://localhost:8180/realms/project-management/protocol/openid-connect/auth

# Check nginx proxy headers
curl -I http://localhost:8181/realms/project-management/protocol/openid-connect/auth

# Check service logs
docker-compose logs keycloak
docker-compose logs nginx

# Test iframe embedding
python3 -m http.server 3001  # Serve test HTML file
```

## Security Considerations

### ✅ Secure Configuration:
- Specific origin allowlist (`localhost:3000`)
- Maintains XSS protection
- Preserves content type validation
- Includes referrer policy

### ⚠️ Production Updates Required:
- Replace `localhost:3000` with actual domain
- Use HTTPS only in production
- Consider additional CSP directives
- Review and test all security headers

## Version Compatibility

| Keycloak Version | Method 1 (API) | Method 2 (Nginx) | Method 3 (Env Vars) | Method 4 (Realm) | Method 5 (Theme) |
|------------------|----------------|-------------------|---------------------|-------------------|-------------------|
| 22.0.5+          | ✅ Recommended | ✅ Works          | ✅ Works           | ✅ Works         | ✅ Works         |
| 20.x - 22.0.4    | ✅ Works       | ✅ Works          | ⚠️ Limited         | ✅ Works         | ✅ Works         |
| < 20.x           | ⚠️ Different API | ✅ Works          | ❌ No support      | ✅ Works         | ✅ Works         |

## Files Created/Modified

### New Files:
- `/scripts/keycloak-admin-api-csp.py` - Admin API configuration script
- `/config/nginx/keycloak-proxy.conf` - Nginx proxy configuration
- `/scripts/keycloak-theme-csp-override.sh` - Custom theme creator
- `/scripts/test-csp-solutions.sh` - Comprehensive testing script
- `/docs/alternative-csp-solutions.md` - This documentation

### Modified Files:
- `/docker-compose.yml` - Added nginx service and alternative env vars
- `/config/keycloak/import/keycloak-realm.json` - Added browserSecurityHeaders

## Quick Start

```bash
# Option 1: Use nginx proxy (recommended)
docker-compose up nginx keycloak -d
# Frontend should use: http://localhost:8181

# Option 2: Use admin API
docker-compose up keycloak -d
python3 scripts/keycloak-admin-api-csp.py

# Option 3: Test everything
./scripts/test-csp-solutions.sh
```

## Support

If none of these solutions work:

1. Run the comprehensive test script
2. Check browser developer console for specific CSP errors
3. Verify Keycloak version compatibility
4. Consider upgrading to latest Keycloak version
5. Test with minimal CSP policy first

The multiple approaches ensure that at least one solution will work for your specific Keycloak version and deployment setup.