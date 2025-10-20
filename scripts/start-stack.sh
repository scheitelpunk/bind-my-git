#!/bin/bash

# Project Management System - Docker Stack Startup Script
# This script starts the complete Docker stack with proper sequencing

set -e

echo "🚀 Starting Project Management System Docker Stack..."

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

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    print_error "docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Copying from .env.example..."
    cp .env.example .env
    print_warning "Please review and update the .env file with your configuration."
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p config/keycloak/import
mkdir -p config/nginx/conf.d
mkdir -p config/ssl
mkdir -p logs

# Build and start services in proper order
print_status "Building Docker images..."
docker-compose build --parallel

print_status "Starting database services..."
docker-compose up -d keycloak-db db redis

print_status "Waiting for databases to be ready..."
sleep 10

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to be ready..."
until docker-compose exec -T db pg_isready -U pm_user -d project_management; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done
echo "PostgreSQL is ready!"

# Wait for Keycloak DB to be ready
print_status "Waiting for Keycloak DB to be ready..."
until docker-compose exec -T keycloak-db pg_isready -U keycloak -d keycloak; do
    echo "Keycloak DB is unavailable - sleeping"
    sleep 2
done
echo "Keycloak DB is ready!"

print_status "Starting Keycloak..."
docker-compose up -d keycloak

print_status "Waiting for Keycloak to be ready..."
until curl -f http://localhost:8180/health/ready >/dev/null 2>&1; do
    echo "Keycloak is unavailable - sleeping"
    sleep 5
done
echo "Keycloak is ready!"

print_status "Starting backend API..."
docker-compose up -d api

print_status "Waiting for API to be ready..."
until curl -f http://localhost:8000/health >/dev/null 2>&1; do
    echo "API is unavailable - sleeping"
    sleep 3
done
echo "API is ready!"

print_status "Starting frontend..."
docker-compose up -d frontend

print_status "Waiting for frontend to be ready..."
until curl -f http://localhost:3000/health >/dev/null 2>&1; do
    echo "Frontend is unavailable - sleeping"
    sleep 3
done
echo "Frontend is ready!"

# Optional: Start nginx reverse proxy for production
if [[ "${1:-}" == "--production" ]]; then
    print_status "Starting Nginx reverse proxy..."
    docker-compose --profile production up -d nginx

    print_status "Waiting for Nginx to be ready..."
    until curl -f http://localhost/health >/dev/null 2>&1; do
        echo "Nginx is unavailable - sleeping"
        sleep 2
    done
    echo "Nginx is ready!"
fi

print_status "All services are up and running!"

# Display service URLs
echo ""
echo "🎉 Project Management System is ready!"
echo ""
echo "📋 Service URLs:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000"
echo "   Keycloak:     http://localhost:8180"
echo "   PostgreSQL:   localhost:5432"
echo "   Redis:        localhost:6379"

if [[ "${1:-}" == "--production" ]]; then
    echo "   Nginx Proxy:  http://localhost"
fi

echo ""
echo "🔑 Default Admin Credentials:"
echo "   Keycloak Admin: admin / admin123"
echo "   Test User:      admin@projectmanagement.local / admin123"
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "💡 Useful Commands:"
echo "   View logs:       docker-compose logs -f [service]"
echo "   Stop all:        docker-compose down"
echo "   Restart service: docker-compose restart [service]"
echo "   Shell access:    docker-compose exec [service] /bin/sh"
echo ""