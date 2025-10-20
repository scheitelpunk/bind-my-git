"""
Project models and schemas
"""

import uuid
from datetime import datetime, date
from typing import List, Optional, Any
from typing import TypeVar, Generic

from pydantic import BaseModel, model_validator
from sqlalchemy import Column, String, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base
from models.members import ProjectMember, MemberResponse
from models.task import TaskResponse
from models.user import UserResponse

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


class Project(Base):
    """Project model"""
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(String(1000))
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    status = Column(String(20), default='active')
    start_date = Column(Date)
    end_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    customer_id = Column(UUID(as_uuid=True), ForeignKey('customers.id'))
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.id'), nullable=False)

    # Relationships
    # order = relationship("Order", back_populates="project")
    owner = relationship("User", back_populates="owned_projects")
    user_member_view = relationship("User", secondary="project_members", backref="member_projects")
    members = relationship("ProjectMember", foreign_keys="[ProjectMember.project_id]", viewonly=True)
    tasks = relationship("Task", back_populates="project")
    time_entries = relationship("TimeEntry", back_populates="project")


# Pydantic models
class ProjectBase(BaseModel):
    """Base project schema"""
    name: str
    description: Optional[str] = None
    status: str = "active"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    # members: Optional[List[UserResponse]] = None
    owner: Optional[UserResponse] = None
    customer_id: Optional[uuid.UUID] = None
    tasks: Optional[List[TaskResponse]] = None
    members: Optional[List[MemberResponse]] = None


class ProjectCreate(BaseModel):
    """Project creation schema"""
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    members: Optional[List[uuid.UUID]] = None
    customer_id: Optional[uuid.UUID] = None
    order_id: uuid.UUID


class ProjectUpdate(BaseModel):
    """Project update schema"""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    customer_id: Optional[uuid.UUID] = None
    order_id: Optional[uuid.UUID] = None


class ProjectResponse(ProjectBase):
    """Project response schema"""
    id: uuid.UUID
    owner_id: uuid.UUID
    order_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    total_hours: float = 0.0

    @model_validator(mode='wrap')
    @classmethod
    def calculate_total_hours(cls, data: Any, handler) -> Any:
        """Calculate total hours from all tasks and their time entries"""
        # If data is a SQLAlchemy model instance, calculate from its relationships
        total_hours = 0.0

        if not isinstance(data, dict) and hasattr(data, 'tasks'):
            total_minutes = 0
            try:
                for task in data.tasks:
                    if hasattr(task, 'time_entries'):
                        for entry in task.time_entries:
                            if entry.end_time and entry.start_time:
                                duration = entry.end_time - entry.start_time
                                total_minutes += duration.total_seconds() / 60

                total_hours = round(total_minutes / 60, 2)
            except Exception:
                total_hours = 0.0

        # Call the handler to create the model instance
        instance = handler(data)

        # Override the total_hours on the created instance
        object.__setattr__(instance, 'total_hours', total_hours)

        return instance

    class Config:
        from_attributes = True


"""
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(None, max_length=500)


class ProjectUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(None, max_length=500)
"""
