"""
Unit tests for Time Entries router
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from models.task import TimeEntry


@pytest.mark.unit
@pytest.mark.api
class TestTimeEntriesRouter:
    """Tests for /api/v1/time-entries endpoints"""

    @pytest.mark.asyncio
    async def test_start_time_entry_success(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test successfully starting a time entry"""
        from auth.user import oidc_auth

        time_entry_data = {
            "task_id": str(sample_task.id),
            "description": "Working on task",
            "start_time": datetime.now(timezone.utc).isoformat(),
            "external": False,
            "billable": True
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    with patch('routers.time_entries.lookup_task', new=AsyncMock(return_value=sample_task)):
                        response = client.post(
                            "/api/v1/time-entries/",
                            json=time_entry_data,
                            headers={"Authorization": "Bearer user-token"}
                        )

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == str(sample_task.id)
        assert data["is_running"] is True

    @pytest.mark.asyncio
    async def test_start_time_entry_with_running_entry(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test starting a time entry when another is already running"""
        from auth.user import oidc_auth

        # Create a running time entry
        running_entry = TimeEntry(
            id=uuid.uuid4(),
            user_id=sample_user.id,
            task_id=sample_task.id,
            project_id=sample_task.project_id,
            start_time=datetime.now(timezone.utc),
            is_running=True
        )
        db_session.add(running_entry)
        db_session.commit()

        time_entry_data = {
            "task_id": str(sample_task.id),
            "start_time": datetime.now(timezone.utc).isoformat(),
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    with patch('routers.time_entries.lookup_task', new=AsyncMock(return_value=sample_task)):
                        response = client.post(
                            "/api/v1/time-entries/",
                            json=time_entry_data,
                            headers={"Authorization": "Bearer user-token"}
                        )

        assert response.status_code == 400
        assert "running" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_time_entries(self, client, mock_user_payload, sample_user):
        """Test getting time entries with pagination"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        "/api/v1/time-entries/?skip=0&limit=10",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_running_time_entry(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test getting currently running time entry"""
        from auth.user import oidc_auth

        # Create a running time entry
        running_entry = TimeEntry(
            id=uuid.uuid4(),
            user_id=sample_user.id,
            task_id=sample_task.id,
            project_id=sample_task.project_id,
            start_time=datetime.now(timezone.utc),
            is_running=True
        )
        db_session.add(running_entry)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        "/api/v1/time-entries/running",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_active_time_entry(self, client, mock_user_payload, sample_user):
        """Test getting active time entry (alias endpoint)"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        "/api/v1/time-entries/active",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_stop_time_entry_success(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test successfully stopping a time entry"""
        from auth.user import oidc_auth

        # Create a running time entry (use naive datetime for SQLite compatibility)
        start_time = datetime.now(timezone.utc) - timedelta(hours=1)
        running_entry = TimeEntry(
            id=uuid.uuid4(),
            user_id=sample_user.id,
            task_id=sample_task.id,
            project_id=sample_task.project_id,
            start_time=start_time.replace(tzinfo=None),  # Store as naive for SQLite
            is_running=True
        )
        db_session.add(running_entry)
        db_session.commit()

        stop_data = {
            "end_time": datetime.now(timezone.utc).replace(tzinfo=None).isoformat()  # Match naive format
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.put(
                        f"/api/v1/time-entries/{running_entry.id}/stop",
                        json=stop_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["is_running"] is False
        assert data["end_time"] is not None

    @pytest.mark.asyncio
    async def test_stop_already_stopped_entry(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test stopping an already stopped entry"""
        from auth.user import oidc_auth

        # Create a stopped time entry
        stopped_entry = TimeEntry(
            id=uuid.uuid4(),
            user_id=sample_user.id,
            task_id=sample_task.id,
            project_id=sample_task.project_id,
            start_time=datetime.now(timezone.utc) - timedelta(hours=2),
            end_time=datetime.now(timezone.utc) - timedelta(hours=1),
            is_running=False,
            duration_minutes=60
        )
        db_session.add(stopped_entry)
        db_session.commit()

        stop_data = {
            "end_time": datetime.now(timezone.utc).isoformat()
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.put(
                        f"/api/v1/time-entries/{stopped_entry.id}/stop",
                        json=stop_data,
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 400
        assert "not running" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_time_summary(self, client, mock_user_payload, sample_user):
        """Test getting time entry summary"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        "/api/v1/time-entries/summary",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_delete_time_entry_success(self, client, mock_user_payload, sample_user, sample_task, db_session):
        """Test successfully deleting a time entry"""
        from auth.user import oidc_auth

        # Create a time entry to delete
        time_entry = TimeEntry(
            id=uuid.uuid4(),
            user_id=sample_user.id,
            task_id=sample_task.id,
            project_id=sample_task.project_id,
            start_time=datetime.now(timezone.utc) - timedelta(hours=2),
            end_time=datetime.now(timezone.utc) - timedelta(hours=1),
            is_running=False,
            duration_minutes=60
        )
        db_session.add(time_entry)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.delete(
                        f"/api/v1/time-entries/{time_entry.id}",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_get_my_time_entries(self, client, mock_user_payload, sample_user):
        """Test getting my time entries with date filters"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                with patch('routers.time_entries.lookup_user', new=AsyncMock(return_value=sample_user)):
                    response = client.get(
                        "/api/v1/time-entries/my?dateFrom=2024-01-01&dateTo=2024-12-31",
                        headers={"Authorization": "Bearer user-token"}
                    )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_time_entries_endpoint_requires_auth(self, client):
        """Test that time entries endpoints require authentication"""
        response = client.get("/api/v1/time-entries/")
        assert response.status_code == 403

        response = client.post("/api/v1/time-entries/", json={})
        assert response.status_code == 403
