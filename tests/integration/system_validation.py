#!/usr/bin/env python3
"""
System Integration Verification Script
Validates all components of the Project Management System
"""

import requests
import psycopg2
import time
import json
from datetime import datetime
import subprocess
import sys

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

class SystemValidator:
    def __init__(self):
        self.results = {}
        self.start_time = datetime.now()

    def log(self, message, status="INFO"):
        color = Colors.BLUE
        if status == "SUCCESS":
            color = Colors.GREEN
        elif status == "ERROR":
            color = Colors.RED
        elif status == "WARNING":
            color = Colors.YELLOW

        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"{color}[{timestamp}] {status}: {message}{Colors.ENDC}")

    def test_container_health(self):
        """Check if all Docker containers are running"""
        self.log("Checking Docker container health", "INFO")
        try:
            result = subprocess.run(['docker', 'ps', '--format', 'table {{.Names}}\\t{{.Status}}'],
                                 capture_output=True, text=True)
            if result.returncode == 0:
                containers = result.stdout.strip().split('\n')[1:]  # Skip header
                self.results['containers'] = {
                    'status': 'SUCCESS' if containers else 'ERROR',
                    'count': len(containers),
                    'details': containers
                }
                if containers:
                    self.log(f"Found {len(containers)} running containers", "SUCCESS")
                    for container in containers:
                        self.log(f"  {container}", "INFO")
                else:
                    self.log("No containers running", "ERROR")
            else:
                self.results['containers'] = {'status': 'ERROR', 'message': 'Docker not accessible'}
                self.log("Docker not accessible", "ERROR")
        except Exception as e:
            self.results['containers'] = {'status': 'ERROR', 'message': str(e)}
            self.log(f"Container check failed: {e}", "ERROR")

    def test_frontend_accessibility(self):
        """Test if frontend is accessible"""
        self.log("Testing frontend accessibility", "INFO")
        try:
            response = requests.get('http://localhost:3000', timeout=10)
            if response.status_code == 200:
                self.results['frontend'] = {
                    'status': 'SUCCESS',
                    'response_code': response.status_code,
                    'response_time': response.elapsed.total_seconds()
                }
                self.log(f"Frontend accessible (HTTP {response.status_code})", "SUCCESS")
            else:
                self.results['frontend'] = {
                    'status': 'WARNING',
                    'response_code': response.status_code,
                    'message': f'Unexpected status code: {response.status_code}'
                }
                self.log(f"Frontend returned HTTP {response.status_code}", "WARNING")
        except requests.exceptions.ConnectionError:
            self.results['frontend'] = {'status': 'ERROR', 'message': 'Connection refused'}
            self.log("Frontend not accessible - connection refused", "ERROR")
        except requests.exceptions.Timeout:
            self.results['frontend'] = {'status': 'ERROR', 'message': 'Request timeout'}
            self.log("Frontend request timeout", "ERROR")
        except Exception as e:
            self.results['frontend'] = {'status': 'ERROR', 'message': str(e)}
            self.log(f"Frontend test failed: {e}", "ERROR")

    def test_backend_api(self):
        """Test backend API connectivity"""
        self.log("Testing backend API connectivity", "INFO")
        endpoints = [
            ('/health', 'Health check'),
            ('/api/health', 'API health check'),
            ('/docs', 'API documentation'),
            ('/api/projects', 'Projects endpoint')
        ]

        api_results = {}
        for endpoint, description in endpoints:
            try:
                response = requests.get(f'http://localhost:8000{endpoint}', timeout=5)
                api_results[endpoint] = {
                    'status': 'SUCCESS' if response.status_code < 400 else 'WARNING',
                    'response_code': response.status_code,
                    'response_time': response.elapsed.total_seconds()
                }
                status = "SUCCESS" if response.status_code < 400 else "WARNING"
                self.log(f"{description}: HTTP {response.status_code}", status)
            except requests.exceptions.ConnectionError:
                api_results[endpoint] = {'status': 'ERROR', 'message': 'Connection refused'}
                self.log(f"{description}: Connection refused", "ERROR")
            except Exception as e:
                api_results[endpoint] = {'status': 'ERROR', 'message': str(e)}
                self.log(f"{description}: {e}", "ERROR")

        # Overall backend status
        backend_status = 'SUCCESS'
        if any(result['status'] == 'ERROR' for result in api_results.values()):
            backend_status = 'ERROR'
        elif any(result['status'] == 'WARNING' for result in api_results.values()):
            backend_status = 'WARNING'

        self.results['backend'] = {
            'status': backend_status,
            'endpoints': api_results
        }

    def test_keycloak_accessibility(self):
        """Test Keycloak accessibility"""
        self.log("Testing Keycloak accessibility", "INFO")
        endpoints = [
            ('/', 'Keycloak root'),
            ('/auth', 'Auth endpoint'),
            ('/auth/realms/project-management', 'Project management realm')
        ]

        keycloak_results = {}
        for endpoint, description in endpoints:
            try:
                response = requests.get(f'http://localhost:8180{endpoint}', timeout=10)
                keycloak_results[endpoint] = {
                    'status': 'SUCCESS' if response.status_code < 400 else 'WARNING',
                    'response_code': response.status_code,
                    'response_time': response.elapsed.total_seconds()
                }
                status = "SUCCESS" if response.status_code < 400 else "WARNING"
                self.log(f"{description}: HTTP {response.status_code}", status)
            except requests.exceptions.ConnectionError:
                keycloak_results[endpoint] = {'status': 'ERROR', 'message': 'Connection refused'}
                self.log(f"{description}: Connection refused", "ERROR")
            except Exception as e:
                keycloak_results[endpoint] = {'status': 'ERROR', 'message': str(e)}
                self.log(f"{description}: {e}", "ERROR")

        # Overall Keycloak status
        keycloak_status = 'SUCCESS'
        if any(result['status'] == 'ERROR' for result in keycloak_results.values()):
            keycloak_status = 'ERROR'
        elif any(result['status'] == 'WARNING' for result in keycloak_results.values()):
            keycloak_status = 'WARNING'

        self.results['keycloak'] = {
            'status': keycloak_status,
            'endpoints': keycloak_results
        }

    def test_database_connectivity(self):
        """Test database connectivity"""
        self.log("Testing database connectivity", "INFO")
        try:
            conn = psycopg2.connect(
                host='localhost',
                port=5432,
                database='project_management',
                user='pm_user',
                password='pm_password',
                connect_timeout=10
            )

            cursor = conn.cursor()
            cursor.execute('SELECT version();')
            version = cursor.fetchone()[0]

            # Test basic operations
            cursor.execute('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s;', ('public',))
            table_count = cursor.fetchone()[0]

            cursor.close()
            conn.close()

            self.results['database'] = {
                'status': 'SUCCESS',
                'version': version,
                'table_count': table_count
            }
            self.log(f"Database connected successfully", "SUCCESS")
            self.log(f"PostgreSQL version: {version}", "INFO")
            self.log(f"Tables found: {table_count}", "INFO")

        except psycopg2.OperationalError as e:
            self.results['database'] = {'status': 'ERROR', 'message': 'Connection failed', 'error': str(e)}
            self.log(f"Database connection failed: {e}", "ERROR")
        except Exception as e:
            self.results['database'] = {'status': 'ERROR', 'message': str(e)}
            self.log(f"Database test failed: {e}", "ERROR")

    def test_redis_connectivity(self):
        """Test Redis connectivity"""
        self.log("Testing Redis connectivity", "INFO")
        try:
            import redis
            r = redis.Redis(host='localhost', port=6379, db=0, socket_connect_timeout=10)
            r.ping()

            # Test basic operations
            r.set('test_key', 'test_value', ex=60)
            value = r.get('test_key')
            r.delete('test_key')

            self.results['redis'] = {
                'status': 'SUCCESS',
                'ping': True,
                'read_write': value == b'test_value'
            }
            self.log("Redis connected successfully", "SUCCESS")

        except ImportError:
            self.results['redis'] = {'status': 'WARNING', 'message': 'Redis client not installed'}
            self.log("Redis client not installed - skipping test", "WARNING")
        except Exception as e:
            self.results['redis'] = {'status': 'ERROR', 'message': str(e)}
            self.log(f"Redis test failed: {e}", "ERROR")

    def generate_report(self):
        """Generate comprehensive system health report"""
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()

        self.log("="*60, "INFO")
        self.log(f"{Colors.BOLD}SYSTEM INTEGRATION VALIDATION REPORT{Colors.ENDC}", "INFO")
        self.log("="*60, "INFO")

        overall_status = "SUCCESS"
        total_tests = len(self.results)
        passed_tests = 0

        for component, result in self.results.items():
            status = result.get('status', 'UNKNOWN')
            if status == 'SUCCESS':
                passed_tests += 1
                self.log(f"{component.upper()}: ✅ PASSED", "SUCCESS")
            elif status == 'WARNING':
                self.log(f"{component.upper()}: ⚠️ WARNING", "WARNING")
                overall_status = "WARNING" if overall_status == "SUCCESS" else overall_status
            else:
                self.log(f"{component.upper()}: ❌ FAILED", "ERROR")
                overall_status = "ERROR"

        self.log("-"*60, "INFO")
        self.log(f"Tests completed: {passed_tests}/{total_tests}", "INFO")
        self.log(f"Duration: {duration:.2f} seconds", "INFO")
        self.log(f"Overall Status: {overall_status}", "SUCCESS" if overall_status == "SUCCESS" else "ERROR")

        # Save detailed report
        report = {
            'timestamp': end_time.isoformat(),
            'duration_seconds': duration,
            'overall_status': overall_status,
            'summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'success_rate': (passed_tests / total_tests) * 100 if total_tests > 0 else 0
            },
            'results': self.results
        }

        with open('/mnt/c/dev/coding/Projektmanagement-flow/tests/integration_report.json', 'w') as f:
            json.dump(report, f, indent=2, default=str)

        self.log("Detailed report saved to tests/integration_report.json", "INFO")
        return overall_status

    def run_all_tests(self):
        """Run all integration tests"""
        self.log(f"{Colors.BOLD}Starting System Integration Validation{Colors.ENDC}", "INFO")
        self.log(f"Timestamp: {self.start_time}", "INFO")

        tests = [
            self.test_container_health,
            self.test_database_connectivity,
            self.test_redis_connectivity,
            self.test_keycloak_accessibility,
            self.test_backend_api,
            self.test_frontend_accessibility
        ]

        for test in tests:
            try:
                test()
            except Exception as e:
                self.log(f"Test {test.__name__} failed with exception: {e}", "ERROR")
            time.sleep(1)  # Brief pause between tests

        return self.generate_report()

def main():
    """Main entry point"""
    if len(sys.argv) > 1 and sys.argv[1] == '--wait':
        print("Waiting 30 seconds for services to start...")
        time.sleep(30)

    validator = SystemValidator()
    status = validator.run_all_tests()

    # Exit with appropriate code
    exit_code = 0 if status == "SUCCESS" else 1
    sys.exit(exit_code)

if __name__ == "__main__":
    main()