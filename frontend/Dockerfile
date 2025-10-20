# Development stage
FROM node:22-alpine as development

WORKDIR /app

# Install system dependencies for development
RUN apk add --no-cache curl python3 make g++

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci 

# Copy source code
COPY . .

# Expose port for development
EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Development command
CMD ["npm", "run", "dev"]

# Build stage
FROM node:22-alpine as builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (dev dependencies needed for build)
RUN npm ci && npm cache clean --force

# Copy source code (dockerignore will exclude unnecessary files)
COPY . .

# Build-time environment variables (can be overridden)
ARG VITE_API_URL=http://localhost:8080/api
ARG VITE_KEYCLOAK_URL=http://localhost:8180
ARG VITE_KEYCLOAK_REALM=project-management
ARG VITE_KEYCLOAK_CLIENT_ID=project-management-frontend

ENV NODE_ENV=production
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

# Build the application with comprehensive error handling
RUN set -e && \
    echo "Starting build process..." && \
    npm run build && \
    echo "Build completed. Checking output..." && \
    ls -la dist/ && \
    test -f dist/index.html && \
    echo "Build verification successful!"

# Production stage
FROM nginx:alpine as production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl nodejs npm

# Copy source code
COPY . .

RUN npm ci && npm cache clean --force

# Copy built assets from builder stage (Vite builds to 'dist' directory)
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add a script to inject runtime environment variables
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create env-config.js file
RUN touch /usr/share/nginx/html/env-config.js

# Create non-root user for security
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-user -g nginx-user nginx-user

# Set ownership
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
#CMD ["nginx", "-g", "daemon off;"]
# Development command
CMD ["npm", "run", "dev", "--", "--host"]