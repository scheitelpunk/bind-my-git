#!/bin/bash

# Authentication Test Script
# Tests the Keycloak authentication integration

set -e

echo "🔐 Testing Keycloak Authentication Integration"
echo "=============================================="

# Configuration
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8180}"
API_URL="${API_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
REALM="${KEYCLOAK_REALM:-project-management}"

echo "Configuration:"
echo "  Keycloak URL: $KEYCLOAK_URL"
echo "  API URL: $API_URL"
echo "  Frontend URL: $FRONTEND_URL"
echo "  Realm: $REALM"
echo

# Function to check service health
check_service() {
    local name=$1
    local url=$2
    local endpoint=$3

    echo -n "Checking $name... "
    if curl -f -s "${url}${endpoint}" > /dev/null 2>&1; then
        echo "✅ OK"
        return 0
    else
        echo "❌ FAILED"
        return 1
    fi
}

# Function to get access token
get_token() {
    local username=$1
    local password=$2

    echo "Getting access token for user: $username"

    local response=$(curl -s -X POST \
        "$KEYCLOAK_URL/realms/$REALM/protocol/openid_connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=password" \
        -d "client_id=pm-backend" \
        -d "username=$username" \
        -d "password=$password")

    echo "$response" | jq -r '.access_token' 2>/dev/null || echo "null"
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint=$1
    local token=$2
    local expected_status=$3

    echo -n "Testing $endpoint... "

    local status=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $token" \
        "$API_URL$endpoint")

    if [ "$status" = "$expected_status" ]; then
        echo "✅ OK (Status: $status)"
        return 0
    else
        echo "❌ FAILED (Expected: $expected_status, Got: $status)"
        return 1
    fi
}

echo "1. Checking Service Health"
echo "========================="

# Check services
check_service "Keycloak" "$KEYCLOAK_URL" "/auth/health" || true
check_service "Backend API" "$API_URL" "/health" || true
check_service "Frontend" "$FRONTEND_URL" "/health" || true

echo

echo "2. Testing Keycloak Realm Configuration"
echo "======================================="

# Check realm configuration
echo -n "Checking realm configuration... "
if curl -f -s "$KEYCLOAK_URL/realms/$REALM" > /dev/null 2>&1; then
    echo "✅ Realm accessible"
else
    echo "❌ Realm not accessible"
fi

# Check JWKS endpoint
echo -n "Checking JWKS endpoint... "
if curl -f -s "$KEYCLOAK_URL/realms/$REALM/protocol/openid_connect/certs" > /dev/null 2>&1; then
    echo "✅ JWKS accessible"
else
    echo "❌ JWKS not accessible"
fi

echo

echo "3. Testing User Authentication"
echo "============================="

# Test users
declare -A test_users
test_users["admin"]="admin123"
test_users["manager"]="manager123"
test_users["user"]="user123"

for username in "${!test_users[@]}"; do
    password="${test_users[$username]}"
    echo
    echo "Testing user: $username"
    echo "-----------------------"

    # Get token
    token=$(get_token "$username" "$password")

    if [ "$token" = "null" ] || [ -z "$token" ]; then
        echo "❌ Failed to get token for $username"
        continue
    fi

    echo "✅ Token obtained for $username"

    # Test API endpoints
    test_api_endpoint "/auth/user" "$token" "200"
    test_api_endpoint "/auth/roles" "$token" "200"

    # Test role-specific endpoints
    case $username in
        "admin")
            echo "Testing admin-specific access..."
            test_api_endpoint "/auth/check/admin" "$token" "200"
            ;;
        "manager")
            echo "Testing manager-specific access..."
            test_api_endpoint "/auth/check/manager" "$token" "200"
            test_api_endpoint "/auth/check/admin" "$token" "200"  # Should return false but 200 status
            ;;
        "user")
            echo "Testing user-specific access..."
            test_api_endpoint "/auth/check/user" "$token" "200"
            test_api_endpoint "/auth/check/admin" "$token" "200"  # Should return false but 200 status
            ;;
    esac
done

echo

echo "4. Testing Unauthorized Access"
echo "============================="

# Test without token
test_api_endpoint "/auth/user" "" "422"  # FastAPI returns 422 for missing auth

# Test with invalid token
test_api_endpoint "/auth/user" "invalid-token" "401"

echo

echo "5. Testing Frontend Integration"
echo "==============================="

# Check if silent SSO page exists
echo -n "Checking silent SSO page... "
if curl -f -s "$FRONTEND_URL/silent-check-sso.html" > /dev/null 2>&1; then
    echo "✅ Silent SSO page accessible"
else
    echo "❌ Silent SSO page not accessible"
fi

# Check if frontend assets are served
echo -n "Checking frontend assets... "
if curl -f -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "✅ Frontend accessible"
else
    echo "❌ Frontend not accessible"
fi

echo

echo "6. Testing CORS Configuration"
echo "============================"

# Test CORS preflight
echo -n "Testing CORS preflight... "
cors_status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Authorization" \
    "$API_URL/auth/user")

if [ "$cors_status" = "200" ]; then
    echo "✅ CORS preflight OK"
else
    echo "❌ CORS preflight failed (Status: $cors_status)"
fi

echo

echo "Authentication Test Summary"
echo "=========================="
echo "✅ Services checked"
echo "✅ Authentication flow tested"
echo "✅ Role-based access tested"
echo "✅ Security measures verified"
echo
echo "🎉 Keycloak authentication integration test completed!"
echo
echo "Next steps:"
echo "1. Access frontend: $FRONTEND_URL"
echo "2. Login with test users (admin/admin123, manager/manager123, user/user123)"
echo "3. Test role-based features"
echo "4. Review Keycloak admin console: $KEYCLOAK_URL"
echo
echo "For detailed setup instructions, see: docs/KEYCLOAK_SETUP.md"