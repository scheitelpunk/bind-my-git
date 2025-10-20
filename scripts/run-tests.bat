@echo off
setlocal enabledelayedexpansion

REM Test runner script for Project Management System (Windows)
echo 🧪 Running Comprehensive Test Suite for Project Management System
echo =================================================================

REM Default values
set RUN_BACKEND=true
set RUN_FRONTEND=true
set RUN_E2E=true
set COVERAGE_THRESHOLD=70
set VERBOSE=false

REM Parse command line arguments
:parse_args
if "%~1"=="" goto start_tests
if "%~1"=="--backend-only" (
    set RUN_BACKEND=true
    set RUN_FRONTEND=false
    set RUN_E2E=false
    shift & goto parse_args
)
if "%~1"=="--frontend-only" (
    set RUN_BACKEND=false
    set RUN_FRONTEND=true
    set RUN_E2E=false
    shift & goto parse_args
)
if "%~1"=="--e2e-only" (
    set RUN_BACKEND=false
    set RUN_FRONTEND=false
    set RUN_E2E=true
    shift & goto parse_args
)
if "%~1"=="--threshold" (
    set COVERAGE_THRESHOLD=%~2
    shift & shift & goto parse_args
)
if "%~1"=="--verbose" (
    set VERBOSE=true
    shift & goto parse_args
)
if "%~1"=="--help" (
    echo Usage: %0 [OPTIONS]
    echo Options:
    echo   --backend-only       Run only backend tests
    echo   --frontend-only      Run only frontend tests
    echo   --e2e-only          Run only E2E tests
    echo   --threshold N       Set coverage threshold (default: 70)
    echo   --verbose           Enable verbose output
    echo   --help              Show this help message
    exit /b 0
)
echo [ERROR] Unknown option: %~1
exit /b 1

:start_tests
set START_TIME=%TIME%
set BACKEND_RESULT=0
set FRONTEND_RESULT=0
set E2E_RESULT=0

echo [INFO] Starting test execution with coverage threshold: %COVERAGE_THRESHOLD%%%
echo.

REM Backend Tests
if "%RUN_BACKEND%"=="true" (
    echo [INFO] 🐍 Running Backend Tests (Python/pytest)
    echo ----------------------------------------

    cd backend

    REM Check if virtual environment exists and activate it
    if exist "venv\Scripts\activate.bat" (
        echo [INFO] Activating virtual environment...
        call venv\Scripts\activate.bat
    ) else if exist ".venv\Scripts\activate.bat" (
        echo [INFO] Activating virtual environment...
        call .venv\Scripts\activate.bat
    ) else (
        echo [WARNING] No virtual environment found. Make sure dependencies are installed.
    )

    REM Install dependencies if requirements.txt exists
    if exist "requirements.txt" (
        echo [INFO] Installing backend dependencies...
        pip install -r requirements.txt >nul 2>&1
    )

    REM Run backend tests
    echo [INFO] Executing backend test suite...

    if "%VERBOSE%"=="true" (
        pytest --cov=src --cov-report=html:tests/coverage/html --cov-report=xml:tests/coverage/coverage.xml --cov-report=term-missing --cov-fail-under=%COVERAGE_THRESHOLD% -v
    ) else (
        pytest --cov=src --cov-report=html:tests/coverage/html --cov-report=xml:tests/coverage/coverage.xml --cov-report=term-missing --cov-fail-under=%COVERAGE_THRESHOLD% -q
    )

    set BACKEND_RESULT=!ERRORLEVEL!

    if !BACKEND_RESULT! equ 0 (
        echo [SUCCESS] Backend tests passed with coverage ≥%COVERAGE_THRESHOLD%%%
    ) else (
        echo [ERROR] Backend tests failed or coverage below %COVERAGE_THRESHOLD%%%
    )

    cd ..
    echo.
)

REM Frontend Tests
if "%RUN_FRONTEND%"=="true" (
    echo [INFO] ⚛️  Running Frontend Tests (React/Vitest)
    echo ----------------------------------------

    cd frontend

    REM Install dependencies
    if exist "package.json" (
        echo [INFO] Installing frontend dependencies...
        npm install >nul 2>&1
    )

    REM Run frontend tests
    echo [INFO] Executing frontend test suite...

    if "%VERBOSE%"=="true" (
        npm run test:coverage -- --reporter=verbose
    ) else (
        npm run test:coverage
    )

    set FRONTEND_RESULT=!ERRORLEVEL!

    if !FRONTEND_RESULT! equ 0 (
        echo [SUCCESS] Frontend tests passed with coverage ≥%COVERAGE_THRESHOLD%%%
    ) else (
        echo [ERROR] Frontend tests failed or coverage below %COVERAGE_THRESHOLD%%%
    )

    cd ..
    echo.
)

REM E2E Tests
if "%RUN_E2E%"=="true" (
    echo [INFO] 🎭 Running E2E Tests (Playwright)
    echo --------------------------------

    cd tests\e2e

    REM Install Playwright if not already installed
    if not exist "node_modules" (
        echo [INFO] Installing Playwright dependencies...
        npm install >nul 2>&1
        npx playwright install >nul 2>&1
    )

    REM Run E2E tests
    echo [INFO] Executing E2E test suite...

    if "%VERBOSE%"=="true" (
        npx playwright test --reporter=list
    ) else (
        npx playwright test --reporter=line
    )

    set E2E_RESULT=!ERRORLEVEL!

    if !E2E_RESULT! equ 0 (
        echo [SUCCESS] E2E tests passed
    ) else (
        echo [ERROR] E2E tests failed
    )

    cd ..\..
    echo.
)

REM Generate summary report
echo =========================================
echo [INFO] 📊 Test Execution Summary
echo =========================================

if "%RUN_BACKEND%"=="true" (
    if !BACKEND_RESULT! equ 0 (
        echo [SUCCESS] ✅ Backend Tests: PASSED
    ) else (
        echo [ERROR] ❌ Backend Tests: FAILED
    )
)

if "%RUN_FRONTEND%"=="true" (
    if !FRONTEND_RESULT! equ 0 (
        echo [SUCCESS] ✅ Frontend Tests: PASSED
    ) else (
        echo [ERROR] ❌ Frontend Tests: FAILED
    )
)

if "%RUN_E2E%"=="true" (
    if !E2E_RESULT! equ 0 (
        echo [SUCCESS] ✅ E2E Tests: PASSED
    ) else (
        echo [ERROR] ❌ E2E Tests: FAILED
    )
)

echo.
echo [INFO] 📋 Coverage Reports:
if "%RUN_BACKEND%"=="true" (
    echo   Backend: backend\tests\coverage\html\index.html
)
if "%RUN_FRONTEND%"=="true" (
    echo   Frontend: frontend\tests\coverage\index.html
)
if "%RUN_E2E%"=="true" (
    echo   E2E: tests\e2e\playwright-report\index.html
)

REM Final exit code
set /a TOTAL_FAILURES=%BACKEND_RESULT%+%FRONTEND_RESULT%+%E2E_RESULT%

if !TOTAL_FAILURES! equ 0 (
    echo.
    echo [SUCCESS] 🎉 All tests passed successfully!
    exit /b 0
) else (
    echo.
    echo [ERROR] 💥 Some tests failed. Please check the output above.
    exit /b 1
)