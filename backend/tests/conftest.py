"""
Shared test fixtures and configuration
"""
import os
import sys
import uuid
from datetime import datetime, date
from typing import Generator, Dict, Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Add parent directory to path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.connection import Base, get_db_session
from main import app
from models.user import User
from models.project import Project
from models.task import Task
from models.customers import Customer
from models.orders import Order
from models.items import Item


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database session override"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db_session] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_user_payload() -> Dict[str, Any]:
    """Mock JWT token payload for testing"""
    return {
        "sub": "test-user-123",
        "preferred_username": "testuser",
        "email": "test@example.com",
        "email_verified": True,
        "name": "Test User",
        "given_name": "Test",
        "family_name": "User",
        "realm_access": {
            "roles": ["developer", "user"]
        },
        "resource_access": {
            "pm-backend": {
                "roles": ["backend_user"]
            }
        },
        "groups": ["/developers"],
        "session_state": "test-session-123",
        "iat": 1234567890,
        "exp": 1234567890 + 3600,
        "iss": "http://localhost:8180/realms/project-management",
        "nbf": 1234567890
    }


@pytest.fixture
def mock_admin_payload() -> Dict[str, Any]:
    """Mock JWT token payload for admin user"""
    return {
        "sub": "admin-user-123",
        "preferred_username": "adminuser",
        "email": "admin@example.com",
        "email_verified": True,
        "name": "Admin User",
        "given_name": "Admin",
        "family_name": "User",
        "realm_access": {
            "roles": ["admin", "developer", "user"]
        },
        "resource_access": {
            "pm-backend": {
                "roles": ["backend_admin"]
            }
        },
        "groups": ["/admins"],
        "session_state": "admin-session-123",
        "iat": 1234567890,
        "exp": 1234567890 + 3600,
        "iss": "http://localhost:8180/realms/project-management",
        "nbf": 1234567890
    }


@pytest.fixture
def sample_user(db_session: Session) -> User:
    """Create a sample user in the database"""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        keycloak_id="test-user-123",
        first_name="Test",
        last_name="User",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_admin_user(db_session: Session) -> User:
    """Create a sample admin user in the database"""
    user = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        keycloak_id="admin-user-123",
        first_name="Admin",
        last_name="User",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_customer(db_session: Session) -> Customer:
    """Create a sample customer in the database"""
    customer = Customer(
        id=uuid.uuid4(),
        customer_name="Test Customer",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


@pytest.fixture
def sample_order(db_session: Session, sample_customer: Customer) -> Order:
    """Create a sample order in the database"""
    order = Order(
        id=uuid.uuid4(),
        order_id="ORD-001",
        description="Test order description",
        comment="Test comment",
        customer_id=sample_customer.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


@pytest.fixture
def sample_project(db_session: Session, sample_user: User, sample_order: Order) -> Project:
    """Create a sample project in the database"""
    project = Project(
        id=uuid.uuid4(),
        name="Test Project",
        description="A test project",
        owner_id=sample_user.id,
        order_id=sample_order.id,
        status="active",
        start_date=date.today(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def sample_task(db_session: Session, sample_project: Project, sample_user: User) -> Task:
    """Create a sample task in the database"""
    task = Task(
        id=uuid.uuid4(),
        title="Test Task",
        description="A test task",
        project_id=sample_project.id,
        assigned_to=sample_user.id,
        created_by=sample_user.id,
        status="todo",
        priority="medium",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task
