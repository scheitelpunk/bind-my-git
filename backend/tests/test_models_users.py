"""
Unit tests for User models and schemas
"""
import pytest
import uuid
from datetime import datetime, timezone
from models.user import User, UserResponse


@pytest.mark.unit
class TestUserModels:
    """Tests for User model and schemas"""

    def test_user_model_creation(self, db_session):
        """Test creating a User model instance"""
        user = User(
            id=uuid.uuid4(),
            keycloak_id="test-keycloak-123",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.id is not None
        assert user.keycloak_id == "test-keycloak-123"
        assert user.email == "test@example.com"
        assert user.is_active is True

    def test_user_response_schema(self, sample_user):
        """Test UserResponse schema"""
        response = UserResponse.from_orm(sample_user)

        assert response.id == sample_user.id
        assert response.email == sample_user.email
        assert response.first_name == sample_user.first_name
        assert response.last_name == sample_user.last_name

    def test_user_default_active_status(self, db_session):
        """Test User model default active status"""
        user = User(
            id=uuid.uuid4(),
            keycloak_id="test-keycloak-456",
            email="test2@example.com",
            first_name="Test2",
            last_name="User2"
        )

        db_session.add(user)
        db_session.commit()

        # is_active should default to True if not specified
        assert user.is_active is not False

    def test_user_unique_keycloak_id(self, db_session):
        """Test that keycloak_id is unique"""
        user1 = User(
            id=uuid.uuid4(),
            keycloak_id="unique-id-123",
            email="user1@example.com",
            first_name="User1",
            last_name="Test"
        )

        db_session.add(user1)
        db_session.commit()

        # Attempting to create another user with same keycloak_id should fail
        user2 = User(
            id=uuid.uuid4(),
            keycloak_id="unique-id-123",
            email="user2@example.com",
            first_name="User2",
            last_name="Test"
        )

        db_session.add(user2)

        with pytest.raises(Exception):  # Should raise IntegrityError or similar
            db_session.commit()

    def test_user_relationships(self, db_session, sample_project):
        """Test User model relationships"""
        user = User(
            id=uuid.uuid4(),
            keycloak_id="test-keycloak-789",
            email="test3@example.com",
            first_name="Test3",
            last_name="User3",
            is_active=True
        )

        db_session.add(user)
        db_session.commit()

        # User should have relationships for projects, tasks, etc.
        assert hasattr(user, 'owned_projects')
        assert hasattr(user, 'assigned_tasks')
        assert hasattr(user, 'created_tasks')
        assert hasattr(user, 'time_entries')

    def test_user_inactive_status(self, db_session):
        """Test setting user to inactive"""
        user = User(
            id=uuid.uuid4(),
            keycloak_id="test-keycloak-inactive",
            email="inactive@example.com",
            first_name="Inactive",
            last_name="User",
            is_active=False
        )

        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.is_active is False
