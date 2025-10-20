#!/bin/bash

# Update CSP Configuration for Iframe-Free Authentication
# This script removes iframe-related CSP configurations and enforces strict CSP

set -e

echo "🔒 Updating CSP configuration for iframe-free authentication..."

# Backup current docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup
echo "✅ Created backup: docker-compose.yml.backup"

# Update Keycloak CSP configuration to deny all frames
echo "📝 Updating Keycloak CSP headers..."

# Create temporary file with updated CSP configuration
cat > /tmp/keycloak-csp-update.yml << 'EOF'
# Iframe-Free CSP Configuration for Keycloak
environment:
  - KEYCLOAK_ADMIN=admin
  - KEYCLOAK_ADMIN_PASSWORD=admin123
  - KC_DB=postgres
  - KC_DB_URL=jdbc:postgresql://keycloak-db:5432/keycloak
  - KC_DB_USERNAME=keycloak
  - KC_DB_PASSWORD=keycloak123
  - KC_HOSTNAME_STRICT=false
  - KC_HTTP_ENABLED=true
  - KC_HOSTNAME_STRICT_HTTPS=false
  # Strict CSP Configuration - No iframe support
  - KC_HTTP_HEADERS_CONTENT_SECURITY_POLICY=frame-ancestors 'none'; frame-src 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';
  - KC_HTTP_HEADERS_X_FRAME_OPTIONS=DENY
  # Additional security headers
  - KC_HTTP_HEADERS_X_CONTENT_TYPE_OPTIONS=nosniff
  - KC_HTTP_HEADERS_X_XSS_PROTECTION=1; mode=block
  - KC_HTTP_HEADERS_REFERRER_POLICY=strict-origin-when-cross-origin
  - KC_HTTP_HEADERS_STRICT_TRANSPORT_SECURITY=max-age=31536000; includeSubDomains
  # Disable iframe-based features
  - KC_SPI_LOGIN_PROTOCOL_OPENID_CONNECT_SUPPRESS_LOGOUT_CONFIRMATION_SCREEN=true
  - KC_SPI_LOGIN_PROTOCOL_OPENID_CONNECT_LEGACY_LOGOUT_REDIRECT_URI=true
EOF

# Update the Keycloak service environment in docker-compose.yml
python3 << 'EOF'
import yaml
import sys

