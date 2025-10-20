"""
User models and schemas
"""

from sqlalchemy import Column, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Generic, TypeVar
from datetime import datetime
import uuid

from database.connection import Base

# Association table for user roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id'), nullable=False),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id'), nullable=False),
    Column('assigned_at', DateTime(timezone=True), server_default=func.now())
)


class User(Base):
    """User model"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keycloak_id = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    owned_projects = relationship("Project", back_populates="owner")
    assigned_tasks = relationship("Task", foreign_keys="Task.assigned_to", back_populates="assignee")
    created_tasks = relationship("Task", foreign_keys="Task.created_by", back_populates="creator")
    time_entries = relationship("TimeEntry", back_populates="user")
    comments = relationship("Comments", back_populates="user")
    notifications = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user")


class Role(Base):
    """Role model"""
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")


# Pydantic models for API
class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    """User creation schema"""
    keycloak_id: str


class UserUpdate(BaseModel):
    """User update schema"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None


class RoleBase(BaseModel):
    """Base role schema"""
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Role creation schema"""
    pass


class RoleResponse(RoleBase):
    """Role response schema"""
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class UserResponse(UserBase):
    """User response schema"""
    id: uuid.UUID
    keycloak_id: str
    created_at: datetime
    updated_at: datetime
    roles: List[RoleResponse] = []

    class Config:
        from_attributes = True
