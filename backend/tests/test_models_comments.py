"""
Unit tests for Comments model and schemas
"""
import pytest
import uuid
from datetime import datetime
from models.comments import Comments, CommentsResponse, CommentsCreate


@pytest.mark.unit
class TestCommentsModels:
    """Tests for Comments model and schemas"""

    def test_comments_model_creation(self, db_session, sample_user, sample_task):
        """Test creating a Comments model instance"""
        comment = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_user.id,
            content="This is a test comment"
        )

        db_session.add(comment)
        db_session.commit()
        db_session.refresh(comment)

        assert comment.id is not None
        assert comment.task_id == sample_task.id
        assert comment.user_id == sample_user.id
        assert comment.content == "This is a test comment"
        assert comment.created_at is not None
        assert comment.updated_at is not None

    def test_comments_response_schema(self, db_session, sample_user, sample_task):
        """Test CommentsResponse schema"""
        comment = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_user.id,
            content="Test comment for schema"
        )

        db_session.add(comment)
        db_session.commit()
        db_session.refresh(comment)

        response = CommentsResponse.from_orm(comment)

        assert response.id == comment.id
        assert response.task_id == comment.task_id
        assert response.content == comment.content
        assert response.user is not None
        assert response.created_at is not None
        assert response.updated_at is not None

    def test_comments_create_schema(self):
        """Test CommentsCreate schema validation"""
        comment_data = CommentsCreate(content="New comment content")

        assert comment_data.content == "New comment content"

    def test_comments_required_fields(self, db_session, sample_task, sample_user):
        """Test that required fields are enforced"""
        # Test missing content
        with pytest.raises(Exception):
            comment = Comments(
                id=uuid.uuid4(),
                task_id=sample_task.id,
                user_id=sample_user.id,
                content=None  # Required field
            )
            db_session.add(comment)
            db_session.commit()

    def test_comments_relationships(self, db_session, sample_user, sample_task):
        """Test Comments model relationships"""
        comment = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_user.id,
            content="Test relationship"
        )

        db_session.add(comment)
        db_session.commit()
        db_session.refresh(comment)

        # Test relationships
        assert hasattr(comment, 'task')
        assert hasattr(comment, 'user')
        assert comment.task.id == sample_task.id
        assert comment.user.id == sample_user.id

    def test_comments_content_length(self, db_session, sample_user, sample_task):
        """Test that comment content can store long text"""
        long_content = "A" * 2000  # Max length is 2000

        comment = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_user.id,
            content=long_content
        )

        db_session.add(comment)
        db_session.commit()
        db_session.refresh(comment)

        assert len(comment.content) == 2000
        assert comment.content == long_content
