#!/bin/bash

echo "🔧 Updating Keycloak CSP configuration via Admin API"
echo "=================================================="

# Keycloak admin credentials
KEYCLOAK_URL="http://localhost:8180"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
REALM_NAME="project-management"

# Function to get admin token
get_admin_token() {
    echo "Getting admin access token..."

    local response=$(curl -s -X POST \
        "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$ADMIN_USERNAME" \
        -d "password=$ADMIN_PASSWORD" \
        -d "grant_type=password" \
        -d "client_id=admin-cli")

    if [ $? -eq 0 ]; then
        echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4
    else
        echo "Failed to get admin token"
        return 1
    fi
}

# Function to update realm security headers
update_realm_security_headers() {
    local token="$1"

    echo "Updating realm security headers..."

    # Create the security headers configuration
    local security_headers='{
        "browserSecurityHeaders": {
            "contentSecurityPolicyReportOnly": "",
            "xContentTypeOptions": "nosniff",
            "xRobotsTag": "none",
            "xFrameOptions": "SAMEORIGIN",
            "contentSecurityPolicy": "frame-ancestors '\''self'\'' http://localhost:3000 https://localhost:3000; frame-src '\''self'\''; object-src '\''none'\'';",
            "xXSSProtection": "1; mode=block",
            "strictTransportSecurity": "max-age=31536000; includeSubDomains"
        }
    }'

    # Get current realm configuration
    local current_realm=$(curl -s -X GET \
        "$KEYCLOAK_URL/admin/realms/$REALM_NAME" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")

    if [ $? -ne 0 ]; then
        echo "Failed to get current realm configuration"
        return 1
    fi

    # Update the realm with new security headers
    local updated_realm=$(echo "$current_realm" | jq ". += $security_headers")

    curl -s -X PUT \
        "$KEYCLOAK_URL/admin/realms/$REALM_NAME" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$updated_realm"

    if [ $? -eq 0 ]; then
        echo "✅ Successfully updated realm security headers"
        return 0
    else
        echo "❌ Failed to update realm security headers"
        return 1
    fi
}

# Function to verify the update
verify_csp_headers() {
    echo "Verifying CSP headers..."
    sleep 5

    local csp_header=$(curl -s -I "$KEYCLOAK_URL/realms/$REALM_NAME/protocol/openid-connect/auth?client_id=pm-frontend&response_type=code&scope=openid" | grep -i "content-security-policy")

    if echo "$csp_header" | grep -q "localhost:3000"; then
        echo "✅ CSP header now includes localhost:3000"
        echo "   $csp_header"
    else
        echo "❌ CSP header still doesn't include localhost:3000"
        echo "   $csp_header"
    fi
}

# Main execution
main() {
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo "❌ jq is required but not installed. Please install jq first."
        echo "   Ubuntu/Debian: sudo apt-get install jq"
        echo "   CentOS/RHEL: sudo yum install jq"
        echo "   macOS: brew install jq"
        return 1
    fi

    # Wait for Keycloak to be ready
    echo "Waiting for Keycloak to be ready..."
    local retries=0
    local max_retries=30

    while [ $retries -lt $max_retries ]; do
        if curl -s "$KEYCLOAK_URL/realms/master" >/dev/null 2>&1; then
            echo "✅ Keycloak is ready"
            break
        fi

        retries=$((retries + 1))
        echo "Waiting... ($retries/$max_retries)"
        sleep 2
    done

    if [ $retries -eq $max_retries ]; then
        echo "❌ Keycloak is not responding after $max_retries attempts"
        return 1
    fi

    # Get admin token
    local admin_token=$(get_admin_token)

    if [ -z "$admin_token" ]; then
        echo "❌ Failed to get admin token"
        return 1
    fi

    echo "✅ Got admin token"

    # Update realm security headers
    if update_realm_security_headers "$admin_token"; then
        verify_csp_headers
    else
        echo "❌ Failed to update security headers"
        return 1
    fi

    echo ""
    echo "🎉 CSP configuration update complete!"
    echo "You can now test iframe embedding from localhost:3000"
}

# Run main function
main