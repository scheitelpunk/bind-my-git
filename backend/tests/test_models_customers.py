"""
Unit tests for Customer model and schemas
"""
import pytest
import uuid
from models.customers import Customer, CustomerResponse


@pytest.mark.unit
class TestCustomersModels:
    """Tests for Customer model and schemas"""

    def test_customer_model_creation(self, db_session):
        """Test creating a Customer model instance"""
        customer = Customer(
            id=uuid.uuid4(),
            customer_name="Test Customer Company"
        )

        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)

        assert customer.id is not None
        assert customer.customer_name == "Test Customer Company"
        assert customer.created_at is not None
        assert customer.updated_at is not None

    def test_customer_response_schema(self, sample_customer):
        """Test CustomerResponse schema"""
        response = CustomerResponse.model_validate(sample_customer)

        assert response.id == sample_customer.id
        assert response.customer_name == sample_customer.customer_name

    def test_customer_required_fields(self, db_session):
        """Test that required fields are enforced"""
        # Test missing customer_name
        with pytest.raises(Exception):
            customer = Customer(
                id=uuid.uuid4(),
                customer_name=None  # Required field
            )
            db_session.add(customer)
            db_session.commit()

    def test_customer_relationships(self, db_session):
        """Test Customer model relationships"""
        customer = Customer(
            id=uuid.uuid4(),
            customer_name="Relationship Test Customer"
        )

        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)

        # Customer should have orders relationship
        assert hasattr(customer, 'orders')
        assert isinstance(customer.orders, list)

    def test_customer_name_length(self, db_session):
        """Test that customer name can store long names"""
        long_name = "A" * 255  # Max length is 255

        customer = Customer(
            id=uuid.uuid4(),
            customer_name=long_name
        )

        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)

        assert len(customer.customer_name) == 255
        assert customer.customer_name == long_name
