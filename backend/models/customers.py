"""
Customers model and schemas mapping to project_members table
"""
import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    orders = relationship("Order", back_populates="customer")


# Pydantic schemas
class CustomerBase(BaseModel):
    id: uuid.UUID
    customer_name: str


class CustomerResponse(CustomerBase):
    pass

    class Config:
        from_attributes = True