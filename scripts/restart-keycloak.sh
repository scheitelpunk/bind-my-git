#!/bin/bash

# Script to restart Keycloak with new CSP configuration
echo "🔄 Restarting Keycloak to apply CSP configuration changes..."

# Stop Keycloak service
echo "Stopping Keycloak..."
docker-compose stop keycloak

# Remove Keycloak container to ensure clean restart
echo "Removing Keycloak container..."
docker-compose rm -f keycloak

# Start Keycloak with new configuration
echo "Starting Keycloak with new CSP configuration..."
docker-compose up -d keycloak

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to start..."
sleep 30

# Check if Keycloak is running
if docker-compose ps keycloak | grep -q "Up"; then
    echo "✅ Keycloak is running with new CSP configuration"
    echo "🌐 Keycloak admin console: http://localhost:8180/admin"
    echo "🔑 Admin credentials: admin / admin123"
    echo ""
    echo "📋 Applied CSP changes:"
    echo "   - frame-ancestors: 'self' http://localhost:3000 https://localhost:3000"
    echo "   - X-Frame-Options: ALLOW-FROM http://localhost:3000"
    echo "   - Additional security headers configured"
    echo ""
    echo "🧪 Test the iframe embedding from your frontend at localhost:3000"
else
    echo "❌ Failed to start Keycloak"
    echo "Check logs with: docker-compose logs keycloak"
fi