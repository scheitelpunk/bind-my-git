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
from models.user import UserResponse


class Comments(Base):
    """Comment model"""
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey('tasks.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    content = Column(String(2000), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="comments")


class CommentsBase(BaseModel):
    """Base comment schema"""
    content: str


class CommentsCreate(CommentsBase):
    """Comment creation schema"""
    pass


class CommentsResponse(CommentsBase):
    """Comment response schema"""
    id: uuid.UUID
    task_id: uuid.UUID
    user: UserResponse
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True