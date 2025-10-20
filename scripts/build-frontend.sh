#!/bin/bash

# Frontend Docker Build Script
# This script builds the frontend Docker image with proper error handling and logging

set -e

# Configuration
IMAGE_NAME="project-management-frontend"
BUILD_CONTEXT="/mnt/c/dev/coding/Projektmanagement-flow/frontend"
DOCKERFILE_PATH="$BUILD_CONTEXT/Dockerfile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS] [TARGET]"
    echo ""
    echo "Options:"
    echo "  -h, --help                 Show this help message"
    echo "  -t, --tag TAG             Tag for the Docker image (default: latest)"
    echo "  -e, --env-file FILE       Environment file for build args"
    echo "  --no-cache                Build without cache"
    echo "  --build-arg KEY=VALUE     Pass build arguments"
    echo ""
    echo "Targets:"
    echo "  development               Build development stage"
    echo "  production                Build production stage (default)"
    echo "  builder                   Build only the builder stage"
    echo ""
    echo "Examples:"
    echo "  $0                        # Build production image"
    echo "  $0 development            # Build development image"
    echo "  $0 -t v1.0.0 production  # Build production with tag v1.0.0"
    echo "  $0 --no-cache             # Build without cache"
}

# Default values
TARGET="production"
TAG="latest"
CACHE_FLAG=""
BUILD_ARGS=""
ENV_FILE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -e|--env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --no-cache)
            CACHE_FLAG="--no-cache"
            shift
            ;;
        --build-arg)
            BUILD_ARGS="$BUILD_ARGS --build-arg $2"
            shift 2
            ;;
        development|production|builder)
            TARGET="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate build context
if [[ ! -d "$BUILD_CONTEXT" ]]; then
    log_error "Build context directory not found: $BUILD_CONTEXT"
    exit 1
fi

if [[ ! -f "$DOCKERFILE_PATH" ]]; then
    log_error "Dockerfile not found: $DOCKERFILE_PATH"
    exit 1
fi

# Load environment file if specified
if [[ -n "$ENV_FILE" ]] && [[ -f "$ENV_FILE" ]]; then
    log_info "Loading environment variables from $ENV_FILE"
    while IFS= read -r line; do
        if [[ $line =~ ^[A-Z_][A-Z0-9_]*= ]]; then
            key=$(echo "$line" | cut -d= -f1)
            value=$(echo "$line" | cut -d= -f2-)
            BUILD_ARGS="$BUILD_ARGS --build-arg $key=$value"
        fi
    done < "$ENV_FILE"
fi

# Build Docker image
log_info "Starting Docker build process..."
log_info "Image: $IMAGE_NAME:$TAG"
log_info "Target: $TARGET"
log_info "Build context: $BUILD_CONTEXT"

# Construct Docker build command
DOCKER_CMD="docker build $CACHE_FLAG $BUILD_ARGS --target $TARGET -t $IMAGE_NAME:$TAG -f $DOCKERFILE_PATH $BUILD_CONTEXT"

log_info "Running: $DOCKER_CMD"

# Execute build
if eval "$DOCKER_CMD"; then
    log_success "Docker build completed successfully!"

    # Show image information
    log_info "Image details:"
    docker images "$IMAGE_NAME:$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}\t{{.Size}}"

    # For production builds, suggest running the container
    if [[ "$TARGET" == "production" ]]; then
        log_info "To run the container:"
        echo "  docker run -d -p 80:80 --name ${IMAGE_NAME}-container $IMAGE_NAME:$TAG"
    elif [[ "$TARGET" == "development" ]]; then
        log_info "To run the development container:"
        echo "  docker run -d -p 3000:3000 -v $(pwd)/src:/app/src --name ${IMAGE_NAME}-dev $IMAGE_NAME:$TAG"
    fi

else
    log_error "Docker build failed!"
    exit 1
fi

# Optional: Test the built image
if [[ "$TARGET" == "production" ]]; then
    log_info "Testing built image..."

    # Start container temporarily for testing
    CONTAINER_ID=$(docker run -d -p 8080:80 "$IMAGE_NAME:$TAG")

    # Wait a moment for container to start
    sleep 5

    # Test health endpoint
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        log_success "Health check passed!"
    else
        log_warning "Health check failed - container might need more time to start"
    fi

    # Clean up test container
    docker stop "$CONTAINER_ID" >/dev/null 2>&1
    docker rm "$CONTAINER_ID" >/dev/null 2>&1

    log_info "Test container cleaned up"
fi

log_success "Build process completed!"