# Database Setup and Troubleshooting Guide

## Overview

This project uses PostgreSQL as the primary database with the following configuration:
- Database Name: `project_management`
- User: `pm_user`
- Password: `pm_password`
- Port: `5432`

## Docker Compose Configuration

The database service in `docker-compose.yml` is configured with:

1. **Environment Variables:**
   - `POSTGRES_DB=project_management` - Creates the database
   - `POSTGRES_USER=pm_user` - Creates the user
   - `POSTGRES_PASSWORD=pm_password` - Sets the password

2. **Initialization Scripts:**
   - `00-setup.sql` - Ensures proper permissions
   - `01-init.sql` - Creates tables and indexes

3. **Health Check:**
   - Tests connection to the specific database
   - Extended retry period for initialization

## Common Issues and Solutions

### Issue: "database 'pm_user' does not exist"

This error occurs when the application tries to connect to a database named "pm_user" instead of "project_management".

**Solution:**
1. Verify the `DATABASE_URL` in your environment matches:
   ```
   postgresql://pm_user:pm_password@db:5432/project_management
   ```

2. Check that your application configuration uses the correct database name.

### Issue: Connection refused or timeout

**Solution:**
1. Ensure Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs db
   ```

3. Wait for database initialization (can take 30-60 seconds on first run)

### Issue: Permission denied or authentication failed

**Solution:**
1. Verify environment variables match between services
2. Rebuild containers if credentials changed:
   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

## Testing Database Connection

Use the provided test script:
```bash
./scripts/test-db-connection.sh
```

Or manually test:
```bash
# Test from host
docker-compose exec db psql -U pm_user -d project_management -c "SELECT version();"

# Test from API container
docker-compose exec api python -c "
import os
import psycopg2
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
print('Connection successful!')
conn.close()
"
```

## Database Schema

The database includes:
- **users** - User profiles synchronized with Keycloak
- **roles** - Role definitions
- **projects** - Project management
- **tasks** - Task tracking
- **time_entries** - Time tracking with overlap prevention
- **comments** - Task comments

## Environment Variables

Ensure these variables are set correctly:

```env
DATABASE_URL=postgresql://pm_user:pm_password@db:5432/project_management
POSTGRES_DB=project_management
POSTGRES_USER=pm_user
POSTGRES_PASSWORD=pm_password
```

## Initialization Process

1. PostgreSQL container starts
2. Environment variables create database and user
3. `00-setup.sql` sets permissions
4. `01-init.sql` creates schema
5. Health check verifies connection
6. API service starts after health check passes

## Troubleshooting Commands

```bash
# View all containers
docker-compose ps

# Check database logs
docker-compose logs db

# Check API logs
docker-compose logs api

# Connect to database directly
docker-compose exec db psql -U pm_user -d project_management

# Restart database service
docker-compose restart db

# Rebuild with fresh database
docker-compose down -v && docker-compose up --build
```

## Volume Management

The database uses a named volume `postgres_data` to persist data.

To reset the database completely:
```bash
docker-compose down -v
docker volume rm projektmanagement-flow_postgres_data
docker-compose up
```