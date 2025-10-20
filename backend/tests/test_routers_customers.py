"""
Unit tests for Customers router
"""
import pytest
import uuid
from unittest.mock import patch, AsyncMock
from models.customers import Customer


@pytest.mark.unit
@pytest.mark.api
class TestCustomersRouter:
    """Tests for /api/v1/customers endpoints"""

    @pytest.mark.asyncio
    async def test_get_customer_success(self, client, mock_user_payload, sample_customer, db_session):
        """Test successfully getting a customer by ID"""
        from auth.user import oidc_auth

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/customers/{sample_customer.id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_customer.id)
        assert data["customer_name"] == sample_customer.customer_name

    @pytest.mark.asyncio
    async def test_get_customer_not_found(self, client, mock_user_payload):
        """Test getting non-existent customer"""
        from auth.user import oidc_auth

        fake_customer_id = str(uuid.uuid4())

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    f"/api/v1/customers/{fake_customer_id}",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_customer_list_success(self, client, mock_user_payload, sample_customer, db_session):
        """Test successfully getting list of customers"""
        from auth.user import oidc_auth

        # Create additional customer
        customer2 = Customer(
            id=uuid.uuid4(),
            customer_name="Second Customer"
        )
        db_session.add(customer2)
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    "/api/v1/customers/",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    @pytest.mark.asyncio
    async def test_get_customer_list_empty(self, client, mock_user_payload, db_session):
        """Test getting empty customer list"""
        from auth.user import oidc_auth

        # Ensure no customers exist
        db_session.query(Customer).delete()
        db_session.commit()

        with patch.object(oidc_auth, 'verify_token', new=AsyncMock(return_value=mock_user_payload)):
            with patch.object(oidc_auth, 'check_role', return_value=True):
                response = client.get(
                    "/api/v1/customers/",
                    headers={"Authorization": "Bearer user-token"}
                )

        assert response.status_code == 404

    def test_customers_endpoints_require_auth(self, client, sample_customer):
        """Test that customers endpoints require authentication"""
        response = client.get(f"/api/v1/customers/{sample_customer.id}")
        assert response.status_code == 403

        response = client.get("/api/v1/customers/")
        assert response.status_code == 403
