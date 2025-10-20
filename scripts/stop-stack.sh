#!/bin/bash

# Project Management System - Docker Stack Shutdown Script
# This script stops the complete Docker stack gracefully

set -e

echo "🛑 Stopping Project Management System Docker Stack..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    print_error "docker-compose is not installed."
    exit 1
fi

# Parse command line arguments
REMOVE_VOLUMES=false
REMOVE_IMAGES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --volumes)
            REMOVE_VOLUMES=true
            shift
            ;;
        --images)
            REMOVE_IMAGES=true
            shift
            ;;
        --all)
            REMOVE_VOLUMES=true
            REMOVE_IMAGES=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --volumes    Remove volumes (data will be lost!)"
            echo "  --images     Remove built images"
            echo "  --all        Remove both volumes and images"
            echo "  -h, --help   Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Show current status
print_status "Current service status:"
docker-compose ps

# Stop services gracefully
print_status "Stopping services gracefully..."

# Stop in reverse dependency order
if docker-compose ps nginx | grep -q "Up"; then
    print_status "Stopping Nginx..."
    docker-compose stop nginx
fi

print_status "Stopping frontend..."
docker-compose stop frontend

print_status "Stopping API..."
docker-compose stop api

print_status "Stopping Keycloak..."
docker-compose stop keycloak

print_status "Stopping Redis..."
docker-compose stop redis

print_status "Stopping databases..."
docker-compose stop db keycloak-db

# Remove containers
print_status "Removing containers..."
docker-compose down

# Remove volumes if requested
if [ "$REMOVE_VOLUMES" = true ]; then
    print_warning "Removing volumes (data will be lost!)..."
    docker-compose down -v

    # Remove named volumes explicitly
    docker volume rm project-management_postgres_data 2>/dev/null || true
    docker volume rm project-management_redis_data 2>/dev/null || true
    docker volume rm project-management_keycloak_data 2>/dev/null || true
    docker volume rm project-management_nginx_logs 2>/dev/null || true

    print_warning "All data volumes have been removed!"
fi

# Remove images if requested
if [ "$REMOVE_IMAGES" = true ]; then
    print_status "Removing built images..."

    # Remove project-specific images
    docker rmi project-management_api 2>/dev/null || true
    docker rmi project-management_frontend 2>/dev/null || true

    # Clean up dangling images
    docker image prune -f

    print_status "Built images have been removed!"
fi

# Clean up networks
print_status "Cleaning up networks..."
docker network prune -f

print_status "Docker stack has been stopped successfully!"

# Show final status
echo ""
echo "🏁 Final Status:"
echo "   Containers: $(docker-compose ps -q | wc -l) running"
echo "   Volumes:    $(docker volume ls -q | grep project-management | wc -l) remaining"

if [ "$REMOVE_VOLUMES" = false ]; then
    echo ""
    echo "💾 Data volumes preserved. Use '--volumes' to remove data."
fi

if [ "$REMOVE_IMAGES" = false ]; then
    echo "🐳 Built images preserved. Use '--images' to remove images."
fi

echo ""
echo "💡 To restart the stack:"
echo "   ./scripts/start-stack.sh"
echo ""