#!/usr/bin/env python3
"""
Database Integration Test Script
Tests database connectivity, schema validation, and basic operations
"""

import sys
import os
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from sqlalchemy import create_engine, text, inspect
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.exc import SQLAlchemyError
    from config.settings import get_settings
    from database.connection import Base, engine, SessionLocal
    from models.user import User, Role
    from models.project import Project
    from models.task import Task
    from models.time_entry import TimeEntry
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Make sure you're running this from the project root and dependencies are installed")
    sys.exit(1)

class DatabaseValidator:
    def __init__(self):
        self.settings = get_settings()
        self.engine = engine
        self.session_factory = SessionLocal
        self.test_results = []

    def add_result(self, test_name: str, success: bool, message: str = ""):
        """Add test result"""
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message
        })
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message}")

    def test_database_connectivity(self) -> bool:
        """Test basic database connectivity"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1")).scalar()
                if result == 1:
                    self.add_result("Database Connectivity", True, "Successfully connected to database")
                    return True
                else:
                    self.add_result("Database Connectivity", False, f"Unexpected result: {result}")
                    return False
        except Exception as e:
            self.add_result("Database Connectivity", False, f"Connection failed: {e}")
            return False

    def test_database_version(self) -> bool:
        """Test PostgreSQL version and extensions"""
        try:
            with self.engine.connect() as conn:
                # Check PostgreSQL version
                version_result = conn.execute(text("SELECT version()")).scalar()
                print(f"📊 Database Version: {version_result}")

                # Check if required extensions are available
                extensions = conn.execute(text("""
                    SELECT extname FROM pg_extension
                    WHERE extname IN ('uuid-ossp', 'btree_gist')
                """)).fetchall()

                available_extensions = [ext[0] for ext in extensions]
                required_extensions = ['uuid-ossp', 'btree_gist']

                missing_extensions = set(required_extensions) - set(available_extensions)
                if missing_extensions:
                    self.add_result("Database Extensions", False,
                                  f"Missing extensions: {list(missing_extensions)}")
                    return False
                else:
                    self.add_result("Database Extensions", True,
                                  f"Required extensions available: {available_extensions}")
                    return True

        except Exception as e:
            self.add_result("Database Version Check", False, f"Version check failed: {e}")
            return False

    def test_table_structure(self) -> bool:
        """Test that all required tables exist with correct structure"""
        try:
            inspector = inspect(self.engine)

            # Expected tables
            expected_tables = {
                'users', 'roles', 'user_roles', 'projects', 'project_members',
                'tasks', 'time_entries', 'comments'
            }

            # Get actual tables
            actual_tables = set(inspector.get_table_names())

            # Check if all expected tables exist
            missing_tables = expected_tables - actual_tables
            if missing_tables:
                self.add_result("Table Structure", False,
                              f"Missing tables: {list(missing_tables)}")
                return False

            # Check specific table columns
            table_checks = {
                'users': ['id', 'keycloak_id', 'email', 'first_name', 'last_name'],
                'time_entries': ['id', 'user_id', 'task_id', 'project_id', 'start_time', 'is_running'],
                'projects': ['id', 'name', 'owner_id', 'status'],
                'tasks': ['id', 'project_id', 'title', 'status', 'priority']
            }

            for table_name, required_columns in table_checks.items():
                columns = [col['name'] for col in inspector.get_columns(table_name)]
                missing_columns = set(required_columns) - set(columns)
                if missing_columns:
                    self.add_result(f"Table {table_name} Columns", False,
                                  f"Missing columns: {list(missing_columns)}")
                    return False

            self.add_result("Table Structure", True,
                          f"All {len(expected_tables)} tables with required columns exist")
            return True

        except Exception as e:
            self.add_result("Table Structure", False, f"Structure check failed: {e}")
            return False

    def test_foreign_key_constraints(self) -> bool:
        """Test foreign key constraints"""
        try:
            inspector = inspect(self.engine)

            # Check foreign keys for critical tables
            fk_checks = {
                'tasks': [('project_id', 'projects'), ('assigned_to', 'users'), ('created_by', 'users')],
                'time_entries': [('user_id', 'users'), ('task_id', 'tasks'), ('project_id', 'projects')],
                'project_members': [('project_id', 'projects'), ('user_id', 'users')],
                'user_roles': [('user_id', 'users'), ('role_id', 'roles')]
            }

            for table_name, expected_fks in fk_checks.items():
                foreign_keys = inspector.get_foreign_keys(table_name)
                fk_info = [(fk['constrained_columns'][0], fk['referred_table'])
                          for fk in foreign_keys]

                for column, ref_table in expected_fks:
                    if (column, ref_table) not in fk_info:
                        self.add_result("Foreign Key Constraints", False,
                                      f"Missing FK: {table_name}.{column} -> {ref_table}")
                        return False

            self.add_result("Foreign Key Constraints", True, "All foreign key constraints verified")
            return True

        except Exception as e:
            self.add_result("Foreign Key Constraints", False, f"FK check failed: {e}")
            return False

    def test_indexes(self) -> bool:
        """Test that performance indexes exist"""
        try:
            with self.engine.connect() as conn:
                # Check for critical indexes
                index_query = text("""
                    SELECT schemaname, tablename, indexname
                    FROM pg_indexes
                    WHERE schemaname = 'public'
                    AND indexname LIKE 'idx_%'
                """)

                indexes = conn.execute(index_query).fetchall()
                index_names = [idx[2] for idx in indexes]

                # Critical indexes that should exist
                critical_indexes = [
                    'idx_users_email',
                    'idx_users_keycloak_id',
                    'idx_time_entries_user',
                    'idx_time_entries_running',
                    'idx_projects_owner'
                ]

                missing_indexes = [idx for idx in critical_indexes if idx not in index_names]
                if missing_indexes:
                    self.add_result("Performance Indexes", False,
                                  f"Missing indexes: {missing_indexes}")
                else:
                    self.add_result("Performance Indexes", True,
                                  f"Found {len(index_names)} indexes including all critical ones")
                return len(missing_indexes) == 0

        except Exception as e:
            self.add_result("Performance Indexes", False, f"Index check failed: {e}")
            return False

    def test_triggers_and_functions(self) -> bool:
        """Test database triggers and functions"""
        try:
            with self.engine.connect() as conn:
                # Check for critical functions
                functions_query = text("""
                    SELECT proname FROM pg_proc
                    WHERE proname IN ('prevent_time_overlap', 'update_duration', 'update_updated_at_column')
                """)

                functions = conn.execute(functions_query).fetchall()
                function_names = [func[0] for func in functions]

                expected_functions = ['prevent_time_overlap', 'update_duration', 'update_updated_at_column']
                missing_functions = set(expected_functions) - set(function_names)

                if missing_functions:
                    self.add_result("Database Functions", False,
                                  f"Missing functions: {list(missing_functions)}")
                    return False

                # Check for triggers
                triggers_query = text("""
                    SELECT tgname FROM pg_trigger
                    WHERE tgname LIKE 'trigger_%' OR tgname LIKE 'update_%'
                """)

                triggers = conn.execute(triggers_query).fetchall()
                trigger_names = [trig[0] for trig in triggers]

                self.add_result("Database Functions", True,
                              f"Functions: {function_names}, Triggers: {len(trigger_names)}")
                return True

        except Exception as e:
            self.add_result("Database Functions", False, f"Function/trigger check failed: {e}")
            return False

    def test_sqlalchemy_models(self) -> bool:
        """Test SQLAlchemy model creation and basic operations"""
        try:
            # Test model metadata
            tables = Base.metadata.tables
            model_tables = set(tables.keys())

            expected_model_tables = {'users', 'roles', 'projects', 'tasks', 'time_entries', 'comments'}

            missing_model_tables = expected_model_tables - model_tables
            if missing_model_tables:
                self.add_result("SQLAlchemy Models", False,
                              f"Missing model tables: {list(missing_model_tables)}")
                return False

            # Test session creation
            session = self.session_factory()
            try:
                # Test basic query
                count = session.query(User).count()
                self.add_result("SQLAlchemy Models", True,
                              f"Models working, user count: {count}")
                return True
            finally:
                session.close()

        except Exception as e:
            self.add_result("SQLAlchemy Models", False, f"Model test failed: {e}")
            return False

    def test_data_integrity(self) -> bool:
        """Test data integrity with sample operations"""
        session = self.session_factory()
        try:
            # Test role data
            admin_role = session.query(Role).filter(Role.name == 'admin').first()
            if not admin_role:
                self.add_result("Data Integrity", False, "Default admin role not found")
                return False

            # Test constraint checking with invalid data
            try:
                # Try to create user with invalid keycloak_id
                duplicate_user = User(
                    keycloak_id='test-duplicate',
                    email='test@example.com',
                    first_name='Test',
                    last_name='User'
                )
                session.add(duplicate_user)
                session.flush()

                # Try to create another user with same keycloak_id (should fail)
                duplicate_user2 = User(
                    keycloak_id='test-duplicate',  # Same keycloak_id
                    email='test2@example.com',
                    first_name='Test2',
                    last_name='User2'
                )
                session.add(duplicate_user2)
                session.flush()

                # If we get here, constraint didn't work
                session.rollback()
                self.add_result("Data Integrity", False, "Uniqueness constraints not working")
                return False

            except SQLAlchemyError:
                # This is expected - constraint should prevent duplicate
                session.rollback()
                self.add_result("Data Integrity", True, "Uniqueness constraints working properly")
                return True

        except Exception as e:
            session.rollback()
            self.add_result("Data Integrity", False, f"Integrity test failed: {e}")
            return False
        finally:
            session.close()

    def test_time_overlap_prevention(self) -> bool:
        """Test time entry overlap prevention logic"""
        session = self.session_factory()
        try:
            # Find or create a test user
            test_user = session.query(User).first()
            if not test_user:
                self.add_result("Time Overlap Prevention", False, "No users found for testing")
                return False

            # Find or create a test project and task
            test_project = session.query(Project).first()
            test_task = session.query(Task).first()

            if not test_project or not test_task:
                self.add_result("Time Overlap Prevention", False,
                              "No projects/tasks found for testing")
                return False

            # Clean up any existing running entries for test user
            session.query(TimeEntry).filter(
                TimeEntry.user_id == test_user.id,
                TimeEntry.is_running == True
            ).delete()
            session.commit()

            # Test 1: Create a running time entry
            start_time = datetime.now()
            time_entry1 = TimeEntry(
                user_id=test_user.id,
                task_id=test_task.id,
                project_id=test_project.id,
                start_time=start_time,
                is_running=True,
                description="Test overlap prevention entry 1"
            )
            session.add(time_entry1)
            session.flush()

            # Test 2: Try to create overlapping running entry (should fail)
            try:
                time_entry2 = TimeEntry(
                    user_id=test_user.id,
                    task_id=test_task.id,
                    project_id=test_project.id,
                    start_time=start_time + timedelta(minutes=30),
                    is_running=True,
                    description="Test overlap prevention entry 2"
                )
                session.add(time_entry2)
                session.flush()

                # If we get here, overlap prevention didn't work
                session.rollback()
                self.add_result("Time Overlap Prevention", False,
                              "Multiple running entries allowed (should be prevented)")
                return False

            except SQLAlchemyError as e:
                # This is expected - overlap should be prevented
                session.rollback()

                # Clean up
                session.query(TimeEntry).filter(
                    TimeEntry.user_id == test_user.id,
                    TimeEntry.description.like("Test overlap prevention%")
                ).delete()
                session.commit()

                self.add_result("Time Overlap Prevention", True,
                              "Overlap prevention working correctly")
                return True

        except Exception as e:
            session.rollback()
            self.add_result("Time Overlap Prevention", False, f"Test failed: {e}")
            return False
        finally:
            session.close()

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all database validation tests"""
        print("🔍 Starting Database Integration Validation...")
        print("=" * 60)

        # Run tests in order
        tests = [
            self.test_database_connectivity,
            self.test_database_version,
            self.test_table_structure,
            self.test_foreign_key_constraints,
            self.test_indexes,
            self.test_triggers_and_functions,
            self.test_sqlalchemy_models,
            self.test_data_integrity,
            self.test_time_overlap_prevention
        ]

        success_count = 0
        for test in tests:
            try:
                if test():
                    success_count += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} crashed: {e}")

        print("=" * 60)
        print(f"📊 Test Results: {success_count}/{len(tests)} tests passed")

        # Generate summary
        summary = {
            'total_tests': len(tests),
            'passed_tests': success_count,
            'failed_tests': len(tests) - success_count,
            'success_rate': (success_count / len(tests)) * 100,
            'results': self.test_results
        }

        if success_count == len(tests):
            print("✅ All database integration tests passed!")
        else:
            print(f"⚠️  {len(tests) - success_count} tests failed")
            print("🔧 Review the failed tests and fix issues before proceeding")

        return summary

def main():
    """Main test runner"""
    try:
        validator = DatabaseValidator()
        results = validator.run_all_tests()

        # Exit with appropriate code
        if results['failed_tests'] > 0:
            sys.exit(1)
        else:
            sys.exit(0)

    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Test runner crashed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()