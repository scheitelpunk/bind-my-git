"""
Notification model and schemas
"""
import uuid
from datetime import datetime
from typing import Optional
from enum import Enum

from pydantic import BaseModel
from sqlalchemy import Column, DateTime, ForeignKey, String, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base
from models.user import UserResponse


class NotificationType(str, Enum):
    """Notification type enumeration"""
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    TASK_UPDATED = "task_updated"
    COMMENT_ADDED = "comment_added"
    PROJECT_ASSIGNED = "project_assigned"
    PROJECT_UPDATED = "project_updated"
    MENTION = "mention"
    DEADLINE_APPROACHING = "deadline_approaching"


class Notification(Base):
    """Notification model"""
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    type = Column(
        SQLEnum(NotificationType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False
    )
    title = Column(String(200), nullable=False)
    message = Column(String(1000), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)

    # Optional references to related entities
    related_task_id = Column(UUID(as_uuid=True), ForeignKey('tasks.id'), nullable=True)
    related_project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id'), nullable=True)
    related_comment_id = Column(UUID(as_uuid=True), ForeignKey('comments.id'), nullable=True)

    # Actor who triggered the notification (e.g., who assigned the task)
    actor_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id])
    related_task = relationship("Task", foreign_keys=[related_task_id])
    related_project = relationship("Project", foreign_keys=[related_project_id])
    related_comment = relationship("Comments", foreign_keys=[related_comment_id])


class NotificationBase(BaseModel):
    """Base notification schema"""
    type: NotificationType
    title: str
    message: str


class NotificationCreate(NotificationBase):
    """Notification creation schema"""
    user_id: uuid.UUID
    related_task_id: Optional[uuid.UUID] = None
    related_project_id: Optional[uuid.UUID] = None
    related_comment_id: Optional[uuid.UUID] = None
    actor_id: Optional[uuid.UUID] = None


class NotificationUpdate(BaseModel):
    """Notification update schema"""
    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    """Notification response schema"""
    id: uuid.UUID
    user_id: uuid.UUID
    is_read: bool
    related_task_id: Optional[uuid.UUID] = None
    related_project_id: Optional[uuid.UUID] = None
    related_comment_id: Optional[uuid.UUID] = None
    actor_id: Optional[uuid.UUID] = None
    actor: Optional[UserResponse] = None
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True
