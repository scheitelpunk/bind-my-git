#!/bin/bash

# Test runner script for Project Management System
echo "🧪 Running Comprehensive Test Suite for Project Management System"
echo "================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
RUN_BACKEND=true
RUN_FRONTEND=true
RUN_E2E=true
COVERAGE_THRESHOLD=70
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            RUN_BACKEND=true
            RUN_FRONTEND=false
            RUN_E2E=false
            shift
            ;;
        --frontend-only)
            RUN_BACKEND=false
            RUN_FRONTEND=true
            RUN_E2E=false
            shift
            ;;
        --e2e-only)
            RUN_BACKEND=false
            RUN_FRONTEND=false
            RUN_E2E=true
            shift
            ;;
        --threshold)
            COVERAGE_THRESHOLD="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --backend-only       Run only backend tests"
            echo "  --frontend-only      Run only frontend tests"
            echo "  --e2e-only          Run only E2E tests"
            echo "  --threshold N       Set coverage threshold (default: 70)"
            echo "  --verbose           Enable verbose output"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Start time tracking
START_TIME=$(date +%s)

# Test results tracking
BACKEND_RESULT=0
FRONTEND_RESULT=0
E2E_RESULT=0

print_status "Starting test execution with coverage threshold: ${COVERAGE_THRESHOLD}%"
echo

# Backend Tests
if [ "$RUN_BACKEND" = true ]; then
    print_status "🐍 Running Backend Tests (Python/pytest)"
    echo "----------------------------------------"

    cd backend

    # Check if virtual environment exists and activate it
    if [ -d "venv" ]; then
        print_status "Activating virtual environment..."
        source venv/bin/activate
    elif [ -d ".venv" ]; then
        print_status "Activating virtual environment..."
        source .venv/bin/activate
    else
        print_warning "No virtual environment found. Make sure dependencies are installed."
    fi

    # Install dependencies if requirements.txt exists
    if [ -f "requirements.txt" ]; then
        print_status "Installing backend dependencies..."
        pip install -r requirements.txt > /dev/null 2>&1
    fi

    # Run backend tests
    print_status "Executing backend test suite..."

    if [ "$VERBOSE" = true ]; then
        pytest --cov=src --cov-report=html:tests/coverage/html --cov-report=xml:tests/coverage/coverage.xml --cov-report=term-missing --cov-fail-under=$COVERAGE_THRESHOLD -v
    else
        pytest --cov=src --cov-report=html:tests/coverage/html --cov-report=xml:tests/coverage/coverage.xml --cov-report=term-missing --cov-fail-under=$COVERAGE_THRESHOLD -q
    fi

    BACKEND_RESULT=$?

    if [ $BACKEND_RESULT -eq 0 ]; then
        print_success "Backend tests passed with coverage ≥${COVERAGE_THRESHOLD}%"
    else
        print_error "Backend tests failed or coverage below ${COVERAGE_THRESHOLD}%"
    fi

    cd ..
    echo
fi

# Frontend Tests
if [ "$RUN_FRONTEND" = true ]; then
    print_status "⚛️  Running Frontend Tests (React/Vitest)"
    echo "----------------------------------------"

    cd frontend

    # Install dependencies
    if [ -f "package.json" ]; then
        print_status "Installing frontend dependencies..."
        npm install > /dev/null 2>&1
    fi

    # Run frontend tests
    print_status "Executing frontend test suite..."

    if [ "$VERBOSE" = true ]; then
        npm run test:coverage -- --reporter=verbose
    else
        npm run test:coverage
    fi

    FRONTEND_RESULT=$?

    if [ $FRONTEND_RESULT -eq 0 ]; then
        print_success "Frontend tests passed with coverage ≥${COVERAGE_THRESHOLD}%"
    else
        print_error "Frontend tests failed or coverage below ${COVERAGE_THRESHOLD}%"
    fi

    cd ..
    echo
fi

# E2E Tests
if [ "$RUN_E2E" = true ]; then
    print_status "🎭 Running E2E Tests (Playwright)"
    echo "--------------------------------"

    cd tests/e2e

    # Install Playwright if not already installed
    if [ ! -d "node_modules" ]; then
        print_status "Installing Playwright dependencies..."
        npm install > /dev/null 2>&1
        npx playwright install > /dev/null 2>&1
    fi

    # Run E2E tests
    print_status "Executing E2E test suite..."

    if [ "$VERBOSE" = true ]; then
        npx playwright test --reporter=list
    else
        npx playwright test --reporter=line
    fi

    E2E_RESULT=$?

    if [ $E2E_RESULT -eq 0 ]; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed"
    fi

    cd ../..
    echo
fi

# Calculate total execution time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Generate summary report
echo "========================================="
print_status "📊 Test Execution Summary"
echo "========================================="

if [ "$RUN_BACKEND" = true ]; then
    if [ $BACKEND_RESULT -eq 0 ]; then
        print_success "✅ Backend Tests: PASSED"
    else
        print_error "❌ Backend Tests: FAILED"
    fi
fi

if [ "$RUN_FRONTEND" = true ]; then
    if [ $FRONTEND_RESULT -eq 0 ]; then
        print_success "✅ Frontend Tests: PASSED"
    else
        print_error "❌ Frontend Tests: FAILED"
    fi
fi

if [ "$RUN_E2E" = true ]; then
    if [ $E2E_RESULT -eq 0 ]; then
        print_success "✅ E2E Tests: PASSED"
    else
        print_error "❌ E2E Tests: FAILED"
    fi
fi

echo
print_status "⏱️  Total execution time: ${DURATION}s"

# Coverage reports location
echo
print_status "📋 Coverage Reports:"
if [ "$RUN_BACKEND" = true ]; then
    echo "  Backend: backend/tests/coverage/html/index.html"
fi
if [ "$RUN_FRONTEND" = true ]; then
    echo "  Frontend: frontend/tests/coverage/index.html"
fi
if [ "$RUN_E2E" = true ]; then
    echo "  E2E: tests/e2e/playwright-report/index.html"
fi

# Final exit code
TOTAL_FAILURES=$((BACKEND_RESULT + FRONTEND_RESULT + E2E_RESULT))

if [ $TOTAL_FAILURES -eq 0 ]; then
    echo
    print_success "🎉 All tests passed successfully!"
    exit 0
else
    echo
    print_error "💥 Some tests failed. Please check the output above."
    exit 1
fi