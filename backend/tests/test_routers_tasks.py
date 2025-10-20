"""
Unit tests for Tasks router
"""
import pytest
import uuid
from datetime import datetime
from unittest.mock import patch, AsyncMock
from decimal import Decimal


@pytest.mark.unit
@pytest.mark.api
class TestTasksRouter:
    """Tests for /api/v1/tasks endpoints"""

    @pytest.mark.asyncio
    async def test_create_task_success(self, client, mock_user_payload, sample_user, sample_project, db_session):
        """Test successful task creation"""
        from auth.user import oidc_auth

        task_data = {
            "title": "New Test Task",
            "description": "A test task",
            "project_id": str(sample_project.id),
            "status": "todo",
            "priority": "high",
            "external": False,
            "billable": True
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.tasks.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.post(
                        "/api/v1/tasks/",
                        json=task_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Test Task"
        assert data["description"] == "A test task"
        assert data["status"] == "todo"

    def test_create_task_unauthorized(self, client, mock_user_payload):
        """Test task creation without proper role"""
        from auth.user import oidc_auth

        task_data = {
            "title": "New Test Task",
            "project_id": str(uuid.uuid4())
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=False):
                response = client.post(
                    "/api/v1/tasks/",
                    json=task_data,
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_tasks_pagination(self, client, mock_user_payload, sample_user, sample_task):
        """Test getting tasks with pagination"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.tasks.lookup_user', new=AsyncMock(return_value=sample_user)):
                    with patch('routers.tasks.is_regular_user', new=AsyncMock(return_value=False)):
                        response = client.get(
                            "/api/v1/tasks/?page=0&size=10",
                            headers={"Authorization": "Bearer user-token"}
                        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "page" in data
        assert "totalElements" in data

    @pytest.mark.asyncio
    async def test_get_tasks_with_filters(self, client, mock_user_payload, sample_user, sample_project):
        """Test getting tasks with status and search filters"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.tasks.lookup_user', new=AsyncMock(return_value=sample_user)):
                    with patch('routers.tasks.is_regular_user', new=AsyncMock(return_value=False)):
                        response = client.get(
                            f"/api/v1/tasks/?project_id={sample_project.id}&status=todo&priority=medium",
                            headers={"Authorization": "Bearer user-token"}
                        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_my_tasks(self, client, mock_user_payload, sample_user, sample_task):
        """Test getting current user's tasks"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.tasks.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        "/api/v1/tasks/my",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_task_by_id_success(self, client, mock_user_payload, sample_user, sample_task):
        """Test getting a specific task by ID"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.tasks.lookup_user', new=AsyncMock(return_value=sample_user)):
                    with patch('routers.tasks.lookup_task', new=AsyncMock(return_value=sample_task)):
                        response = client.get(
                            f"/api/v1/tasks/{sample_task.id}",
                            headers={"Authorization": "Bearer user-token"}
                        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_task.id)
        assert data["title"] == sample_task.title

    @pytest.mark.asyncio
    async def test_get_task_tags(self, client, mock_user_payload, sample_user):
        """Test getting task tags"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    "/api/v1/tasks/tags",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_update_task_success(self, client, mock_user_payload, sample_user, sample_task):
        """Test successful task update"""
        from auth.user import oidc_auth
        from routers.tasks import get_fine_grained_access_control

        update_data = {
            "title": "Updated Task Title",
            "status": "in_progress"
        }

        async def mock_access_control(*args):
            return sample_task, True, False, False, False

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.tasks.get_fine_grained_access_control', new=AsyncMock(side_effect=mock_access_control)):
                    response = client.put(
                        f"/api/v1/tasks/{sample_task.id}",
                        json=update_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Task Title"

    @pytest.mark.asyncio
    async def test_update_task_unauthorized(self, client, mock_user_payload, sample_user, sample_task):
        """Test task update by non-admin/non-assignee"""
        from auth.user import oidc_auth

        update_data = {
            "title": "Updated Task Title"
        }

        async def mock_access_control(*args):
            return sample_task, False, False, False, False

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=False):
                with patch('routers.tasks.get_fine_grained_access_control', new=AsyncMock(side_effect=mock_access_control)):
                    response = client.put(
                        f"/api/v1/tasks/{sample_task.id}",
                        json=update_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_task_success(self, client, mock_admin_payload, sample_admin_user, sample_task):
        """Test successful task deletion"""
        from auth.user import oidc_auth

        async def mock_access_control(*args):
            return sample_task, True, False, False, False

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.tasks.get_fine_grained_access_control', new=AsyncMock(side_effect=mock_access_control)):
                    response = client.delete(
                        f"/api/v1/tasks/{sample_task.id}",
                        headers={"Authorization": "Bearer admin-token"}
                    )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_update_task_assignee(self, client, mock_admin_payload, sample_admin_user, sample_task, sample_user):
        """Test updating task assignee"""
        from auth.user import oidc_auth

        assignee_data = {
            "assignee_id": str(sample_user.id)
        }

        async def mock_access_control(*args):
            return sample_task, True, False, False, False

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.tasks.get_fine_grained_access_control', new=AsyncMock(side_effect=mock_access_control)):
                    response = client.patch(
                        f"/api/v1/tasks/{sample_task.id}/assign",
                        json=assignee_data,
                        headers={"Authorization": "Bearer admin-token"}
                    )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_task_status(self, client, mock_admin_payload, sample_admin_user, sample_task):
        """Test updating task status"""
        from auth.user import oidc_auth

        status_data = {
            "status": "completed"
        }

        async def mock_access_control(*args):
            return sample_task, True, False, False, False

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.tasks.get_fine_grained_access_control', new=AsyncMock(side_effect=mock_access_control)):
                    response = client.patch(
                        f"/api/v1/tasks/{sample_task.id}/status",
                        json=status_data,
                        headers={"Authorization": "Bearer admin-token"}
                    )

        assert response.status_code == 200

    def test_tasks_endpoint_requires_auth(self, client):
        """Test that tasks endpoints require authentication"""
        response = client.get("/api/v1/tasks/")
        assert response.status_code == 403

        response = client.post("/api/v1/tasks/", json={})
        assert response.status_code == 403
