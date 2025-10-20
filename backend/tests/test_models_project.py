"""
Unit tests for Project models and schemas
"""
import pytest
import uuid
from datetime import date, datetime
from models.project import (
    Project, ProjectBase, ProjectCreate, ProjectUpdate,
    ProjectResponse, PaginatedResponse
)


@pytest.mark.unit
class TestProjectModels:
    """Tests for Project models and schemas"""

    def test_project_create_schema(self):
        """Test ProjectCreate schema validation"""
        project_data = ProjectCreate(
            name="Test Project",
            description="A test project",
            start_date=date.today(),
            order_id=uuid.uuid4()
        )

        assert project_data.name == "Test Project"
        assert project_data.description == "A test project"
        assert project_data.start_date == date.today()
        assert project_data.end_date is None
        assert project_data.members is None

    def test_project_create_schema_with_members(self):
        """Test ProjectCreate schema with members"""
        member_ids = [uuid.uuid4(), uuid.uuid4()]
        project_data = ProjectCreate(
            name="Test Project",
            start_date=date.today(),
            order_id=uuid.uuid4(),
            members=member_ids
        )

        assert project_data.members == member_ids

    def test_project_update_schema(self):
        """Test ProjectUpdate schema with optional fields"""
        update_data = ProjectUpdate(
            name="Updated Project",
            status="completed"
        )

        assert update_data.name == "Updated Project"
        assert update_data.status == "completed"
        assert update_data.description is None
        assert update_data.start_date is None

    def test_project_update_schema_all_fields(self):
        """Test ProjectUpdate schema with all fields"""
        update_data = ProjectUpdate(
            name="Updated Project",
            description="Updated description",
            status="completed",
            start_date=date.today(),
            end_date=date.today(),
            customer_id=uuid.uuid4(),
            order_id=uuid.uuid4()
        )

        assert update_data.name == "Updated Project"
        assert update_data.description == "Updated description"
        assert update_data.status == "completed"

    def test_project_model_creation(self, db_session, sample_user, sample_order):
        """Test creating a Project model instance"""
        project = Project(
            id=uuid.uuid4(),
            name="Test Project",
            description="Test description",
            owner_id=sample_user.id,
            order_id=sample_order.id,
            status="active",
            start_date=date.today()
        )

        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)

        assert project.id is not None
        assert project.name == "Test Project"
        assert project.owner_id == sample_user.id
        assert project.order_id == sample_order.id
        assert project.status == "active"

    def test_project_response_schema(self, sample_project):
        """Test ProjectResponse schema from model"""
        response = ProjectResponse.model_validate(sample_project)

        assert response.id == sample_project.id
        assert response.name == sample_project.name
        assert response.owner_id == sample_project.owner_id
        assert response.order_id == sample_project.order_id
        assert response.status == "active"
        assert hasattr(response, 'total_hours')

    def test_project_response_total_hours_calculation(self, db_session, sample_project):
        """Test ProjectResponse calculates total_hours"""
        response = ProjectResponse.model_validate(sample_project)

        # New project should have 0 hours
        assert response.total_hours == 0.0

    def test_paginated_response_schema(self, sample_project):
        """Test PaginatedResponse schema"""
        projects = [ProjectResponse.model_validate(sample_project)]

        paginated = PaginatedResponse[ProjectResponse](
            data=projects,
            page=0,
            size=10,
            totalElements=1,
            totalPages=1,
            hasNext=False,
            hasPrevious=False
        )

        assert len(paginated.data) == 1
        assert paginated.page == 0
        assert paginated.size == 10
        assert paginated.totalElements == 1
        assert paginated.totalPages == 1
        assert paginated.hasNext is False
        assert paginated.hasPrevious is False

    def test_paginated_response_navigation(self):
        """Test PaginatedResponse navigation flags"""
        paginated = PaginatedResponse[ProjectResponse](
            data=[],
            page=1,
            size=10,
            totalElements=25,
            totalPages=3,
            hasNext=True,
            hasPrevious=True
        )

        assert paginated.hasNext is True
        assert paginated.hasPrevious is True

    def test_project_relationships(self, sample_project, sample_user):
        """Test Project relationships"""
        assert sample_project.owner is not None
        assert sample_project.owner.id == sample_user.id
        assert sample_project.tasks is not None
        assert isinstance(sample_project.tasks, list)

    def test_project_default_status(self, db_session, sample_user, sample_order):
        """Test Project default status is 'active'"""
        project = Project(
            id=uuid.uuid4(),
            name="Test Project",
            owner_id=sample_user.id,
            order_id=sample_order.id,
            start_date=date.today()
        )

        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)

        assert project.status == "active"

    def test_project_timestamps(self, sample_project):
        """Test Project has timestamps"""
        assert sample_project.created_at is not None
        assert sample_project.updated_at is not None
        assert isinstance(sample_project.created_at, datetime)
        assert isinstance(sample_project.updated_at, datetime)
