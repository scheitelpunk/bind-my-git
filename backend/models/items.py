"""
Items model and schemas
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import Column, String, ForeignKey, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base


class Item(Base):
    """Item model"""
    __tablename__ = "items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    price_per_unit = Column(Float, nullable=True)
    units = Column(Integer, nullable=True)
    description = Column(String(255), nullable=True)
    comment = Column(String, nullable=True)
    material_number = Column(String(255), nullable=True)
    # properties_id = Column(UUID(as_uuid=True), ForeignKey('item_properties.id'), nullable=True)
    properties_id = Column(UUID(as_uuid=True), nullable=True)  # Removed FK constraint for now

    # Relationships
    order = relationship("Order", back_populates="items")


# Pydantic schemas
class ItemBase(BaseModel):
    """Base item schema"""
    price_per_unit: Optional[float] = None
    units: Optional[int] = None
    description: Optional[str] = None
    comment: Optional[str] = None
    material_number: Optional[str] = None


class ItemCreate(ItemBase):
    """Item creation schema"""
    order_id: uuid.UUID


class ItemUpdate(ItemBase):
    """Item update schema"""
    pass


class ItemResponse(ItemBase):
    """Item response schema"""
    id: uuid.UUID
    order_id: uuid.UUID

    class Config:
        from_attributes = True
