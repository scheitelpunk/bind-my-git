"""
Unit tests for Projects router
"""
import pytest
import uuid
from datetime import date
from unittest.mock import patch, AsyncMock


@pytest.mark.unit
@pytest.mark.api
class TestProjectsRouter:
    """Tests for /api/v1/projects endpoints"""

    @pytest.mark.asyncio
    async def test_create_project_success(self, client, mock_admin_payload, sample_admin_user, sample_order, db_session):
        """Test successful project creation"""
        from auth.user import oidc_auth
        from utils.helper import lookup_user

        project_data = {
            "name": "New Test Project",
            "description": "A brand new test project",
            "start_date": str(date.today()),
            "order_id": str(sample_order.id)
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('utils.helper.lookup_user', new=AsyncMock(return_value=sample_admin_user)):
                    response = client.post(
                        "/api/v1/projects/",
                        json=project_data,
                        headers={"Authorization": "Bearer admin-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Test Project"
        assert data["description"] == "A brand new test project"
        assert data["owner_id"] == str(sample_admin_user.id)

    def test_create_project_unauthorized(self, client, mock_user_payload):
        """Test project creation without admin/project_manager role"""
        from auth.user import oidc_auth

        project_data = {
            "name": "New Test Project",
            "start_date": str(date.today()),
            "order_id": str(uuid.uuid4())
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=False):
                response = client.post(
                    "/api/v1/projects/",
                    json=project_data,
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_projects_pagination(self, client, mock_admin_payload, sample_admin_user, sample_project):
        """Test getting projects with pagination"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('utils.helper.lookup_user', new=AsyncMock(return_value=sample_admin_user)):
                    response = client.get(
                        "/api/v1/projects/?page=0&size=10",
                        headers={"Authorization": "Bearer admin-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "page" in data
        assert "size" in data
        assert "totalElements" in data
        assert "totalPages" in data
        assert "hasNext" in data
        assert "hasPrevious" in data

    @pytest.mark.asyncio
    async def test_get_projects_with_filters(self, client, mock_admin_payload, sample_admin_user):
        """Test getting projects with status and search filters"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('utils.helper.lookup_user', new=AsyncMock(return_value=sample_admin_user)):
                    response = client.get(
                        "/api/v1/projects/?status=active&search=Test",
                        headers={"Authorization": "Bearer admin-token"}
                    )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_project_by_id_success(self, client, mock_user_payload, sample_user, sample_project):
        """Test getting a specific project by ID"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('utils.helper.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        f"/api/v1/projects/{sample_project.id}",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_project.id)
        assert data["name"] == sample_project.name

    @pytest.mark.asyncio
    async def test_get_project_not_found(self, client, mock_user_payload, sample_user):
        """Test getting a non-existent project"""
        from auth.user import oidc_auth

        nonexistent_id = uuid.uuid4()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('utils.helper.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        f"/api/v1/projects/{nonexistent_id}",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_project_success(self, client, mock_admin_payload, sample_admin_user, sample_project):
        """Test successful project update"""
        from auth.user import oidc_auth

        update_data = {
            "name": "Updated Project Name",
            "status": "completed"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('utils.helper.lookup_user', new=AsyncMock(return_value=sample_admin_user)):
                    response = client.put(
                        f"/api/v1/projects/{sample_project.id}",
                        json=update_data,
                        headers={"Authorization": "Bearer admin-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Project Name"
        assert data["status"] == "completed"

    @pytest.mark.asyncio
    async def test_update_project_unauthorized(self, client, mock_user_payload, sample_user, sample_project):
        """Test project update by non-owner/non-admin"""
        from auth.user import oidc_auth
        from models.user import User

        # Create a different user
        different_user = User(
            id=uuid.uuid4(),
            email="different@example.com",
            keycloak_id="different-user-123",
            first_name="Different",
            last_name="User",
            is_active=True
        )

        update_data = {
            "name": "Updated Project Name"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            # Patch at module path to ensure it affects imports inside get_fine_grained_role
            with patch('auth.user.oidc_auth.check_role', return_value=False):
                # Patch lookup_user where it's imported in routers.projects, not where it's defined
                with patch('routers.projects.lookup_user', new=AsyncMock(return_value=different_user)):
                    response = client.put(
                        f"/api/v1/projects/{sample_project.id}",
                        json=update_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_project_success(self, client, mock_admin_payload, sample_admin_user, sample_project):
        """Test successful project deletion"""
        from auth.user import oidc_auth

        # Update project to be owned by admin user
        sample_project.owner_id = sample_admin_user.id

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('utils.helper.lookup_user', new=AsyncMock(return_value=sample_admin_user)):
                    response = client.delete(
                        f"/api/v1/projects/{sample_project.id}",
                        headers={"Authorization": "Bearer admin-token"}
                    )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_get_my_projects(self, client, mock_user_payload, sample_user, sample_project):
        """Test getting current user's projects"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('utils.helper.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        "/api/v1/projects/my",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_project_tasks(self, client, mock_user_payload, sample_user, sample_project, sample_task):
        """Test getting tasks for a project"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('utils.helper.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        f"/api/v1/projects/{sample_project.id}/tasks?page=0&size=10",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "page" in data
        assert "totalElements" in data

    def test_projects_endpoint_requires_auth(self, client):
        """Test that projects endpoints require authentication"""
        response = client.get("/api/v1/projects/")
        assert response.status_code == 403

        response = client.post("/api/v1/projects/", json={})
        assert response.status_code == 403
