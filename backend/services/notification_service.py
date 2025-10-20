"""
Notification service layer
Provides helper functions for creating and managing notifications
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from uuid import UUID

from models.notifications import (
    Notification,
    NotificationCreate,
    NotificationType,
)
from loguru import logger


def create_notification(
    db: Session,
    user_id: UUID,
    notification_type: NotificationType,
    title: str,
    message: str,
    actor_id: Optional[UUID] = None,
    related_task_id: Optional[UUID] = None,
    related_project_id: Optional[UUID] = None,
    related_comment_id: Optional[UUID] = None,
) -> Notification:
    """
    Create a new notification

    Args:
        db: Database session
        user_id: ID of the user who will receive the notification
        notification_type: Type of notification
        title: Notification title
        message: Notification message
        actor_id: ID of the user who triggered the notification
        related_task_id: Optional ID of related task
        related_project_id: Optional ID of related project
        related_comment_id: Optional ID of related comment

    Returns:
        Created notification object
    """
    try:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            actor_id=actor_id,
            related_task_id=related_task_id,
            related_project_id=related_project_id,
            related_comment_id=related_comment_id,
            is_read=False,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        logger.info(f"Created notification {notification.id} for user {user_id}")
        return notification

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating notification: {str(e)}")
        raise


def get_user_notifications(
    db: Session,
    user_id: UUID,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> List[Notification]:
    """
    Get notifications for a user

    Args:
        db: Database session
        user_id: User ID
        unread_only: If True, only return unread notifications
        limit: Maximum number of notifications to return
        offset: Number of notifications to skip

    Returns:
        List of notifications
    """
    query = db.query(Notification).filter(Notification.user_id == user_id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = (
        query.order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return notifications


def mark_notification_as_read(
    db: Session,
    notification_id: UUID,
    user_id: UUID,
) -> Notification:
    """
    Mark a notification as read

    Args:
        db: Database session
        notification_id: Notification ID
        user_id: User ID (for authorization check)

    Returns:
        Updated notification

    Raises:
        ValueError: If notification not found or user not authorized
    """
    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
    ).first()

    if not notification:
        raise ValueError("Notification not found or unauthorized")

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)
        logger.info(f"Marked notification {notification_id} as read")

    return notification


def mark_all_as_read(
    db: Session,
    user_id: UUID,
) -> int:
    """
    Mark all notifications as read for a user

    Args:
        db: Database session
        user_id: User ID

    Returns:
        Number of notifications marked as read
    """
    count = db.query(Notification).filter(
        and_(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
    ).update(
        {
            "is_read": True,
            "read_at": datetime.utcnow()
        },
        synchronize_session=False
    )

    db.commit()
    logger.info(f"Marked {count} notifications as read for user {user_id}")

    return count


def delete_notification(
    db: Session,
    notification_id: UUID,
    user_id: UUID,
) -> bool:
    """
    Delete a notification

    Args:
        db: Database session
        notification_id: Notification ID
        user_id: User ID (for authorization check)

    Returns:
        True if deleted successfully

    Raises:
        ValueError: If notification not found or user not authorized
    """
    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
    ).first()

    if not notification:
        raise ValueError("Notification not found or unauthorized")

    db.delete(notification)
    db.commit()
    logger.info(f"Deleted notification {notification_id}")

    return True


def get_unread_count(
    db: Session,
    user_id: UUID,
) -> int:
    """
    Get count of unread notifications for a user

    Args:
        db: Database session
        user_id: User ID

    Returns:
        Number of unread notifications
    """
    count = db.query(Notification).filter(
        and_(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
    ).count()

    return count


# Helper functions for creating specific notification types

def notify_task_assignment(
    db: Session,
    assignee_id: UUID,
    assigner_id: UUID,
    task_id: UUID,
    task_title: str,
) -> Notification:
    """Create a notification for task assignment"""
    return create_notification(
        db=db,
        user_id=assignee_id,
        notification_type=NotificationType.TASK_ASSIGNED,
        title="New Task Assigned",
        message=f"You have been assigned to task: {task_title}",
        actor_id=assigner_id,
        related_task_id=task_id,
    )


def notify_task_completion(
    db: Session,
    owner_id: UUID,
    completer_id: UUID,
    task_id: UUID,
    task_title: str,
) -> Notification:
    """Create a notification for task completion"""
    return create_notification(
        db=db,
        user_id=owner_id,
        notification_type=NotificationType.TASK_COMPLETED,
        title="Task Completed",
        message=f"Task has been completed: {task_title}",
        actor_id=completer_id,
        related_task_id=task_id,
    )


def notify_comment_added(
    db: Session,
    recipient_id: UUID,
    commenter_id: UUID,
    task_id: UUID,
    comment_id: UUID,
    task_title: str,
) -> Notification:
    """Create a notification for new comment"""
    return create_notification(
        db=db,
        user_id=recipient_id,
        notification_type=NotificationType.COMMENT_ADDED,
        title="Neuer Kommentar",
        message=f"Neuer Kommentar zur Aufgabe: {task_title}",
        actor_id=commenter_id,
        related_task_id=task_id,
        related_comment_id=comment_id,
    )


def notify_project_assignment(
    db: Session,
    member_id: UUID,
    assigner_id: UUID,
    project_id: UUID,
    project_name: str,
) -> Notification:
    """Create a notification for project assignment"""
    return create_notification(
        db=db,
        user_id=member_id,
        notification_type=NotificationType.PROJECT_ASSIGNED,
        title="Added to Project",
        message=f"You have been added to project: {project_name}",
        actor_id=assigner_id,
        related_project_id=project_id,
    )
