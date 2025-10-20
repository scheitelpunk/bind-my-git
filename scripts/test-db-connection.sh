#!/bin/bash

# Test database connection script
# This script verifies that the PostgreSQL database is properly set up

echo "Testing PostgreSQL database connection..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
until docker-compose exec -T db pg_isready -U pm_user -d project_management; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - testing connection..."

# Test connection and verify database exists
docker-compose exec -T db psql -U pm_user -d project_management -c "\l" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database 'project_management' exists and is accessible"
else
    echo "❌ Failed to connect to database 'project_management'"
    exit 1
fi

# Test that tables exist
echo "Checking if tables are created..."
TABLE_COUNT=$(docker-compose exec -T db psql -U pm_user -d project_management -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo "✅ Database tables found: $TABLE_COUNT tables"
    echo "📋 Tables in database:"
    docker-compose exec -T db psql -U pm_user -d project_management -c "\dt"
else
    echo "❌ No tables found in database"
    exit 1
fi

echo "✅ Database setup verification complete!"