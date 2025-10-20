"""
Unit tests for Item model and schemas
"""
import pytest
import uuid
from models.items import Item, ItemResponse, ItemCreate, ItemUpdate


@pytest.mark.unit
class TestItemsModels:
    """Tests for Item model and schemas"""

    def test_item_model_creation(self, db_session, sample_order):
        """Test creating an Item model instance"""
        item = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id,
            description="Test item",
            units=10,
            price_per_unit=99.99,
            comment="Test comment",
            material_number="MAT-001"
        )

        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)

        assert item.id is not None
        assert item.order_id == sample_order.id
        assert item.description == "Test item"
        assert item.units == 10
        assert item.price_per_unit == 99.99

    def test_item_response_schema(self, db_session, sample_order):
        """Test ItemResponse schema"""
        item = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id,
            description="Schema test",
            units=5
        )

        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)

        response = ItemResponse.model_validate(item)

        assert response.id == item.id
        assert response.order_id == item.order_id
        assert response.description == "Schema test"
        assert response.units == 5

    def test_item_create_schema(self, sample_order):
        """Test ItemCreate schema validation"""
        item_data = ItemCreate(
            order_id=sample_order.id,
            description="New item",
            units=3,
            price_per_unit=149.99
        )

        assert item_data.order_id == sample_order.id
        assert item_data.description == "New item"
        assert item_data.units == 3

    def test_item_update_schema(self):
        """Test ItemUpdate schema validation"""
        update_data = ItemUpdate(
            description="Updated description",
            units=20
        )

        assert update_data.description == "Updated description"
        assert update_data.units == 20

    def test_item_optional_fields(self, db_session, sample_order):
        """Test that optional fields work"""
        item = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id
        )

        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)

        assert item.id is not None
        assert item.description is None
        assert item.units is None
        assert item.price_per_unit is None

    def test_item_relationships(self, db_session, sample_order):
        """Test Item model relationships"""
        item = Item(
            id=uuid.uuid4(),
            order_id=sample_order.id,
            description="Relationship test"
        )

        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)

        # Item should have order relationship
        assert hasattr(item, 'order')
        assert item.order.id == sample_order.id
