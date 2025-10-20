"""
Comments API router with notification support
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from starlette import status

from auth.user import get_current_user
from database.connection import get_db_session
from models.comments import Comments, CommentsResponse, CommentsCreate
from models.task import Task
from models.notifications import NotificationType

from loguru import logger

from models.user import User
from utils.helper import lookup_user, require_any_role
from services.notification_service import notify_comment_added

router = APIRouter()


@router.get("/{task_id}", response_model=List[CommentsResponse], tags=["comments"],
            dependencies=[Depends(require_any_role("admin", "manager", "developer"))])
async def get_comments(
        task_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db_session)):
    """
    Fetch all comments for a specific task.

    This endpoint retrieves all comments associated with a given task ID.
    Requires that the current user has one of the roles: admin, manager, or developer.

    Parameters:
        task_id (str): The unique identifier of the task
        current_user (Dict[str, Any]): The authenticated user information
        db (Session): Database session for executing queries

    Returns:
        List[CommentsResponse]: List of all comments for the task

    Raises:
        HTTPException 404: If no comments are found for the task
    """
    logger.info(f"Fetching comments for task_id: {task_id}")

    # Convert task_id string to UUID
    try:
        task_uuid = uuid.UUID(task_id) if isinstance(task_id, str) else task_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format")

    db_comments = db.query(Comments).filter(Comments.task_id == task_uuid).all()
    if not db_comments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No comments found for this task"
        )

    logger.info(f"Retrieved {len(db_comments)} comments")

    return db_comments


@router.post("/{task_id}", response_model=CommentsResponse, status_code=status.HTTP_201_CREATED, tags=["comments"],
             dependencies=[Depends(require_any_role("admin", "manager", "developer"))])
async def create_comment(
        task_id: str,
        comment: CommentsCreate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """
    Create a new comment on a task.

    This endpoint creates a new comment for the specified task and automatically
    creates notifications for relevant users (task assignee). The comment is
    associated with the authenticated user who creates it.

    Parameters:
        task_id (str): The unique identifier of the task to comment on
        comment (CommentsCreate): The comment content to create
        current_user (Dict[str, Any]): The authenticated user information
        db (Session): Database session for executing queries

    Returns:
        CommentsResponse: The created comment with all fields populated

    Raises:
        HTTPException 404: If the task is not found
    """
    logger.info(f"Creating comment for task_id: {task_id}")

    # Convert task_id string to UUID
    try:
        task_uuid = uuid.UUID(task_id) if isinstance(task_id, str) else task_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format")

    db_user = await lookup_user(current_user, db)

    # Get the task to determine who to notify
    task = db.query(Task).filter(Task.id == task_uuid).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    new_comment = Comments(
        task_id=task_uuid,
        user_id=db_user.id,
        content=comment.content
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    logger.info(f"Created comment {new_comment.id}")

    # Create notifications for relevant users (assignee and creator, but not the commenter)
    users_to_notify = set()

    # Notify task assignee if exists and is not the commenter
    # if task.assigned_to and task.assigned_to != db_user.id:
    users_to_notify.add(task.assigned_to)

    logger.info(f"Users to notify: {users_to_notify}")

    # Notify task creator if is not the commenter and not already in the set
    # if task.created_by and task.created_by != db_user.id:
    #    users_to_notify.add(task.created_by)

    # Create notifications for each user
    for user_id in users_to_notify:
        try:
            logger.info(f"trying to notify: {users_to_notify}")
            notify_comment_added(
                db=db,
                recipient_id=user_id,
                commenter_id=db_user.id,
                task_id=task.id,
                comment_id=new_comment.id,
                task_title=task.title
            )
            logger.info(f"Created notification for user {user_id}")
        except Exception as e:
            # Don't fail the comment creation if notification fails
            logger.error(f"Failed to create notification for user {user_id}: {str(e)}")

    return new_comment


@router.put("/{comment_id}", response_model=CommentsResponse, tags=["comments"],
            dependencies=[Depends(require_any_role("admin", "manager", "developer"))])
async def update_comment(
        comment_id: str,
        comment: CommentsCreate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """
    Update an existing comment.

    This endpoint allows users to update their own comments. Users can only
    modify comments they have created. Authorization is enforced to prevent
    users from editing other users' comments.

    Parameters:
        comment_id (str): The unique identifier of the comment to update
        comment (CommentsCreate): The new comment content
        current_user (Dict[str, Any]): The authenticated user information
        db (Session): Database session for executing queries

    Returns:
        CommentsResponse: The updated comment with all fields

    Raises:
        HTTPException 404: If the comment is not found
        HTTPException 403: If the user is not authorized to update this comment
    """
    logger.info(f"Updating comment: {comment_id}")

    # Convert comment_id string to UUID
    try:
        comment_uuid = uuid.UUID(comment_id) if isinstance(comment_id, str) else comment_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid comment ID format")

    db_user = await lookup_user(current_user, db)

    db_comment = db.query(Comments).filter(Comments.id == comment_uuid).first()
    if not db_comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    logger.info(f"Updating comment {db_comment.user_id} {db_user.id}")
    # Only allow the comment author to update
    if db_comment.user_id != db_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this comment"
        )

    db_comment.content = comment.content
    db.commit()
    db.refresh(db_comment)

    logger.info(f"Updated comment {comment_id}")

    return db_comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["comments"],
               dependencies=[Depends(require_any_role("admin", "manager", "developer"))])
async def delete_comment(
        comment_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """
    Delete an existing comment.

    This endpoint allows users to permanently delete their own comments. Users can
    only delete comments they have created. Authorization is enforced to prevent
    users from deleting other users' comments.

    Parameters:
        comment_id (str): The unique identifier of the comment to delete
        current_user (Dict[str, Any]): The authenticated user information
        db (Session): Database session for executing queries

    Returns:
        None

    Raises:
        HTTPException 404: If the comment is not found
        HTTPException 403: If the user is not authorized to delete this comment
    """
    logger.info(f"Deleting comment: {comment_id}")

    # Convert comment_id string to UUID
    try:
        comment_uuid = uuid.UUID(comment_id) if isinstance(comment_id, str) else comment_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid comment ID format")

    db_user = await lookup_user(current_user, db)

    db_comment = db.query(Comments).filter(Comments.id == comment_uuid).first()
    if not db_comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    # Only allow the comment author to delete
    if db_comment.user_id != db_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this comment"
        )

    db.delete(db_comment)
    db.commit()

    logger.info(f"Deleted comment {comment_id}")

    return None
