import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from auth.user import get_current_user
from database.connection import get_db_session
from models.user import User, UserResponse
from loguru import logger

from utils.helper import require_any_role


class UserCreate(BaseModel):
    keycloak_id: str = Field(..., min_length=1, max_length=100)


class UserUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


router = APIRouter()


@router.post("/", response_model=UserResponse, tags=["users"],
             dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def create_user(
        user: UserCreate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Create a new user.

    This endpoint creates a new user in the database with the provided details.
    The user's Keycloak ID is extracted from the authentication token.

    Parameters:
    project (UserCreate): The user details to create
    current_user (Dict[str, Any]): The current user's information from the token
    db (Session): The database session for executing queries

    Returns:
    UserResponse: The created user information

    Raises:
    HTTPException: If user creation fails or validation error occurs
    """
    keycloak_id = current_user.get("sub")

    logger.info(f"Creating user with Keycloak ID: {keycloak_id}")
    first_name = current_user.get("given_name")
    last_name = current_user.get("family_name")
    logger.info(f"User data: {first_name} {last_name}")

    # Check if user already exists
    existing_user = db.query(User).filter(User.keycloak_id == keycloak_id).first()
    if existing_user:
        if existing_user.first_name != first_name:
            existing_user.first_name = first_name
        if existing_user.last_name != last_name:
            existing_user.last_name = last_name
        db.commit()
        db.refresh(existing_user)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )

    # Create new user
    new_user = User(
        id=uuid.uuid4(),
        keycloak_id=keycloak_id,
        first_name=first_name,
        last_name=last_name,
        email=current_user.get("email"),
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Created user {new_user.id}")
    return new_user


@router.get("/", response_model=List[UserResponse], tags=["users"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def list_users(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    List all users.

    This endpoint retrieves all active users from the database.

    Parameters:
    current_user (Dict[str, Any]): The current user's information from the token
    db (Session): The database session for executing queries

    Returns:
    List[UserResponse]: List of all users

    Raises:
    HTTPException: If database query fails
    """
    users = db.query(User).filter(User.is_active == True).all()
    logger.info(f"Retrieved {len(users)} users")
    return users
