#!/bin/bash

# Database startup script for Project Management System
# This script ensures the database is properly initialized and running

set -e

echo "🚀 Starting Project Management Database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update if needed."
fi

echo "🔧 Starting database service..."
docker-compose up -d db

echo "⏳ Waiting for database to be ready (this may take 30-60 seconds)..."
timeout=60
counter=0

while ! docker-compose exec -T db pg_isready -U pm_user -d project_management > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ Database failed to start within $timeout seconds"
        echo "📋 Checking logs:"
        docker-compose logs db
        exit 1
    fi

    echo -n "."
    sleep 2
    counter=$((counter + 2))
done

echo ""
echo "✅ Database is ready!"

# Verify database setup
echo "🔍 Verifying database setup..."
TABLE_COUNT=$(docker-compose exec -T db psql -U pm_user -d project_management -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d ' ')

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo "✅ Database initialized with $TABLE_COUNT tables"
else
    echo "⚠️  Database exists but no tables found. This might be expected on first run."
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 Database Status:"
echo "   - Host: localhost"
echo "   - Port: 5432"
echo "   - Database: project_management"
echo "   - User: pm_user"
echo ""
echo "📋 Useful commands:"
echo "   - View logs: docker-compose logs db"
echo "   - Connect to DB: docker-compose exec db psql -U pm_user -d project_management"
echo "   - Stop database: docker-compose stop db"
echo "   - Reset database: docker-compose down -v && docker-compose up -d db"