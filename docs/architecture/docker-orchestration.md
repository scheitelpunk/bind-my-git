# Docker Orchestration Architecture

## Container Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Docker Network                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Nginx    │  │   React     │  │   FastAPI   │  │  Keycloak   │ │
│  │   (80/443)  │  │   (3000)    │  │   (8000)    │  │   (8080)    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ PostgreSQL  │  │    Redis    │  │   Mailhog   │  │   Volumes   │ │
│  │   (5432)    │  │   (6379)    │  │   (1025)    │  │  (Storage)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Docker Compose Configuration

### Main docker-compose.yml
```yaml
version: '3.8'

services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: pm_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/sites-available:/etc/nginx/sites-available:ro
      - ./ssl:/etc/nginx/ssl:ro
      - frontend_build:/usr/share/nginx/html
    depends_on:
      - frontend
      - backend
      - keycloak
    networks:
      - pm_network
    restart: unless-stopped

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    container_name: pm_frontend
    volumes:
      - frontend_build:/app/build
    environment:
      - REACT_APP_API_URL=https://api.localhost
      - REACT_APP_KEYCLOAK_URL=https://auth.localhost
      - REACT_APP_KEYCLOAK_REALM=project-management
      - REACT_APP_KEYCLOAK_CLIENT_ID=pm-frontend
    networks:
      - pm_network
    restart: unless-stopped

  # FastAPI Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pm_backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://pm_user:pm_password@postgres:5432/project_management
      - REDIS_URL=redis://redis:6379/0
      - KEYCLOAK_URL=http://keycloak:8080
      - KEYCLOAK_REALM=project-management
      - KEYCLOAK_CLIENT_ID=pm-backend
      - KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}
      - SECRET_KEY=${SECRET_KEY}
      - ENVIRONMENT=production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      keycloak:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    networks:
      - pm_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: pm_postgres
    environment:
      - POSTGRES_DB=project_management
      - POSTGRES_USER=pm_user
      - POSTGRES_PASSWORD=pm_password
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - pm_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pm_user -d project_management"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: pm_redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/etc/redis/redis.conf
    ports:
      - "6379:6379"
    networks:
      - pm_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Keycloak Identity Server
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    container_name: pm_keycloak
    command: start-dev
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}
      - KC_DB=postgres
      - KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
      - KC_DB_USERNAME=keycloak_user
      - KC_DB_PASSWORD=${KEYCLOAK_DB_PASSWORD}
      - KC_HOSTNAME=auth.localhost
      - KC_HTTP_ENABLED=true
      - KC_PROXY=edge
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./keycloak/themes:/opt/keycloak/themes
      - ./keycloak/realm-config.json:/opt/keycloak/data/import/realm-config.json
    networks:
      - pm_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MailHog (Development Email Testing)
  mailhog:
    image: mailhog/mailhog:latest
    container_name: pm_mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    networks:
      - pm_network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  frontend_build:
    driver: local

networks:
  pm_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Development Override (docker-compose.override.yml)
```yaml
version: '3.8'

services:
  frontend:
    build:
      target: development
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - CHOKIDAR_USEPOLLING=true
      - REACT_APP_API_URL=http://localhost:8000
      - REACT_APP_KEYCLOAK_URL=http://localhost:8080

  backend:
    volumes:
      - ./backend:/app
    environment:
      - ENVIRONMENT=development
      - DEBUG=true
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  postgres:
    environment:
      - POSTGRES_DB=project_management_dev
    ports:
      - "5433:5432"

  redis:
    ports:
      - "6380:6379"
```

## Nginx Configuration

### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Include site configurations
    include /etc/nginx/sites-available/*.conf;
}
```

### Frontend Site Configuration (sites-available/frontend.conf)
```nginx
server {
    listen 80;
    server_name app.localhost;

    # Redirect to HTTPS in production
    # return 301 https://$server_name$request_uri;

    root /usr/share/nginx/html;
    index index.html;

    # Frontend routing
    location / {
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://pm_backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support for development
    location /ws {
        proxy_pass http://pm_backend:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Keycloak Site Configuration (sites-available/keycloak.conf)
```nginx
server {
    listen 80;
    server_name auth.localhost;

    location / {
        limit_req zone=auth burst=10 nodelay;

        proxy_pass http://pm_keycloak:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Keycloak specific headers
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;

        # Buffer settings for large responses
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
```

## Dockerfile Configurations

### Frontend Dockerfile
```dockerfile
# Multi-stage build for React app
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Dockerfile
```dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN addgroup --system app && adduser --system --group app

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs && \
    chown -R app:app /app

# Switch to app user
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Environment Configuration

### .env file
```bash
# Database
POSTGRES_DB=project_management
POSTGRES_USER=pm_user
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://pm_user:your_secure_password_here@postgres:5432/project_management

# Redis
REDIS_PASSWORD=your_redis_password_here
REDIS_URL=redis://:your_redis_password_here@redis:6379/0

# Keycloak
KEYCLOAK_ADMIN_PASSWORD=your_keycloak_admin_password
KEYCLOAK_DB_PASSWORD=your_keycloak_db_password
KEYCLOAK_CLIENT_SECRET=your_keycloak_client_secret

# Application
SECRET_KEY=your_very_secure_secret_key_here
ENVIRONMENT=production

# Email (for production)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# SSL Certificates (for production)
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

## Deployment Scripts

### start.sh
```bash
#!/bin/bash
set -e

echo "Starting Project Management System..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Create necessary directories
mkdir -p logs uploads ssl

# Generate SSL certificates for development
if [ ! -f ssl/cert.pem ]; then
    echo "Generating self-signed SSL certificates..."
    openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem \
        -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"
fi

# Start services
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
docker-compose exec -T backend python -c "
import time
import psycopg2
import redis
import requests

# Wait for database
while True:
    try:
        conn = psycopg2.connect('postgresql://pm_user:pm_password@postgres:5432/project_management')
        conn.close()
        break
    except:
        time.sleep(1)

# Wait for Redis
while True:
    try:
        r = redis.Redis(host='redis', port=6379, password='pm_password')
        r.ping()
        break
    except:
        time.sleep(1)

# Wait for Keycloak
while True:
    try:
        response = requests.get('http://keycloak:8080/health')
        if response.status_code == 200:
            break
    except:
        time.sleep(1)
"

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T backend alembic upgrade head

echo "Project Management System started successfully!"
echo "Frontend: http://localhost"
echo "API: http://localhost/api"
echo "Keycloak: http://localhost:8080"
echo "MailHog: http://localhost:8025"
```

### stop.sh
```bash
#!/bin/bash
echo "Stopping Project Management System..."
docker-compose down
echo "System stopped."
```

### backup.sh
```bash
#!/bin/bash
set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "Creating database backup..."
docker-compose exec -T postgres pg_dump -U pm_user project_management > $BACKUP_DIR/database_$DATE.sql

echo "Creating uploads backup..."
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

echo "Backup completed: $BACKUP_DIR/"
```

## Monitoring and Logging

### Docker Compose Logging Configuration
```yaml
# Add to each service in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Log Aggregation with ELK Stack (Optional)
```yaml
# Additional services for logging
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    networks:
      - pm_network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    networks:
      - pm_network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    networks:
      - pm_network
```

This Docker orchestration provides a complete, scalable, and secure deployment environment for the project management system with proper service isolation, health checks, and monitoring capabilities.