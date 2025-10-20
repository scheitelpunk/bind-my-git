from typing import Dict, Any

from fastapi import Depends, HTTPException
from loguru import logger
from sqlalchemy.orm import Session
from starlette import status

from auth.user import get_current_user, oidc_auth
from models.task import Task
from models.user import User


async def lookup_user(current_user: dict[str, Any], db: Session) -> Any | None:
    keycloak_id = current_user.get("sub")
    db_user = db.query(User).filter(User.keycloak_id == keycloak_id).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


async def lookup_task(task_id: str, db: Session) -> Any | None:
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    return db_task


def require_role(role: str):
    """
    Dependency factory for role-based access control
    """

    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        if not oidc_auth.check_role(current_user, role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {role}"
            )
        return current_user

    return role_checker


def require_any_role(*roles: str):
    """
    Dependency factory for multiple role access control
    """

    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        user_has_role = any(oidc_auth.check_role(current_user, role) for role in roles)
        if not user_has_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required any of roles: {list(roles)}"
            )
        return current_user

    return role_checker


async def is_regular_user(current_user: dict[str, Any]) -> bool:
    # Build base query
    all_roles = oidc_auth.get_all_roles(current_user)
    is_only_developer = True

    for current_role in all_roles:

        logger.info(f"current role: {current_role}")

        if current_role == "admin":
            is_only_developer = False
        if current_role == "project_manager":
            is_only_developer = False

    logger.info(f"is_only_developer: {is_only_developer}")
    return is_only_developer
