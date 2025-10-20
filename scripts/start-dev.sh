#!/bin/bash

# Development startup script

echo "Starting Project Management API in development mode..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo "Please edit .env file with your actual configuration values"
fi

# Start services with docker-compose
echo "Starting database and Redis..."
docker-compose up -d db redis

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
cd src
python -m alembic upgrade head
cd ..

# Start API server
echo "Starting API server..."
cd src
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload