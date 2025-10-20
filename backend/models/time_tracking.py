from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime, timezone
import uuid

from database.connection import Base
from models.task import TaskResponse


class TimeTracking(BaseModel):
    id: Optional[uuid.UUID] = None
    task_id: uuid.UUID
    task: Optional[TaskResponse] = None
    start_time: Optional[datetime] = None
    description: str
