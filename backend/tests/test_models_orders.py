"""
Unit tests for Order model and schemas
"""
import pytest
import uuid
from models.orders import Order, OrderResponse, OrderCreate, OrderUpdate


@pytest.mark.unit
class TestOrdersModels:
    """Tests for Order model and schemas"""

    def test_order_model_creation(self, db_session, sample_customer):
        """Test creating an Order model instance"""
        order = Order(
            id=uuid.uuid4(),
            customer_id=sample_customer.id,
            order_id="ORD-TEST",
            description="Test order",
            comment="Test comment"
        )

        db_session.add(order)
        db_session.commit()
        db_session.refresh(order)

        assert order.id is not None
        assert order.customer_id == sample_customer.id
        assert order.order_id == "ORD-TEST"
        assert order.description == "Test order"
        assert order.created_at is not None
        assert order.updated_at is not None

    def test_order_response_schema(self, sample_order):
        """Test OrderResponse schema"""
        response = OrderResponse.model_validate(sample_order)

        assert response.id == sample_order.id
        assert response.order_id == sample_order.order_id
        assert response.description == sample_order.description
        assert response.customer is not None
        assert response.created_at is not None
        assert response.updated_at is not None

    def test_order_create_schema(self, sample_customer):
        """Test OrderCreate schema validation"""
        order_data = OrderCreate(
            customer_id=sample_customer.id,
            order_id="ORD-CREATE",
            description="Create test",
            comment="Test comment"
        )

        assert order_data.customer_id == sample_customer.id
        assert order_data.order_id == "ORD-CREATE"
        assert order_data.description == "Create test"
        assert order_data.comment == "Test comment"

    def test_order_update_schema(self):
        """Test OrderUpdate schema validation"""
        update_data = OrderUpdate(
            order_id="ORD-UPDATED",
            description="Updated description"
        )

        assert update_data.order_id == "ORD-UPDATED"
        assert update_data.description == "Updated description"

    def test_order_optional_fields(self, db_session, sample_customer):
        """Test that optional fields work"""
        order = Order(
            id=uuid.uuid4(),
            customer_id=sample_customer.id
        )

        db_session.add(order)
        db_session.commit()
        db_session.refresh(order)

        assert order.id is not None
        assert order.order_id is None
        assert order.description is None
        assert order.comment is None

    def test_order_relationships(self, db_session, sample_order):
        """Test Order model relationships"""
        # Order should have customer and items relationships
        assert hasattr(sample_order, 'customer')
        assert hasattr(sample_order, 'items')
        assert sample_order.customer is not None
        assert isinstance(sample_order.items, list)

    def test_order_customer_relationship(self, db_session, sample_customer):
        """Test that order correctly relates to customer"""
        order = Order(
            id=uuid.uuid4(),
            customer_id=sample_customer.id,
            order_id="ORD-REL"
        )

        db_session.add(order)
        db_session.commit()
        db_session.refresh(order)

        assert order.customer.id == sample_customer.id
        assert order.customer.customer_name == sample_customer.customer_name
