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

from sap_business_one.database.connection import Base


class Item(Base):
    """Item model"""
    __tablename__ = "items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    line_num = Column(Integer, nullable=True)
    price_per_unit = Column(Float, nullable=True)
    units = Column(Integer, nullable=True)
    description = Column(String(255), nullable=True)
    comment = Column(String, nullable=True)
    material_number = Column(String(255), nullable=True)
    #properties_id = Column(UUID(as_uuid=True), ForeignKey('item_properties.id'), nullable=True)

    # Relationships
    #order = relationship("Order", back_populates="items")
