"""
Unit tests for Orders router
"""
import pytest
import uuid
from unittest.mock import patch, AsyncMock
from models.orders import Order


@pytest.mark.unit
@pytest.mark.api
class TestOrdersRouter:
    """Tests for /api/v1/orders endpoints"""

    @pytest.mark.asyncio
    async def test_get_orders_success(self, client, mock_user_payload, sample_order, db_session):
        """Test successfully getting all orders"""
        from auth.user import oidc_auth

        # Create additional order
        customer_id = sample_order.customer_id
        order2 = Order(
            id=uuid.uuid4(),
            customer_id=customer_id,
            order_id="ORD-002",
            description="Second order"
        )
        db_session.add(order2)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    "/api/v1/orders/",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    @pytest.mark.asyncio
    async def test_get_orders_empty(self, client, mock_user_payload, db_session):
        """Test getting empty orders list"""
        from auth.user import oidc_auth

        # Ensure no orders exist
        db_session.query(Order).delete()
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    "/api/v1/orders/",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_order_success(self, client, mock_user_payload, sample_order, db_session):
        """Test successfully getting a single order"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/orders/{sample_order.id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_order.id)
        assert data["order_id"] == sample_order.order_id

    @pytest.mark.asyncio
    async def test_get_order_not_found(self, client, mock_user_payload):
        """Test getting non-existent order"""
        from auth.user import oidc_auth

        fake_order_id = str(uuid.uuid4())

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/orders/{fake_order_id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_order_success(self, client, mock_admin_payload, sample_customer, db_session):
        """Test successfully creating an order (admin only)"""
        from auth.user import oidc_auth

        order_data = {
            "customer_id": str(sample_customer.id),
            "order_id": "ORD-999",
            "description": "New test order",
            "comment": "Test comment"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.post(
                    "/api/v1/orders/",
                    json=order_data,
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 201
        data = response.json()
        assert data["order_id"] == "ORD-999"
        assert data["description"] == "New test order"

    @pytest.mark.asyncio
    async def test_update_order_success(self, client, mock_admin_payload, sample_order, db_session):
        """Test successfully updating an order (admin only)"""
        from auth.user import oidc_auth

        update_data = {
            "order_id": "ORD-UPDATED",
            "description": "Updated description"
        }

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.put(
                    f"/api/v1/orders/{sample_order.id}",
                    json=update_data,
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert data["order_id"] == "ORD-UPDATED"
        assert data["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_update_order_not_found(self, client, mock_admin_payload):
        """Test updating non-existent order"""
        from auth.user import oidc_auth

        fake_order_id = str(uuid.uuid4())
        update_data = {"description": "Updated"}

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.put(
                    f"/api/v1/orders/{fake_order_id}",
                    json=update_data,
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_order_success(self, client, mock_admin_payload, sample_customer, db_session):
        """Test successfully deleting an order (admin only)"""
        from auth.user import oidc_auth

        # Create order to delete
        order = Order(
            id=uuid.uuid4(),
            customer_id=sample_customer.id,
            order_id="ORD-DELETE",
            description="To delete"
        )
        db_session.add(order)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.delete(
                    f"/api/v1/orders/{order.id}",
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_order_not_found(self, client, mock_admin_payload):
        """Test deleting non-existent order"""
        from auth.user import oidc_auth

        fake_order_id = str(uuid.uuid4())

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_admin_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.delete(
                    f"/api/v1/orders/{fake_order_id}",
                    headers={"Authorization": "Bearer admin-token"}
                )

        assert response.status_code == 404

    def test_orders_endpoints_require_auth(self, client):
        """Test that orders endpoints require authentication"""
        response = client.get("/api/v1/orders/")
        assert response.status_code == 403

        response = client.get(f"/api/v1/orders/{uuid.uuid4()}")
        assert response.status_code == 403

        response = client.post("/api/v1/orders/", json={})
        assert response.status_code == 403
