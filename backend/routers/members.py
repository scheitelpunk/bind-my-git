"""
Tasks API router with overlap prevention and member management
"""
import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from auth.user import get_current_user
from database.connection import get_db_session
from models.members import ProjectMemberAdd, ProjectMemberList, ProjectMember
from models.project import Project
from models.user import User, UserResponse
from loguru import logger

router = APIRouter()


