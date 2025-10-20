"""
Orders model and schemas
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import Column, DateTime, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base
from models.customers import CustomerResponse


class Order(Base):
    """Order model"""
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    order_id = Column(String(255), nullable=True)
    description = Column(String(255), nullable=True)
    comment = Column(String, nullable=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey('customers.id'), nullable=False)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("Item", back_populates="order")



# Pydantic schemas
class OrderBase(BaseModel):
    """Base order schema"""
    order_id: Optional[str] = None
    description: Optional[str] = None
    comment: Optional[str] = None


class OrderCreate(OrderBase):
    """Order creation schema"""
    customer_id: uuid.UUID


class OrderUpdate(OrderBase):
    """Order update schema"""
    pass


class OrderResponse(OrderBase):
    """Order response schema"""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    customer: CustomerResponse

    class Config:
        from_attributes = True
