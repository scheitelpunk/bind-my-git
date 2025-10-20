#!/bin/bash

echo "🔍 Verifying Keycloak CSP Configuration Fix"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if Keycloak is running
check_keycloak_status() {
    echo -e "${BLUE}1. Checking Keycloak service status...${NC}"

    if docker-compose ps keycloak | grep -q "Up"; then
        echo -e "${GREEN}✅ Keycloak is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Keycloak is not running${NC}"
        echo "   Run: docker-compose up -d keycloak"
        return 1
    fi
}

# Function to test CSP headers
test_csp_headers() {
    echo -e "${BLUE}2. Testing CSP headers...${NC}"

    # Test the auth endpoint
    local auth_url="http://localhost:8180/realms/project-management/protocol/openid-connect/auth"
    local response=$(curl -s -I "$auth_url" 2>/dev/null)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Keycloak auth endpoint is accessible${NC}"

        # Check for Content-Security-Policy header
        if echo "$response" | grep -i "content-security-policy" | grep -q "localhost:3000"; then
            echo -e "${GREEN}✅ CSP header includes localhost:3000${NC}"
            echo "   $(echo "$response" | grep -i "content-security-policy")"
        else
            echo -e "${YELLOW}⚠️  CSP header not found or doesn't include localhost:3000${NC}"
            echo "   Expected: frame-ancestors 'self' http://localhost:3000 https://localhost:3000"
        fi

        # Check for X-Frame-Options header
        if echo "$response" | grep -i "x-frame-options" | grep -q "localhost:3000"; then
            echo -e "${GREEN}✅ X-Frame-Options header configured for localhost:3000${NC}"
            echo "   $(echo "$response" | grep -i "x-frame-options")"
        else
            echo -e "${YELLOW}⚠️  X-Frame-Options header not found or not configured${NC}"
            echo "   Expected: ALLOW-FROM http://localhost:3000"
        fi

    else
        echo -e "${RED}❌ Cannot reach Keycloak auth endpoint${NC}"
        echo "   URL: $auth_url"
        return 1
    fi
}

# Function to test realm configuration
test_realm_config() {
    echo -e "${BLUE}3. Testing realm configuration...${NC}"

    # Check if realm configuration file exists and has correct settings
    local realm_file="/mnt/c/dev/coding/Projektmanagement-flow/config/keycloak/import/project-management-realm.json"

    if [ -f "$realm_file" ]; then
        echo -e "${GREEN}✅ Realm configuration file exists${NC}"

        # Check for browserSecurityHeaders
        if grep -q "browserSecurityHeaders" "$realm_file"; then
            echo -e "${GREEN}✅ Browser security headers configured in realm${NC}"

            # Check for frame-ancestors in CSP
            if grep -q "frame-ancestors.*localhost:3000" "$realm_file"; then
                echo -e "${GREEN}✅ Frame-ancestors includes localhost:3000${NC}"
            else
                echo -e "${YELLOW}⚠️  Frame-ancestors may not include localhost:3000${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Browser security headers not found in realm config${NC}"
        fi

        # Check frontend client configuration
        if grep -A 10 -B 5 "pm-frontend" "$realm_file" | grep -q "localhost:3000"; then
            echo -e "${GREEN}✅ Frontend client configured for localhost:3000${NC}"
        else
            echo -e "${YELLOW}⚠️  Frontend client may not be configured for localhost:3000${NC}"
        fi

    else
        echo -e "${RED}❌ Realm configuration file not found${NC}"
        return 1
    fi
}