# Read the current docker-compose.yml
with open('docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

# Update Keycloak environment
if 'services' in compose and 'keycloak' in compose['services']:
    compose['services']['keycloak']['environment'] = [
        'KEYCLOAK_ADMIN=admin',
        'KEYCLOAK_ADMIN_PASSWORD=admin123',
        'KC_DB=postgres',
        'KC_DB_URL=jdbc:postgresql://keycloak-db:5432/keycloak',
        'KC_DB_USERNAME=keycloak',
        'KC_DB_PASSWORD=keycloak123',
        'KC_HOSTNAME_STRICT=false',
        'KC_HTTP_ENABLED=true',
        'KC_HOSTNAME_STRICT_HTTPS=false',
        # Strict CSP Configuration - No iframe support
        'KC_HTTP_HEADERS_CONTENT_SECURITY_POLICY=frame-ancestors \'none\'; frame-src \'none\'; object-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; connect-src \'self\';',
        'KC_HTTP_HEADERS_X_FRAME_OPTIONS=DENY',
        # Additional security headers
        'KC_HTTP_HEADERS_X_CONTENT_TYPE_OPTIONS=nosniff',
        'KC_HTTP_HEADERS_X_XSS_PROTECTION=1; mode=block',
        'KC_HTTP_HEADERS_REFERRER_POLICY=strict-origin-when-cross-origin',
        'KC_HTTP_HEADERS_STRICT_TRANSPORT_SECURITY=max-age=31536000; includeSubDomains',
        # Disable iframe-based features
        'KC_SPI_LOGIN_PROTOCOL_OPENID_CONNECT_SUPPRESS_LOGOUT_CONFIRMATION_SCREEN=true',
        'KC_SPI_LOGIN_PROTOCOL_OPENID_CONNECT_LEGACY_LOGOUT_REDIRECT_URI=true'
    ]

    # Remove nginx service if it exists (no longer needed for CSP modification)
    if 'nginx' in compose['services']:
        del compose['services']['nginx']
        print("🗑️ Removed nginx service (no longer needed for iframe-free setup)")
    
    # Write back the updated configuration
    with open('docker-compose.yml', 'w') as f:
        yaml.dump(compose, f, default_flow_style=False, sort_keys=False)
    
    print("✅ Updated docker-compose.yml with iframe-free CSP configuration")
else:
    print("❌ Could not find Keycloak service in docker-compose.yml")
    sys.exit(1)
EOF

# Update frontend environment variables
echo "🌐 Updating frontend environment for iframe-free authentication..."

# Create .env.example with iframe-free configuration
cat > .env.example << 'EOF'
# Iframe-Free Authentication Configuration

# API Configuration
VITE_API_URL=http://localhost:8000

# Keycloak Configuration - Iframe Free
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=project-management
VITE_KEYCLOAK_CLIENT_ID=pm-frontend

# Authentication Mode
VITE_AUTH_MODE=iframe-free
VITE_AUTH_AUTO_LOGIN=false
VITE_AUTH_SILENT_CHECK=false

# Security Configuration
VITE_CSP_MODE=strict
VITE_IFRAME_SUPPORT=false

# Development Configuration
VITE_DEBUG_AUTH=true
VITE_LOG_LEVEL=info
EOF

# Update frontend package.json scripts if they exist
if [ -f "frontend/package.json" ]; then
    echo "📦 Updating frontend package.json..."
    
    # Add test scripts for iframe-free authentication
    python3 << 'EOF'
import json

try:
    with open('frontend/package.json', 'r') as f:
        package = json.load(f)
    
    # Add iframe-free specific scripts
    if 'scripts' not in package:
        package['scripts'] = {}
    
    package['scripts']['test:auth'] = 'vitest tests/auth/'
    package['scripts']['test:auth:watch'] = 'vitest tests/auth/ --watch'
    package['scripts']['test:iframe-free'] = 'vitest tests/auth/iframe-free-auth.test.ts'
    package['scripts']['dev:iframe-free'] = 'vite --mode iframe-free'
    
    with open('frontend/package.json', 'w') as f:
        json.dump(package, f, indent=2)
    
    print("✅ Updated frontend package.json with iframe-free scripts")
except Exception as e:
    print(f"⚠️ Could not update frontend package.json: {e}")
EOF
fi

# Create Keycloak realm import with iframe-free configuration
echo "🔑 Updating Keycloak realm configuration..."

# Copy the iframe-free realm configuration
if [ -f "config/keycloak/import/keycloak-iframe-free-realm.json" ]; then
    cp config/keycloak/import/keycloak-iframe-free-realm.json config/keycloak/import/project-management-realm.json
    echo "✅ Updated Keycloak realm with iframe-free configuration"
else
    echo "⚠️ Iframe-free realm configuration not found"
fi

# Update CSP test configuration
echo "🧪 Creating CSP validation script..."

cat > scripts/validate-csp.sh << 'EOF'
#!/bin/bash

# Validate CSP Configuration for Iframe-Free Setup

echo "🔍 Validating CSP configuration..."

# Check if Keycloak is running
if ! curl -s http://localhost:8180/health > /dev/null; then
    echo "❌ Keycloak is not running. Please start it first with: docker-compose up keycloak"
    exit 1
fi

# Test CSP headers
echo "📋 Checking CSP headers..."

CSP_HEADER=$(curl -sI http://localhost:8180/realms/project-management/protocol/openid-connect/auth | grep -i "content-security-policy" || true)
FRAME_HEADER=$(curl -sI http://localhost:8180/realms/project-management/protocol/openid-connect/auth | grep -i "x-frame-options" || true)

if echo "$CSP_HEADER" | grep -q "frame-ancestors 'none'"; then
    echo "✅ CSP frame-ancestors correctly set to 'none'"
else
    echo "❌ CSP frame-ancestors not properly configured"
    echo "Current CSP: $CSP_HEADER"
fi

if echo "$FRAME_HEADER" | grep -q "DENY"; then
    echo "✅ X-Frame-Options correctly set to DENY"
else
    echo "❌ X-Frame-Options not properly configured"
    echo "Current X-Frame-Options: $FRAME_HEADER"
fi

# Test iframe blocking
echo "🚫 Testing iframe blocking..."

cat > /tmp/iframe-test.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
    <title>Iframe Test</title>
</head>
<body>
    <h1>Testing Iframe Blocking</h1>
    <iframe src="http://localhost:8180/realms/project-management/protocol/openid-connect/auth" width="600" height="400">
        Iframe should be blocked
    </iframe>
    <script>
        window.addEventListener('load', function() {
            const iframe = document.querySelector('iframe');
            iframe.onload = function() {
                console.log('❌ FAILURE: Iframe loaded successfully - CSP not working');
            };
            iframe.onerror = function() {
                console.log('✅ SUCCESS: Iframe blocked by CSP');
            };
        });
    </script>
</body>
</html>
HTML

echo "📄 Created iframe test file: /tmp/iframe-test.html"
echo "🌐 Open this file in a browser to test iframe blocking"
echo "💡 You should see console errors indicating iframe is blocked"

echo "\n🔒 CSP validation complete!"
EOF

chmod +x scripts/validate-csp.sh
echo "✅ Created CSP validation script: scripts/validate-csp.sh"

# Clean up temporary files
rm -f /tmp/keycloak-csp-update.yml

echo "\n🎉 CSP configuration updated for iframe-free authentication!"
echo "\n📋 Next steps:"
echo "1. Restart services: docker-compose down && docker-compose up"
echo "2. Validate CSP: ./scripts/validate-csp.sh"
echo "3. Test authentication flow with new iframe-free implementation"
echo "4. Update your application to use the new AuthProvider"
echo "\n📚 See docs/IFRAME_FREE_MIGRATION.md for detailed migration guide"
