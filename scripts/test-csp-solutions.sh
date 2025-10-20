#!/bin/bash

# Comprehensive CSP Testing Script
# Tests all implemented CSP solutions and provides diagnostic information

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Comprehensive Keycloak CSP Testing Suite${NC}"
echo "=" * 60

# Function to test CSP headers
test_csp_headers() {
    local url=$1
    local description=$2

    echo -e "\n${YELLOW}🔍 Testing: $description${NC}"
    echo "URL: $url"

    # Test if service is available
    if ! curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        echo -e "${RED}❌ Service not available at $url${NC}"
        return 1
    fi

    # Get headers
    echo "📋 Response Headers:"
    headers=$(curl -sI "$url" 2>/dev/null)

    # Check for CSP header
    csp_header=$(echo "$headers" | grep -i "content-security-policy" || echo "Not found")
    frame_options=$(echo "$headers" | grep -i "x-frame-options" || echo "Not found")

    echo "  Content-Security-Policy: $csp_header"
    echo "  X-Frame-Options: $frame_options"

    # Check if localhost:3000 is allowed
    if echo "$csp_header" | grep -q "localhost:3000"; then
        echo -e "${GREEN}✅ CSP allows localhost:3000${NC}"
        return 0
    else
        echo -e "${RED}❌ CSP does not allow localhost:3000${NC}"
        return 1
    fi
}

# Function to test iframe embedding
test_iframe_embedding() {
    local keycloak_url=$1

    echo -e "\n${YELLOW}🖼️  Testing iframe embedding${NC}"

    # Create temporary HTML test file
    test_file="/tmp/csp_test.html"
    cat > "$test_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>CSP Iframe Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        iframe { width: 100%; height: 500px; border: 1px solid #ccc; }
        .result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .success { background-color: #d4edda; color: #155724; }
        .error { background-color: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>Keycloak CSP Iframe Test</h1>
    <p>This page tests if Keycloak can be embedded in an iframe from localhost:3000</p>

    <div id="result" class="result">Loading...</div>

    <iframe id="keycloak-iframe" src="$keycloak_url/realms/project-management/protocol/openid-connect/auth?client_id=pm-frontend&response_type=code&scope=openid&redirect_uri=http://localhost:3000&state=test">
    </iframe>

    <script>
        window.addEventListener('DOMContentLoaded', function() {
            const iframe = document.getElementById('keycloak-iframe');
            const result = document.getElementById('result');

            iframe.onload = function() {
                result.className = 'result success';
                result.textContent = '✅ Iframe loaded successfully! CSP is working.';
            };

            iframe.onerror = function() {
                result.className = 'result error';
                result.textContent = '❌ Iframe failed to load. CSP may be blocking.';
            };

            // Check for CSP errors in console
            window.addEventListener('securitypolicyviolation', function(e) {
                result.className = 'result error';
                result.textContent = '❌ CSP Violation: ' + e.violatedDirective + ' - ' + e.blockedURI;
            });
        });
    </script>
</body>
</html>
EOF

    echo "📝 Created test file: $test_file"
    echo "🌐 Open this file in a browser served from localhost:3000 to test iframe embedding"

    # Try to serve the file using Python if available
    if command -v python3 &> /dev/null; then
        echo "🚀 Starting test server on http://localhost:3001..."
        echo "   Open http://localhost:3001/csp_test.html in your browser"
        echo "   Press Ctrl+C to stop the server"
        cd /tmp && python3 -m http.server 3001 2>/dev/null || echo "Could not start Python server"
    fi
}

# Function to check Docker services
check_docker_services() {
    echo -e "\n${YELLOW}🐳 Checking Docker services${NC}"

    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker/docker-compose not found${NC}"
        return 1
    fi

    cd "$PROJECT_ROOT"

    # Check if services are running
    echo "📊 Service Status:"
    if command -v docker-compose &> /dev/null; then
        docker-compose ps
    else
        docker compose ps
    fi

    # Check Keycloak health
    echo -e "\n🏥 Health Checks:"
    if curl -s http://localhost:8180/health/ready > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Keycloak (8180) is healthy${NC}"
    else
        echo -e "${RED}❌ Keycloak (8180) is not responding${NC}"
    fi

    if curl -s http://localhost:8181/health/ready > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Nginx proxy (8181) is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx proxy (8181) is not responding${NC}"
    fi
}

# Function to show logs
show_logs() {
    echo -e "\n${YELLOW}📋 Recent Keycloak logs${NC}"
    cd "$PROJECT_ROOT"

    if command -v docker-compose &> /dev/null; then
        docker-compose logs --tail=20 keycloak
    else
        docker compose logs --tail=20 keycloak
    fi
}

# Function to run Python admin API test
test_admin_api() {
    echo -e "\n${YELLOW}🔧 Testing Admin API CSP configuration${NC}"

    if [ -f "$SCRIPT_DIR/keycloak-admin-api-csp.py" ]; then
        echo "🐍 Running Python Admin API script..."
        cd "$SCRIPT_DIR"
        python3 keycloak-admin-api-csp.py || echo -e "${RED}❌ Admin API script failed${NC}"
    else
        echo -e "${YELLOW}⚠️  Admin API script not found${NC}"
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}Starting comprehensive CSP testing...${NC}"

    # Check prerequisites
    check_docker_services

    # Test different CSP implementations
    echo -e "\n${BLUE}🧪 Testing CSP Implementations${NC}"

    # Test 1: Direct Keycloak (port 8180)
    test_csp_headers "http://localhost:8180/realms/project-management/protocol/openid-connect/auth" "Direct Keycloak (8180)"

    # Test 2: Nginx proxy (port 8181)
    test_csp_headers "http://localhost:8181/realms/project-management/protocol/openid-connect/auth" "Nginx Proxy (8181)"

    # Test 3: Admin API configuration
    test_admin_api

    # Test 4: Iframe embedding test
    echo -e "\n${BLUE}🖼️  Iframe Embedding Test${NC}"
    read -p "Do you want to run the iframe embedding test? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_iframe_embedding "http://localhost:8180"
    fi

    # Show logs for debugging
    echo -e "\n${BLUE}📋 Diagnostic Information${NC}"
    show_logs

    echo -e "\n${GREEN}🎯 Testing complete!${NC}"
    echo -e "${YELLOW}📝 Summary of Solutions:${NC}"
    echo "  1. Environment variables in docker-compose.yml"
    echo "  2. Nginx reverse proxy with header modification"
    echo "  3. Realm configuration in keycloak-realm.json"
    echo "  4. Admin API script for runtime configuration"
    echo "  5. Custom theme with CSP override"
    echo ""
    echo -e "${BLUE}💡 Recommendations:${NC}"
    echo "  - Use nginx proxy (port 8181) for most reliable CSP handling"
    echo "  - Run admin API script if environment variables don't work"
    echo "  - Check browser console for CSP violation errors"
    echo "  - Test with both HTTP and HTTPS protocols"
}

# Handle command line arguments
case "${1:-}" in
    "headers")
        test_csp_headers "http://localhost:8180/realms/project-management/protocol/openid-connect/auth" "Direct Keycloak"
        test_csp_headers "http://localhost:8181/realms/project-management/protocol/openid-connect/auth" "Nginx Proxy"
        ;;
    "iframe")
        test_iframe_embedding "http://localhost:8180"
        ;;
    "admin")
        test_admin_api
        ;;
    "logs")
        show_logs
        ;;
    "services")
        check_docker_services
        ;;
    *)
        main
        ;;
esac