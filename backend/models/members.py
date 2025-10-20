"""
ProjectMember model and schemas mapping to project_members table
"""
import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base
from models.user import UserResponse

# Forward reference for ProjectResponse
class UserResponseMinimal(BaseModel):
    """User response schema"""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True
    id: uuid.UUID
    keycloak_id: str

    class Config:
        from_attributes = True

class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    role = Column(String(50), default='member')
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Optional relationships (no back_populates to avoid changing other models)
    # project = relationship("Project", primaryjoin="ProjectMember.project_id==Project.id", viewonly=True)
    user = relationship("User", primaryjoin="ProjectMember.user_id==User.id", viewonly=True)


# Pydantic schemas
class MemberBase(BaseModel):
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: Optional[str] = "member"


class MemberResponse(MemberBase):
    id: uuid.UUID
    joined_at: datetime
    user: UserResponseMinimal

    class Config:
        from_attributes = True


class ProjectMemberAdd(MemberBase):
    pass


class ProjectMemberList(BaseModel):
    users: Optional[List[UserResponse]] = None