# Function to test Docker Compose configuration
test_docker_config() {
    echo -e "${BLUE}4. Testing Docker Compose configuration...${NC}"

    local compose_file="/mnt/c/dev/coding/Projektmanagement-flow/docker-compose.yml"

    if [ -f "$compose_file" ]; then
        echo -e "${GREEN}✅ Docker Compose file exists${NC}"

        # Check for CSP environment variables
        if grep -q "KC_HTTP_HEADERS_CONTENT_SECURITY_POLICY" "$compose_file"; then
            echo -e "${GREEN}✅ CSP environment variable configured${NC}"

            if grep "KC_HTTP_HEADERS_CONTENT_SECURITY_POLICY" "$compose_file" | grep -q "localhost:3000"; then
                echo -e "${GREEN}✅ CSP includes localhost:3000${NC}"
            else
                echo -e "${YELLOW}⚠️  CSP may not include localhost:3000${NC}"
            fi
        else
            echo -e "${RED}❌ CSP environment variable not configured${NC}"
        fi

        # Check for X-Frame-Options
        if grep -q "KC_HTTP_HEADERS_X_FRAME_OPTIONS" "$compose_file"; then
            echo -e "${GREEN}✅ X-Frame-Options environment variable configured${NC}"
        else
            echo -e "${YELLOW}⚠️  X-Frame-Options environment variable not found${NC}"
        fi

    else
        echo -e "${RED}❌ Docker Compose file not found${NC}"
        return 1
    fi
}

# Function to provide testing recommendations
provide_test_recommendations() {
    echo -e "${BLUE}5. Testing Recommendations${NC}"
    echo "=========================="
    echo ""
    echo -e "${YELLOW}To test the iframe embedding:${NC}"
    echo "1. Start your frontend application:"
    echo "   cd frontend && npm start"
    echo ""
    echo "2. Navigate to http://localhost:3000"
    echo ""
    echo "3. Try to authenticate and check browser console for CSP errors"
    echo ""
    echo "4. Use browser dev tools to verify:"
    echo "   - Network tab: Check response headers from Keycloak"
    echo "   - Console tab: Look for CSP violation errors"
    echo ""
    echo -e "${YELLOW}Manual CSP header test:${NC}"
    echo "curl -I 'http://localhost:8180/realms/project-management/protocol/openid-connect/auth?client_id=pm-frontend&response_type=code&scope=openid'"
    echo ""
    echo -e "${YELLOW}Expected headers should include:${NC}"
    echo "Content-Security-Policy: frame-ancestors 'self' http://localhost:3000 https://localhost:3000"
    echo "X-Frame-Options: ALLOW-FROM http://localhost:3000"
}

# Function to check for security vulnerabilities
check_security() {
    echo -e "${BLUE}6. Security Configuration Check${NC}"
    echo "==============================="

    local compose_file="/mnt/c/dev/coding/Projektmanagement-flow/docker-compose.yml"

    echo -e "${GREEN}✅ Security measures in place:${NC}"

    # Check for additional security headers
    if grep -q "KC_HTTP_HEADERS_X_CONTENT_TYPE_OPTIONS" "$compose_file"; then
        echo "   - X-Content-Type-Options: nosniff"
    fi

    if grep -q "KC_HTTP_HEADERS_X_XSS_PROTECTION" "$compose_file"; then
        echo "   - X-XSS-Protection: enabled"
    fi

    if grep -q "KC_HTTP_HEADERS_REFERRER_POLICY" "$compose_file"; then
        echo "   - Referrer-Policy: configured"
    fi

    echo ""
    echo -e "${YELLOW}⚠️  Production considerations:${NC}"
    echo "   - Replace localhost:3000 with actual domain"
    echo "   - Use HTTPS in production"
    echo "   - Review CSP directives for your specific needs"
    echo "   - Consider additional security headers"
}

# Main execution
main() {
    echo "Starting CSP fix verification..."
    echo ""

    check_keycloak_status
    echo ""

    test_csp_headers
    echo ""

    test_realm_config
    echo ""

    test_docker_config
    echo ""

    provide_test_recommendations
    echo ""

    check_security
    echo ""

    echo -e "${GREEN}🎉 CSP verification complete!${NC}"
    echo ""
    echo "If you're still experiencing CSP issues:"
    echo "1. Restart Keycloak: ./scripts/restart-keycloak.sh"
    echo "2. Clear browser cache and cookies"
    echo "3. Check browser console for specific CSP violation details"
    echo "4. Review the documentation: docs/KEYCLOAK_CSP_FIX.md"
}

# Run the main function
main