"""
Notifications API router
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from starlette import status

from auth.user import get_current_user
from database.connection import get_db_session
from models.notifications import (
    NotificationResponse,
    NotificationCreate,
    NotificationUpdate,
)
from services.notification_service import (
    create_notification,
    get_user_notifications,
    mark_notification_as_read,
    mark_all_as_read,
    delete_notification,
    get_unread_count,
)

from loguru import logger
from utils.helper import lookup_user

router = APIRouter()


@router.get("/", response_model=List[NotificationResponse], tags=["notifications"])
async def get_notifications(
    unread_only: bool = Query(False, description="Return only unread notifications"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of notifications to return"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """
    Get notifications for the current user

    Args:
        unread_only: If True, only return unread notifications
        limit: Maximum number of notifications to return (1-100)
        offset: Number of notifications to skip for pagination
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of notifications
    """
    logger.info(f"Fetching notifications for user (unread_only={unread_only})")

    db_user = await lookup_user(current_user, db)
    notifications = get_user_notifications(
        db=db,
        user_id=db_user.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )

    logger.info(f"Retrieved {len(notifications)} notifications")
    return notifications


@router.get("/unread-count", response_model=Dict[str, int], tags=["notifications"])
async def get_unread_notification_count(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """
    Get count of unread notifications for the current user

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Dictionary with unread count
    """
    db_user = await lookup_user(current_user, db)
    count = get_unread_count(db=db, user_id=db_user.id)

    logger.info(f"User has {count} unread notifications")
    return {"count": count}


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED, tags=["notifications"])
async def create_notification_endpoint(
    notification: NotificationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """
    Create a new notification (admin only)

    Args:
        notification: Notification data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created notification
    """
    logger.info(f"Creating notification for user {notification.user_id}")

    # TODO: Add admin role check here
    # For now, allow any authenticated user to create notifications

    new_notification = create_notification(
        db=db,
        user_id=notification.user_id,
        notification_type=notification.type,
        title=notification.title,
        message=notification.message,
        actor_id=notification.actor_id,
        related_task_id=notification.related_task_id,
        related_project_id=notification.related_project_id,
        related_comment_id=notification.related_comment_id,
    )

    logger.info(f"Created notification {new_notification.id}")
    return new_notification


@router.patch("/{notification_id}/read", response_model=NotificationResponse, tags=["notifications"])
async def mark_notification_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """
    Mark a notification as read

    Args:
        notification_id: Notification ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated notification
    """
    logger.info(f"Marking notification {notification_id} as read")

    db_user = await lookup_user(current_user, db)

    try:
        notification = mark_notification_as_read(
            db=db,
            notification_id=notification_id,
            user_id=db_user.id,
        )
        logger.info(f"Marked notification {notification_id} as read")
        return notification

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/mark-all-read", response_model=Dict[str, int], tags=["notifications"])
async def mark_all_notifications_read(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """
    Mark all notifications as read for the current user

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Dictionary with count of notifications marked as read
    """
    logger.info("Marking all notifications as read")

    db_user = await lookup_user(current_user, db)
    count = mark_all_as_read(db=db, user_id=db_user.id)

    logger.info(f"Marked {count} notifications as read")
    return {"count": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["notifications"])
async def delete_notification_endpoint(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """
    Delete a notification

    Args:
        notification_id: Notification ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        None
    """
    logger.info(f"Deleting notification {notification_id}")

    db_user = await lookup_user(current_user, db)

    try:
        delete_notification(
            db=db,
            notification_id=notification_id,
            user_id=db_user.id,
        )
        logger.info(f"Deleted notification {notification_id}")
        return None

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
