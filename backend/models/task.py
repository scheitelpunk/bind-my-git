"""
Task models and schemas
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Boolean, CheckConstraint, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, validator
from typing import Optional, List, Generic, TypeVar
from datetime import datetime, timezone
from decimal import Decimal
import uuid

from database.connection import Base
from models import ItemResponse
from models.user import UserResponse
from models.members import MemberResponse


# Forward reference for ProjectResponse
class ProjectResponseMinimal(BaseModel):
    """Minimal project response to avoid circular imports"""
    id: uuid.UUID
    name: str
    order_id: uuid.UUID
    owner_id: uuid.UUID
    members: Optional[List['MemberResponse']] = None

    class Config:
        from_attributes = True


T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    page: int
    size: int
    totalElements: int
    totalPages: int
    hasNext: bool
    hasPrevious: bool

    class Config:
        from_attributes = True


class Task(Base):
    """Task model"""
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(2000))
    assigned_to = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey('items.id'), nullable=True)
    status = Column(String(20), default='todo')
    priority = Column(String(10), default='medium')
    estimated_hours = Column(Numeric(5, 2))
    due_date = Column(DateTime(timezone=True))
    external = Column(Boolean, default=False, nullable=False)
    billable = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_tasks")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_tasks")
    item = relationship("Item", foreign_keys=[item_id])
    time_entries = relationship("TimeEntry", back_populates="task")
    comments = relationship("Comments", back_populates="task")


class TimeEntry(Base):
    """Time Entry model with overlap prevention"""
    __tablename__ = "time_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey('tasks.id'), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id'), nullable=False)
    description = Column(String(500))
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    is_running = Column(Boolean, default=False)
    external = Column(Boolean, default=False, nullable=False)
    billable = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Constraints
    __table_args__ = (
        CheckConstraint('end_time IS NULL OR end_time > start_time', name='check_time_order'),
    )

    # Relationships
    user = relationship("User", back_populates="time_entries")
    task = relationship("Task", back_populates="time_entries")
    project = relationship("Project", back_populates="time_entries")


# Minimal task response to avoid circular reference in time entries
class TaskResponseMinimalForTimeEntry(BaseModel):
    """Minimal task response for time entry inclusion"""
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: str = "medium"
    external: bool = False
    billable: bool = True

    class Config:
        from_attributes = True


# Minimal project response to avoid circular reference in time entries
class ProjectResponseMinimalForTimeEntry(BaseModel):
    """Minimal project response for time entry inclusion"""
    id: uuid.UUID
    name: str
    order_id: uuid.UUID

    class Config:
        from_attributes = True


# Pydantic models
class TimeEntryBase(BaseModel):
    """Base time entry schema"""
    task_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    external: bool = False
    billable: bool = True
    task: Optional["TaskResponseMinimalForTimeEntry"] = None
    project: Optional["ProjectResponseMinimalForTimeEntry"] = None


class TimeEntryResponse(TimeEntryBase):
    """Time entry response schema"""
    id: uuid.UUID
    user_id: uuid.UUID
    user: UserResponse
    project_id: uuid.UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    is_running: bool
    external: bool
    billable: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Pydantic models
class TaskBase(BaseModel):
    """Base task schema"""
    title: str
    description: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None
    assignee: Optional[UserResponse] = None
    item_id: Optional[uuid.UUID] = None
    status: Optional[str] = "todo"
    priority: str = "medium"
    estimated_hours: Optional[Decimal] = None
    due_date: Optional[datetime] = None
    external: bool = False
    billable: bool = True
    time_entries: Optional[List[TimeEntryResponse]] = None


class TaskCreate(TaskBase):
    """Task creation schema"""
    project_id: uuid.UUID


class TaskUpdate(BaseModel):
    """Task update schema"""
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None
    item_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    estimated_hours: Optional[Decimal] = None
    due_date: Optional[datetime] = None
    external: Optional[bool] = None
    billable: Optional[bool] = None
    assignee_id: Optional[uuid.UUID] = None


class TaskAssigneeUpdate(BaseModel):
    """Task assignee update schema"""
    assignee_id: Optional[uuid.UUID] = None


class TaskResponse(TaskBase):
    """Task response schema"""
    id: uuid.UUID
    project_id: uuid.UUID
    project: Optional[ProjectResponseMinimal] = None
    creator: Optional[UserResponse] = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    actual_hours: Optional[Decimal] = None
    tags: List[str] = []
    item: Optional[ItemResponse] = None

    class Config:
        from_attributes = True


class TimeEntryCreate(TimeEntryBase):
    """Time entry creation schema"""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    """
    @validator('start_time', pre=True, always=True)
    def set_start_time(cls, v):
        return v or datetime.now(timezone.utc)
    """


class TimeEntryUpdate(BaseModel):
    """Time entry update schema"""
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    external: Optional[bool] = None
    billable: Optional[bool] = None


class TimeEntryStop(BaseModel):
    """Schema for stopping a time entry"""
    end_time: Optional[datetime] = None

    @validator('end_time', pre=True, always=True)
    def set_end_time(cls, v):
        return v or datetime.now(timezone.utc)


class TimeEntrySummary(BaseModel):
    """Time entry summary schema"""
    total_minutes: int
    total_hours: float
    entries_count: int
    date: str
