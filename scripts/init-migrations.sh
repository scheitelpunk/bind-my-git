#!/bin/bash

# Initialize Alembic migrations for Project Management System
# This script sets up the migration environment and creates the initial migration

set -e

echo "🚀 Initializing Alembic migrations for Project Management System"

# Navigate to the backend directory
cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Set up environment variables for migration
export DATABASE_URL="${DATABASE_URL:-postgresql://pm_user:pm_password@localhost:5432/project_management}"
export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend"

echo "📂 Setting up migration environment..."

# Create Alembic configuration if it doesn't exist
if [ ! -f "backend/alembic.ini" ]; then
    echo "Creating Alembic configuration..."
    cd backend
    python -m alembic init migrations
    cd ..
else
    echo "✅ Alembic configuration already exists"
fi

# Check if migrations directory exists
if [ ! -d "backend/migrations" ]; then
    echo "📁 Creating migrations directory..."
    mkdir -p backend/migrations/versions
fi

# Update alembic.ini with correct database URL
echo "🔧 Updating Alembic configuration..."
sed -i.bak "s|sqlalchemy.url = driver://user:pass@localhost/dbname|sqlalchemy.url = ${DATABASE_URL}|g" backend/alembic.ini

# Update env.py to include our models
cat > backend/migrations/env.py << 'EOF'
"""Alembic environment configuration for Project Management System"""

from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all models to ensure they're registered with SQLAlchemy
from database.connection import Base
from models.user import User, Role
from models.project import Project
from models.task import Task, Comment
from models.time_entry import TimeEntry

# This is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate support
target_metadata = Base.metadata

def get_url():
    """Get database URL from environment or config"""
    return os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url"))

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
EOF

# Create script.py.mako template if it doesn't exist
if [ ! -f "backend/migrations/script.py.mako" ]; then
    cat > backend/migrations/script.py.mako << 'EOF'
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
EOF
fi

echo "🔍 Checking if database is accessible..."

# Function to check database connectivity
check_database() {
    python -c "
import sys
sys.path.insert(0, 'backend')
try:
    from sqlalchemy import create_engine
    from config.settings import get_settings
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute('SELECT 1')
        print('✅ Database connection successful')
        sys.exit(0)
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    print('💡 Make sure PostgreSQL is running and accessible')
    print('💡 You can start the database with: docker-compose up -d db')
    sys.exit(1)
"
}

# Check database connectivity
if check_database; then
    echo "📝 Creating initial migration..."

    cd backend

    # Check if any migrations already exist
    if [ "$(ls -A migrations/versions/ 2>/dev/null)" ]; then
        echo "⚠️  Migration files already exist. Skipping initial migration creation."
        echo "   If you want to recreate migrations, delete the files in migrations/versions/ first."
    else
        # Create the initial migration
        python -m alembic revision --autogenerate -m "Initial database schema"

        if [ $? -eq 0 ]; then
            echo "✅ Initial migration created successfully"

            # Show the created migration file
            latest_migration=$(ls -t migrations/versions/*.py | head -n1)
            if [ -f "$latest_migration" ]; then
                echo "📄 Created migration file: $latest_migration"
                echo "🔍 Migration preview:"
                echo "----------------------------------------"
                head -20 "$latest_migration"
                echo "----------------------------------------"
            fi
        else
            echo "❌ Failed to create initial migration"
            exit 1
        fi
    fi

    cd ..
else
    echo "⚠️  Skipping migration creation due to database connectivity issues"
    echo "💡 You can run this script again once the database is available"
fi

echo ""
echo "📋 Migration Setup Summary:"
echo "  ✅ Alembic configuration: backend/alembic.ini"
echo "  ✅ Migration environment: backend/migrations/env.py"
echo "  ✅ Migration template: backend/migrations/script.py.mako"
echo "  📁 Migration files: backend/migrations/versions/"
echo ""
echo "🔧 Next steps:"
echo "  1. Start your database: docker-compose up -d db"
echo "  2. Apply migrations: cd backend && python -m alembic upgrade head"
echo "  3. Load seed data: psql \$DATABASE_URL -f ../scripts/seed-data.sql"
echo ""
echo "📖 Common migration commands:"
echo "  • Create migration: python -m alembic revision --autogenerate -m 'description'"
echo "  • Apply migrations: python -m alembic upgrade head"
echo "  • Rollback one step: python -m alembic downgrade -1"
echo "  • Show migration history: python -m alembic history"
echo "  • Show current version: python -m alembic current"
echo ""
echo "✅ Migration initialization complete!"