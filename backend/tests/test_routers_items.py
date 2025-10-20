"""
Unit tests for Items router
"""
import pytest
import uuid
from unittest.mock import patch, AsyncMock
from models.items import Item


@pytest.mark.unit
@pytest.mark.api
class TestItemsRouter:
    """Tests for /api/v1/items endpoints"""

    @pytest.mark.asyncio
    async def test_get_items_success(self, client, mock_user_payload, sample_order, db_session):
        """Test successfully getting all items"""
        from auth.user import oidc_auth

        # Create test items
        item1 = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id,
            description="Test Item 1",
            units=10,
            price_per_unit=99.99
        )
        item2 = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id,
            description="Test Item 2",
            units=5,
            price_per_unit=149.99
        )
        db_session.add(item1)
        db_session.add(item2)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    "/api/v1/items/",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    @pytest.mark.asyncio
    async def test_get_items_empty(self, client, mock_user_payload, db_session):
        """Test getting empty items list"""
        from auth.user import oidc_auth

        # Ensure no items exist
        db_session.query(Item).delete()
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    "/api/v1/items/",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_items_by_order_success(self, client, mock_user_payload, sample_order, db_session):
        """Test getting items by order ID"""
        from auth.user import oidc_auth

        # Create items for specific order
        item = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id,
            description="Order Item",
            units=3
        )
        db_session.add(item)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/items/by-order/{sample_order.id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["order_id"] == str(sample_order.id)

    @pytest.mark.asyncio
    async def test_get_items_by_order_not_found(self, client, mock_user_payload):
        """Test getting items for non-existent order"""
        from auth.user import oidc_auth

        fake_order_id = str(uuid.uuid4())

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/items/by-order/{fake_order_id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_item_success(self, client, mock_user_payload, sample_order, db_session):
        """Test successfully getting a single item"""
        from auth.user import oidc_auth

        item = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id,
            description="Single Test Item",
            units=1
        )
        db_session.add(item)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/items/{item.id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(item.id)
        assert data["description"] == "Single Test Item"

    @pytest.mark.asyncio
    async def test_get_item_not_found(self, client, mock_user_payload):
        """Test getting non-existent item"""
        from auth.user import oidc_auth

        fake_item_id = str(uuid.uuid4())

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/items/{fake_item_id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_item_success(self, client, mock_admin_payload, sample_order, db_session):
        """Test successfully creating an item (admin only)"""
        from auth.user import oidc_auth

        item_data = {
            "order_id": str(sample_order.id),
            "description": "New Item",
            "units": 5,
            "price_per_unit": 199.99,
            "comment": "Test comment",
            "material_number": "MAT-123"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.post(
                    "/api/v1/items/",
                    json=item_data,
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 201
        data = response.json()
        assert data["description"] == "New Item"
        assert data["units"] == 5

    @pytest.mark.asyncio
    async def test_update_item_success(self, client, mock_admin_payload, sample_order, db_session):
        """Test successfully updating an item (admin only)"""
        from auth.user import oidc_auth

        item = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id,
            description="Original",
            units=1
        )
        db_session.add(item)
        db_session.commit()

        update_data = {
            "description": "Updated Description",
            "units": 10
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.put(
                    f"/api/v1/items/{item.id}",
                    json=update_data,
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Updated Description"
        assert data["units"] == 10

    @pytest.mark.asyncio
    async def test_update_item_not_found(self, client, mock_admin_payload):
        """Test updating non-existent item"""
        from auth.user import oidc_auth

        fake_item_id = str(uuid.uuid4())
        update_data = {"description": "Updated"}

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.put(
                    f"/api/v1/items/{fake_item_id}",
                    json=update_data,
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_item_success(self, client, mock_admin_payload, sample_order, db_session):
        """Test successfully deleting an item (admin only)"""
        from auth.user import oidc_auth

        item = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id,
            description="To Delete"
        )
        db_session.add(item)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.delete(
                    f"/api/v1/items/{item.id}",
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_item_not_found(self, client, mock_admin_payload):
        """Test deleting non-existent item"""
        from auth.user import oidc_auth

        fake_item_id = str(uuid.uuid4())

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.delete(
                    f"/api/v1/items/{fake_item_id}",
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 404

    def test_items_endpoints_require_auth(self, client):
        """Test that items endpoints require authentication"""
        response = client.get("/api/v1/items/")
        assert response.status_code == 403

        response = client.get(f"/api/v1/items/{uuid.uuid4()}")
        assert response.status_code == 403

        response = client.post("/api/v1/items/", json={})
        assert response.status_code == 403
