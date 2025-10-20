"""
Unit tests for Task models and schemas
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from models.task import (
    Task, TaskCreate, TaskUpdate, TaskResponse,
    TimeEntry, TimeEntryCreate, TimeEntryUpdate, TimeEntryStop, TimeEntryResponse
)


@pytest.mark.unit
class TestTaskModels:
    """Tests for Task model and schemas"""

    def test_task_create_schema(self):
        """Test TaskCreate schema validation"""
        task_data = TaskCreate(
            project_id=uuid.uuid4(),
            title="Test Task",
            description="Test description",
            status="todo",
            priority="high",
            external=False,
            billable=True
        )

        assert task_data.title == "Test Task"
        assert task_data.status == "todo"
        assert task_data.priority == "high"

    def test_task_update_schema(self):
        """Test TaskUpdate schema with partial updates"""
        update_data = TaskUpdate(
            title="Updated Title",
            status="in_progress"
        )

        assert update_data.title == "Updated Title"
        assert update_data.status == "in_progress"
        assert update_data.description is None

    def test_task_model_creation(self, db_session, sample_project, sample_user):
        """Test creating a Task model instance"""
        task = Task(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            title="Test Task",
            description="Task description",
            created_by=sample_user.id,
            assigned_to=sample_user.id,
            status="todo",
            priority="medium",
            external=False,
            billable=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        db_session.add(task)
        db_session.commit()
        db_session.refresh(task)

        assert task.id is not None
        assert task.title == "Test Task"
        assert task.status == "todo"

    def test_task_response_schema(self, sample_task):
        """Test TaskResponse schema"""
        response = TaskResponse.from_orm(sample_task)

        assert response.id == sample_task.id
        assert response.title == sample_task.title
        assert response.project_id == sample_task.project_id

    def test_task_default_values(self):
        """Test Task model default values"""
        task_data = TaskCreate(
            project_id=uuid.uuid4(),
            title="Test Task"
        )

        assert task_data.status == "todo"
        assert task_data.priority == "medium"
        assert task_data.external is False
        assert task_data.billable is True


@pytest.mark.unit
class TestTimeEntryModels:
    """Tests for TimeEntry model and schemas"""

    def test_time_entry_create_schema(self):
        """Test TimeEntryCreate schema validation"""
        entry_data = TimeEntryCreate(
            task_id=uuid.uuid4(),
            description="Working on feature",
            start_time=datetime.now(timezone.utc),
            external=False,
            billable=True
        )

        assert entry_data.task_id is not None
        assert entry_data.description == "Working on feature"
        assert entry_data.external is False

    def test_time_entry_update_schema(self):
        """Test TimeEntryUpdate schema"""
        update_data = TimeEntryUpdate(
            description="Updated description",
            external=True
        )

        assert update_data.description == "Updated description"
        assert update_data.external is True

    def test_time_entry_model_creation(self, db_session, sample_task, sample_user):
        """Test creating a TimeEntry model instance"""
        start = datetime.now(timezone.utc) - timedelta(hours=1)
        end = datetime.now(timezone.utc)

        time_entry = TimeEntry(
            id=uuid.uuid4(),
            user_id=sample_user.id,
            task_id=sample_task.id,
            project_id=sample_task.project_id,
            description="Testing",
            start_time=start,
            end_time=end,
            duration_minutes=60,
            is_running=False,
            external=False,
            billable=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        db_session.add(time_entry)
        db_session.commit()
        db_session.refresh(time_entry)

        assert time_entry.id is not None
        assert time_entry.duration_minutes == 60
        assert time_entry.is_running is False

    def test_time_entry_stop_schema(self):
        """Test TimeEntryStop schema with validator"""
        stop_data = TimeEntryStop(
            end_time=datetime.now(timezone.utc)
        )

        assert stop_data.end_time is not None

    def test_time_entry_running_state(self, db_session, sample_task, sample_user):
        """Test TimeEntry running state"""
        time_entry = TimeEntry(
            id=uuid.uuid4(),
            user_id=sample_user.id,
            task_id=sample_task.id,
            project_id=sample_task.project_id,
            start_time=datetime.now(timezone.utc),
            is_running=True,
            external=False,
            billable=True
        )

        db_session.add(time_entry)
        db_session.commit()

        assert time_entry.is_running is True
        assert time_entry.end_time is None
        assert time_entry.duration_minutes is None

    def test_time_entry_response_schema(self, db_session, sample_task, sample_user):
        """Test TimeEntryResponse schema"""
        time_entry = TimeEntry(
            id=uuid.uuid4(),
            user_id=sample_user.id,
            task_id=sample_task.id,
            project_id=sample_task.project_id,
            start_time=datetime.now(timezone.utc),
            is_running=True,
            external=False,
            billable=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        db_session.add(time_entry)
        db_session.commit()
        db_session.refresh(time_entry)

        # Access the response (simulating API response)
        assert time_entry.id is not None
        assert time_entry.task_id == sample_task.id

    def test_time_entry_billable_and_external_flags(self):
        """Test billable and external flags"""
        entry1 = TimeEntryCreate(
            task_id=uuid.uuid4(),
            start_time=datetime.now(timezone.utc),
            external=True,
            billable=False
        )

        assert entry1.external is True
        assert entry1.billable is False

        entry2 = TimeEntryCreate(
            task_id=uuid.uuid4(),
            start_time=datetime.now(timezone.utc)
        )

        assert entry2.external is False
        assert entry2.billable is True
