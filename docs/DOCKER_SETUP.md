# Docker Orchestration Setup Guide

This document provides comprehensive instructions for running the Project Management System using Docker.

## 🏗️ Architecture Overview

The Docker setup includes the following services:

### Core Services
- **PostgreSQL Database** (`db`) - Main application database
- **Keycloak Database** (`keycloak-db`) - Separate database for Keycloak
- **Redis** (`redis`) - Caching and session storage
- **Keycloak** (`keycloak`) - Authentication and authorization server
- **Backend API** (`api`) - FastAPI backend service
- **Frontend** (`frontend`) - React frontend application

### Production Services
- **Nginx** (`nginx`) - Reverse proxy and load balancer (production profile)

## 🚀 Quick Start

### Prerequisites
- Docker 20.0+ and Docker Compose 2.0+
- At least 4GB RAM available for Docker
- Ports 3000, 5432, 6379, 8000, 8180 available

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables (optional for development)
nano .env
```

### 2. Start the Stack
```bash
# Development mode
./scripts/start-stack.sh

# Production mode with Nginx
./scripts/start-stack.sh --production
```

### 3. Access the System
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Keycloak Admin**: http://localhost:8180/admin
- **Production (Nginx)**: http://localhost

### 4. Default Credentials
- **Keycloak Admin**: admin / admin123
- **Test User**: admin@projectmanagement.local / admin123

## 📊 Service Details

### Database Services

#### PostgreSQL (`db`)
- **Port**: 5432
- **Database**: project_management
- **User**: pm_user
- **Initialization**: Runs `database/init.sql` on first start
- **Health Check**: `pg_isready` every 5 seconds
- **Volume**: `postgres_data` for persistence

#### Keycloak Database (`keycloak-db`)
- **Port**: Internal only
- **Database**: keycloak
- **User**: keycloak
- **Health Check**: `pg_isready` every 5 seconds
- **Volume**: `keycloak_data` for persistence

#### Redis (`redis`)
- **Port**: 6379
- **Persistence**: AOF (Append Only File)
- **Health Check**: `redis-cli ping` every 10 seconds
- **Volume**: `redis_data` for persistence

### Application Services

#### Keycloak (`keycloak`)
- **Port**: 8180
- **Admin UI**: http://localhost:8180/admin
- **Realm**: project-management
- **Development Mode**: Enabled for easier setup
- **Import**: Automatically imports realm configuration
- **Health Check**: `/health/ready` endpoint

#### Backend API (`api`)
- **Port**: 8000
- **Framework**: FastAPI with Uvicorn
- **Authentication**: Keycloak OIDC integration
- **Database**: PostgreSQL connection
- **Cache**: Redis integration
- **Health Check**: `/health` endpoint
- **Development**: Hot-reload enabled

#### Frontend (`frontend`)
- **Port**: 3000 (development) / 80 (production)
- **Framework**: React with Vite
- **Authentication**: Keycloak integration
- **Build**: Multi-stage Docker build
- **Production**: Served by Nginx
- **Health Check**: HTTP status check

#### Nginx (`nginx` - Production Profile)
- **Port**: 80 (HTTP) / 443 (HTTPS)
- **Role**: Reverse proxy and load balancer
- **Features**:
  - Gzip compression
  - Static asset caching
  - Security headers
  - Rate limiting
  - SSL termination (when configured)

## 🔧 Configuration

### Environment Variables

Key environment variables in `.env`:

```bash
# Database
POSTGRES_DB=project_management
POSTGRES_USER=pm_user
POSTGRES_PASSWORD=pm_password

# Keycloak
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin123
KEYCLOAK_REALM=project-management

# Application
DEBUG=false
SECRET_KEY=your-secret-key-change-in-production
```

### Docker Compose Profiles

- **Default**: Development services (db, redis, keycloak, api, frontend)
- **Production**: Includes Nginx reverse proxy

```bash
# Development
docker-compose up -d

# Production
docker-compose --profile production up -d
```

### Health Checks

All services include health checks with appropriate intervals:
- **Databases**: 5-second intervals
- **Applications**: 30-second intervals
- **Start Period**: Allows time for service initialization
- **Retries**: Configurable failure tolerance

### Networking

Services communicate through a custom bridge network (`app-network`):
- **Subnet**: 172.20.0.0/16
- **Internal Communication**: Service names as hostnames
- **External Access**: Exposed ports for development

## 🛠️ Development Workflow

### Starting Services
```bash
# Start all services
./scripts/start-stack.sh

