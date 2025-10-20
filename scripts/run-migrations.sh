#!/bin/bash

# Database migration script

echo "Running Alembic migrations..."

cd src

# Create migration if message provided
if [ ! -z "$1" ]; then
    echo "Creating new migration: $1"
    python -m alembic revision --autogenerate -m "$1"
fi

# Run migrations
echo "Applying migrations..."
python -m alembic upgrade head

echo "Migrations completed!"