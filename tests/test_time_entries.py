"""
Test suite for time entries API with overlap prevention
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database.connection import Base, get_db_session
from backend.models.user import User, Role
from backend.models.project import Project
from backend.models.task import Task
from backend.models.time_entry import TimeEntry

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db_session] = override_get_db

client = TestClient(app)


@pytest.fixture
def db_session():
    """Create a test database session"""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    user = User(
        keycloak_id="test-user-123",
        email="test@example.com",
        first_name="Test",
        last_name="User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_project(db_session, test_user):
    """Create a test project"""
    project = Project(
        name="Test Project",
        description="Test project description",
        owner_id=test_user.id,
        status="active"
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def test_task(db_session, test_project, test_user):
    """Create a test task"""
    task = Task(
        project_id=test_project.id,
        title="Test Task",
        description="Test task description",
        created_by=test_user.id,
        assigned_to=test_user.id,
        status="todo"
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task


@pytest.fixture
def auth_headers():
    """Mock authentication headers"""
    return {"Authorization": "Bearer test-token"}


class TestTimeEntries:
    """Test cases for time entries API"""

    def test_start_time_entry(self, db_session, test_task, auth_headers):
        """Test starting a new time entry"""
        response = client.post(
            "/api/v1/time-entries/",
            json={
                "task_id": str(test_task.id),
                "description": "Working on test task"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == str(test_task.id)
        assert data["is_running"] is True
        assert data["description"] == "Working on test task"

    def test_start_time_entry_with_existing_running(self, db_session, test_task, test_user, auth_headers):
        """Test starting a time entry when another is already running"""
        # Create a running time entry
        existing_entry = TimeEntry(
            user_id=test_user.id,
            task_id=test_task.id,
            project_id=test_task.project_id,
            start_time=datetime.now(timezone.utc),
            is_running=True
        )
        db_session.add(existing_entry)
        db_session.commit()

        # Try to start another entry
        response = client.post(
            "/api/v1/time-entries/",
            json={
                "task_id": str(test_task.id),
                "description": "Another entry"
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "running" in response.json()["detail"].lower()

    def test_stop_time_entry(self, db_session, test_task, test_user, auth_headers):
        """Test stopping a running time entry"""
        # Create a running time entry
        start_time = datetime.now(timezone.utc)
        time_entry = TimeEntry(
            user_id=test_user.id,
            task_id=test_task.id,
            project_id=test_task.project_id,
            start_time=start_time,
            is_running=True
        )
        db_session.add(time_entry)
        db_session.commit()
        db_session.refresh(time_entry)

        # Stop the entry
        end_time = start_time + timedelta(hours=2)
        response = client.put(
            f"/api/v1/time-entries/{time_entry.id}/stop",
            json={"end_time": end_time.isoformat()},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_running"] is False
        assert data["duration_minutes"] == 120

    def test_overlap_prevention(self, db_session, test_task, test_user, auth_headers):
        """Test that overlapping time entries are prevented"""
        # Create a completed time entry
        start_time1 = datetime.now(timezone.utc)
        end_time1 = start_time1 + timedelta(hours=2)

        time_entry1 = TimeEntry(
            user_id=test_user.id,
            task_id=test_task.id,
            project_id=test_task.project_id,
            start_time=start_time1,
            end_time=end_time1,
            duration_minutes=120,
            is_running=False
        )
        db_session.add(time_entry1)
        db_session.commit()

        # Try to create an overlapping entry
        overlap_start = start_time1 + timedelta(minutes=30)
        response = client.post(
            "/api/v1/time-entries/",
            json={
                "task_id": str(test_task.id),
                "start_time": overlap_start.isoformat()
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "overlap" in response.json()["detail"].lower()

    def test_get_running_time_entry(self, db_session, test_task, test_user, auth_headers):
        """Test getting the currently running time entry"""
        # Create a running time entry
        time_entry = TimeEntry(
            user_id=test_user.id,
            task_id=test_task.id,
            project_id=test_task.project_id,
            start_time=datetime.now(timezone.utc),
            is_running=True
        )
        db_session.add(time_entry)
        db_session.commit()

        response = client.get("/api/v1/time-entries/running", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(time_entry.id)
        assert data["is_running"] is True

    def test_get_time_entries_list(self, db_session, test_task, test_user, auth_headers):
        """Test getting list of time entries"""
        # Create multiple time entries
        for i in range(3):
            start_time = datetime.now(timezone.utc) - timedelta(days=i)
            end_time = start_time + timedelta(hours=1)

            time_entry = TimeEntry(
                user_id=test_user.id,
                task_id=test_task.id,
                project_id=test_task.project_id,
                start_time=start_time,
                end_time=end_time,
                duration_minutes=60,
                is_running=False
            )
            db_session.add(time_entry)
        db_session.commit()

        response = client.get("/api/v1/time-entries/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_get_time_summary(self, db_session, test_task, test_user, auth_headers):
        """Test getting time summary by date"""
        # Create time entries for today
        today = datetime.now(timezone.utc).date()
        start_time = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)

        for i in range(2):
            entry_start = start_time + timedelta(hours=i*2)
            entry_end = entry_start + timedelta(hours=1)

            time_entry = TimeEntry(
                user_id=test_user.id,
                task_id=test_task.id,
                project_id=test_task.project_id,
                start_time=entry_start,
                end_time=entry_end,
                duration_minutes=60,
                is_running=False
            )
            db_session.add(time_entry)
        db_session.commit()

        response = client.get("/api/v1/time-entries/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        daily_summary = next((item for item in data if item["date"] == str(today)), None)
        assert daily_summary is not None
        assert daily_summary["total_minutes"] == 120
        assert daily_summary["total_hours"] == 2.0
        assert daily_summary["entries_count"] == 2

    def test_delete_time_entry(self, db_session, test_task, test_user, auth_headers):
        """Test deleting a time entry"""
        time_entry = TimeEntry(
            user_id=test_user.id,
            task_id=test_task.id,
            project_id=test_task.project_id,
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc) + timedelta(hours=1),
            duration_minutes=60,
            is_running=False
        )
        db_session.add(time_entry)
        db_session.commit()

        response = client.delete(f"/api/v1/time-entries/{time_entry.id}", headers=auth_headers)
        assert response.status_code == 200

        # Verify deletion
        db_session.refresh(time_entry)
        deleted_entry = db_session.query(TimeEntry).filter(TimeEntry.id == time_entry.id).first()
        assert deleted_entry is None


if __name__ == "__main__":
    pytest.main([__file__])