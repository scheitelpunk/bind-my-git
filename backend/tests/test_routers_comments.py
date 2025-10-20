"""
Unit tests for Comments router
"""
import pytest
import uuid
from datetime import datetime
from unittest.mock import patch, AsyncMock
from models.comments import Comments


@pytest.mark.unit
@pytest.mark.api
class TestCommentsRouter:
    """Tests for /api/v1/comments endpoints"""

    @pytest.mark.asyncio
    async def test_get_comments_success(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test successfully getting comments for a task"""
        from auth.user import oidc_auth

        # Create some comments
        comment1 = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_user.id,
            content="First comment"
        )
        comment2 = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_user.id,
            content="Second comment"
        )
        db_session.add(comment1)
        db_session.add(comment2)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/comments/{sample_task.id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["content"] in ["First comment", "Second comment"]

    @pytest.mark.asyncio
    async def test_get_comments_not_found(self, client, mock_user_payload):
        """Test getting comments for non-existent task"""
        from auth.user import oidc_auth

        fake_task_id = str(uuid.uuid4())

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/comments/{fake_task_id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 404
        assert "no comments found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_comment_success(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test successfully creating a comment"""
        from auth.user import oidc_auth

        comment_data = {
            "content": "This is a test comment"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.comments.lookup_user', new=AsyncMock(return_value=sample_user)):
                    with patch('routers.comments.notify_comment_added') as mock_notify:
                        response = client.post(
                            f"/api/v1/comments/{sample_task.id}",
                            json=comment_data,
                            headers={"Authorization": "Bearer user-token"}
                        )

        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "This is a test comment"
        assert data["task_id"] == str(sample_task.id)

    @pytest.mark.asyncio
    async def test_create_comment_task_not_found(self, client, mock_user_payload, sample_user):
        """Test creating comment for non-existent task"""
        from auth.user import oidc_auth

        fake_task_id = str(uuid.uuid4())
        comment_data = {
            "content": "This is a test comment"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.comments.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.post(
                        f"/api/v1/comments/{fake_task_id}",
                        json=comment_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 404
        assert "task not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_comment_success(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test successfully updating own comment"""
        from auth.user import oidc_auth

        # Create a comment by the sample user
        comment = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_user.id,
            content="Original content"
        )
        db_session.add(comment)
        db_session.commit()

        update_data = {
            "content": "Updated content"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.comments.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.put(
                        f"/api/v1/comments/{comment.id}",
                        json=update_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Updated content"

    @pytest.mark.asyncio
    async def test_update_comment_forbidden(self, client, mock_user_payload, sample_user, sample_admin_user, sample_task, db_session):
        """Test updating someone else's comment"""
        from auth.user import oidc_auth

        # Create a comment by admin user
        comment = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_admin_user.id,
            content="Admin comment"
        )
        db_session.add(comment)
        db_session.commit()

        update_data = {
            "content": "Trying to update"
        }

        # Regular user tries to update admin's comment
        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.comments.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.put(
                        f"/api/v1/comments/{comment.id}",
                        json=update_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 403
        assert "not authorized" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_comment_not_found(self, client, mock_user_payload, sample_user):
        """Test updating non-existent comment"""
        from auth.user import oidc_auth

        fake_comment_id = str(uuid.uuid4())
        update_data = {
            "content": "Updated content"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.comments.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.put(
                        f"/api/v1/comments/{fake_comment_id}",
                        json=update_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_comment_success(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test successfully deleting own comment"""
        from auth.user import oidc_auth

        # Create a comment by the sample user
        comment = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_user.id,
            content="Comment to delete"
        )
        db_session.add(comment)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.comments.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.delete(
                        f"/api/v1/comments/{comment.id}",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_comment_forbidden(self, client, mock_user_payload, sample_user, sample_admin_user, sample_task, db_session):
        """Test deleting someone else's comment"""
        from auth.user import oidc_auth

        # Create a comment by admin user
        comment = Comments(
            id=uuid.uuid4(),
            task_id=sample_task.id,
            user_id=sample_admin_user.id,
            content="Admin comment"
        )
        db_session.add(comment)
        db_session.commit()

        # Regular user tries to delete admin's comment
        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.comments.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.delete(
                        f"/api/v1/comments/{comment.id}",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 403
        assert "not authorized" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_comment_not_found(self, client, mock_user_payload, sample_user):
        """Test deleting non-existent comment"""
        from auth.user import oidc_auth

        fake_comment_id = str(uuid.uuid4())

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.comments.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.delete(
                        f"/api/v1/comments/{fake_comment_id}",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_comments_endpoints_require_auth(self, client, sample_task):
        """Test that comments endpoints require authentication"""
        response = client.get(f"/api/v1/comments/{sample_task.id}")
        assert response.status_code == 403

        response = client.post(f"/api/v1/comments/{sample_task.id}", json={"content": "Test"})
        assert response.status_code == 403

        response = client.put(f"/api/v1/comments/{uuid.uuid4()}", json={"content": "Test"})
        assert response.status_code == 403

        response = client.delete(f"/api/v1/comments/{uuid.uuid4()}")
        assert response.status_code == 403