# Start specific service
docker-compose up -d api

# View logs
docker-compose logs -f api
```

### Database Operations
```bash
# Access PostgreSQL
docker-compose exec db psql -U pm_user -d project_management

# Run migrations (if available)
docker-compose exec api python -m alembic upgrade head

# Backup database
docker-compose exec db pg_dump -U pm_user project_management > backup.sql
```

### Application Development
```bash
# Backend shell
docker-compose exec api /bin/bash

# Frontend shell
docker-compose exec frontend /bin/sh

# View real-time logs
docker-compose logs -f api frontend
```

### Keycloak Administration
```bash
# Access Keycloak admin console
# http://localhost:8180/admin

# Export realm configuration
docker-compose exec keycloak /opt/keycloak/bin/kc.sh export --realm project-management --file /tmp/realm-export.json

# Import realm configuration (automatic on startup)
# Place files in config/keycloak/import/
```

## 🔒 Security Considerations

### Development Security
- Default passwords (change in production)
- HTTP connections (use HTTPS in production)
- Debug mode enabled
- Exposed database ports

### Production Security
- Environment-specific secrets
- SSL/TLS encryption
- Security headers (implemented)
- Rate limiting (configured)
- Network isolation
- Non-root containers

### Best Practices
1. **Secrets Management**: Use Docker secrets or external secret management
2. **Network Security**: Limit exposed ports
3. **Container Security**: Regular image updates
4. **Access Control**: Implement proper authentication
5. **Monitoring**: Use logging and monitoring solutions

## 📈 Monitoring and Logging

### Log Management
```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f api

# Log rotation configuration
# Implemented in docker-compose.yml (10MB max, 3 files)
```

### Service Monitoring
```bash
# Check service status
docker-compose ps

# View resource usage
docker stats

# Health check status
docker-compose exec api curl http://localhost:8000/health
```

### Performance Monitoring
- Resource usage tracking
- Response time monitoring
- Database performance metrics
- Cache hit ratios

## 🚨 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :8000

# Stop conflicting services
sudo systemctl stop postgresql  # if using system PostgreSQL
```

#### Database Connection Issues
```bash
# Check database status
docker-compose logs db

# Test connection
docker-compose exec api python -c "import psycopg2; print('DB OK')"
```

#### Keycloak Issues
```bash
# Check Keycloak logs
docker-compose logs keycloak

# Verify realm import
docker-compose exec keycloak ls -la /opt/keycloak/data/import/
```

#### Service Startup Order
```bash
# Use startup script for proper sequencing
./scripts/start-stack.sh

# Or manual startup with dependencies
docker-compose up -d db redis
sleep 10
docker-compose up -d keycloak
sleep 30
docker-compose up -d api frontend
```

### Recovery Procedures

#### Complete Reset
```bash
# Stop and remove everything
./scripts/stop-stack.sh --all

# Restart from scratch
./scripts/start-stack.sh
```

#### Data Recovery
```bash
# Backup volumes before reset
docker run --rm -v project-management_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v project-management_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```

## 🔄 Maintenance

### Regular Updates
```bash
# Update base images
docker-compose pull

# Rebuild with latest changes
docker-compose build --no-cache

# Prune unused resources
docker system prune -f
```

### Backup Strategy
1. **Database Backups**: Regular PostgreSQL dumps
2. **Volume Backups**: Docker volume snapshots
3. **Configuration Backups**: Environment and config files
4. **Application Backups**: Source code versioning

### Scaling Considerations
- **Horizontal Scaling**: Multiple API instances behind load balancer
- **Database Scaling**: Read replicas for read-heavy workloads
- **Cache Scaling**: Redis clustering for high availability
- **Storage Scaling**: Network-attached storage for volumes

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Keycloak Docker Guide](https://www.keycloak.org/server/containers)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Nginx Docker Guide](https://hub.docker.com/_/nginx)
- [FastAPI Docker Deployment](https://fastapi.tiangolo.com/deployment/docker/)

---

For more detailed information about specific components, refer to the individual service documentation in the respective directories.