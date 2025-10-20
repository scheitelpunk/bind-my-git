"""
Tasks API router with overlap prevention
"""
import math
import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, status, Query, HTTPException
from loguru import logger
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from auth.user import get_current_user
from database.connection import get_db_session
from models.members import ProjectMember
from models.project import Project
from models.task import Task
from models.task import TaskCreate, PaginatedResponse, TaskUpdate, TaskAssigneeUpdate, TaskResponse, TimeEntry
from models.user import User
from utils.helper import lookup_user, lookup_task, require_any_role, is_regular_user

router = APIRouter()


@router.post("/", response_model=TaskResponse, tags=["tasks"],
             dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def create_task(
        task: TaskCreate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Create a new task.

    This endpoint creates a new task in the system using the provided task data.
    The task will be associated with the current authenticated user.

    Arguments:
        task (TaskCreate): The task data to be created
        current_user (Dict[str, Any]): The current authenticated user
        db (Session): Database session

    Returns:
        TaskResponse: The created task
    """
    logger.info(f"Creating new task for user: {current_user}")
    db_user = await lookup_user(current_user, db)

    db_task = Task(
        title=task.title,
        description=task.description,
        project_id=task.project_id,
        id=uuid.uuid4(),
        created_by=db_user.id,
        assigned_to=task.assigned_to,
        item_id=task.item_id,
        estimated_hours=task.estimated_hours,
        due_date=task.due_date,
        status=task.status,
        priority=task.priority,
        external=task.external,
        billable=task.billable,
    )

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


# Projects endpoints
@router.get(f"/", response_model=PaginatedResponse[TaskResponse], tags=["tasks"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_tasks(
        project_id: Optional[uuid.UUID] = Query(None, description="Filter by project ID"),
        status: Optional[str] = Query(None, description="Filter by task status"),
        priority: Optional[str] = Query(None, description="Filter by task priority"),
        search: Optional[str] = Query(None, description="Search by task title or description"),
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session),
        page: int = 0,
        size: int = 100
):
    """
    Retrieve a paginated list of tasks with optional filters.

    Parameters:
        project_id: Filter by project ID
        status: Filter by task status
        priority: Filter by task priority
        search: Search term to filter by task title or description
        current_user: The current authenticated user
        db: Database session
        page: Page number for pagination
        size: Number of items per page

    Returns:
        PaginatedResponse[TaskResponse]: Paginated list of tasks
    """
    logger.info(f"Retrieving tasks for user: {current_user}")
    db_user = await lookup_user(current_user, db)

    # Calculate offset from page and size
    skip = page * size

    # Build base query
    if await is_regular_user(current_user):
        # Filter to only tasks from projects where user is owner or member
        query = (
            db.query(Task)
            .join(Project, Task.project_id == Project.id)
            .outerjoin(Project.user_member_view)
            .filter(
                or_(
                    Project.owner_id == db_user.id,
                    User.id == db_user.id
                )
            )
            .distinct()
        )
    else:
        # Admin and project_manager see all tasks
        query = db.query(Task)

    # Apply filters
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Task.title.ilike(search_pattern),
                Task.description.ilike(search_pattern)
            )
        )

    # Get total count for pagination metadata (after filters)
    total_count = query.count()

    # Get the tasks for current page
    tasks = query.offset(skip).limit(size).all()

    # Calculate pagination metadata
    total_pages = math.ceil(total_count / size) if size > 0 else 0
    has_next = page < (total_pages - 1) if total_pages > 0 else False
    has_previous = page > 0

    logger.info(f"Retrieved {len(tasks)} tasks for page {page}")

    return PaginatedResponse(
        data=tasks,
        page=page,
        size=size,
        totalElements=total_count,
        totalPages=total_pages,
        hasNext=has_next,
        hasPrevious=has_previous
    )


@router.get(f"/my", response_model=List[TaskResponse], tags=["tasks"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_my_tasks(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    List projects available to the current user (owner or member).

    This function retrieves a list of projects where the current user is either the owner
    or a member. It uses information from the Keycloak authentication token to identify
    the current user and fetches corresponding project details from the database.

    Parameters:
    current_user: Dict[str, Any]
        A dictionary representing the currently authenticated user, provided by dependency
        injection via the use of the `get_current_user` function.
    db: Session
        Database session instance provided by dependency injection via the `get_db_session`
        function.

    Returns:
    List[ProjectResponse]
        A list of project data serialized into the `ProjectResponse` model.

    Raises:
    None
    """
    logger.info(current_user)
    """List projects available to the current user (owner or member)"""
    # Extract Keycloak user ID (subject) from token
    db_user = await lookup_user(current_user, db)

    # Query tasks assigned to the user
    tasks = db.query(Task).filter(Task.assigned_to == db_user.id).all()
    logger.info(f"Tasks found for user: {len(tasks)}")
    return tasks


@router.get(f"/tags", response_model=List[str], tags=["tasks"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_task_tags(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Fetches a list of task tags.

    The function retrieves task tags and returns them as a list of strings. The
    current user's information is logged for tracking purposes. This endpoint
    is defined as a GET request and assigns the response to a model that
    represents a list of strings. The functionality is tagged under "tasks".

    Parameters:
        current_user (Dict[str, Any]): The current user information fetched
            through dependency injection of `get_current_user`.
        db (Session): The database session fetched through dependency injection
            of `get_db_session`.

    Returns:
        List[str]: A list of task tags.

    """
    # todo - replace by real tags
    logger.info(current_user)
    return ["test_tag_1", "test_tag_2"]


@router.get("/{task_id}", response_model=TaskResponse, tags=["tasks"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_task(
        task_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Retrieve a single task by its ID.

    This endpoint retrieves detailed information about a specific task including
    all its properties and calculated actual hours based on time entries.

    Parameters:
        task_id (str): The unique identifier of the task to retrieve
        current_user (Dict[str, Any]): The current authenticated user
        db (Session): Database session

    Returns:
        TaskResponse: The task with all details and calculated actual_hours

    Raises:
        HTTPException 404: If the task is not found
    """
    logger.info(f"Retrieving task {task_id} for user: {current_user}")
    db_user = await lookup_user(current_user, db)
    db_task = await lookup_task(task_id, db)

    # Calculate actual hours using database aggregation
    total_minutes = db.query(func.sum(TimeEntry.duration_minutes)).filter(
        TimeEntry.task_id == db_task.id,
        TimeEntry.duration_minutes.isnot(None)
    ).scalar() or 0

    db_task.actual_hours = Decimal(total_minutes) / 60

    return db_task


@router.put("/{task_id}", response_model=TaskResponse, tags=["tasks"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def update_task(
        task_id: str,
        task: TaskUpdate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Updates an existing task with new details provided by the user.

    This method handles the update of task details such as title, description,
    and project ID for the specified task ID. It ensures that the requesting
    user has appropriate access to perform the operation and interacts with the
    database to persist the changes.

    Authorization: User must be either:
    - An admin (global role)
    - A project_manager (global role)
    - The user currently assigned to the task
    - A MANAGER in the specific project's project_members table

    Args:
        task_id (str): The unique identifier of the task to be updated.
        task (TaskUpdate): The object containing the updated data for the task.
        current_user (Dict[str, Any]): The currently authenticated user, injected
            using dependency.
        db (Session): The database session used to query and persist data, injected
            using dependency.

    Returns:
        Task: The updated task object with new changes persisted in the database.

    Raises:
        HTTPException 404: If the task with the specified ID is not found
        HTTPException 403: If the user doesn't have permission to update this task
    """
    logger.info(f"Updating task {task_id} for user: {current_user}")
    db_task, is_admin, is_project_manager, is_project_manager_role, is_task_assignee = await get_fine_grained_access_control(
        current_user, db, task_id)

    # Allow access if any of the conditions are met
    if not (is_admin or is_project_manager or is_task_assignee or is_project_manager_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You don't have permission to update this task."
        )

    if task.title is not None:
        db_task.title = task.title
    if task.description is not None:
        db_task.description = task.description
    if task.due_date is not None:
        db_task.due_date = task.due_date
    if task.estimated_hours is not None:
        db_task.estimated_hours = task.estimated_hours
    if task.status is not None:
        db_task.status = task.status
    if task.priority is not None:
        db_task.priority = task.priority
    if task.assigned_to is not None:
        db_task.assigned_to = task.assigned_to
    if task.item_id is not None:
        db_task.item_id = task.item_id
    if task.external is not None:
        db_task.external = task.external
    if task.billable is not None:
        db_task.billable = task.billable
    if task.assignee_id is not None:
        db_task.assigned_to = task.assignee_id

    db.commit()
    db.refresh(db_task)
    return db_task


async def get_fine_grained_access_control(current_user: dict[str, Any], db: Session, task_id: str) -> tuple[
    bool, bool, bool | Any, Any, Any | None]:
    db_user = await lookup_user(current_user, db)
    db_task = await lookup_task(task_id, db)

    # Check authorization: admin, project_manager, task assignee, or MANAGER in the project
    from auth.user import oidc_auth

    is_admin = oidc_auth.check_role(current_user, "admin")
    is_project_manager = oidc_auth.check_role(current_user, "project_manager")
    is_task_assignee = db_task.assigned_to == db_user.id

    # Check if user is a MANAGER in this task's project
    is_project_manager_role = db.query(ProjectMember).filter(
        ProjectMember.project_id == db_task.project_id,
        ProjectMember.user_id == db_user.id,
        ProjectMember.role == "MANAGER"
    ).first() is not None
    return db_task, is_admin, is_project_manager, is_project_manager_role, is_task_assignee


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["tasks"],
               dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def delete_task(
        task_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Delete an existing task.

    This endpoint deletes an existing task from the system.
    The task must exist and the user must have appropriate permissions.

    Authorization: User must be either:
    - An admin (global role)
    - A project_manager (global role)
    - The user currently assigned to the task
    - A MANAGER in the specific project's project_members table

    Arguments:
        task_id (str): The ID of the task to delete
        current_user (Dict[str, Any]): The current authenticated user
        db (Session): Database session

    Returns:
        None

    Raises:
        HTTPException 404: If task is not found
        HTTPException 403: If the user doesn't have permission to delete this task
    """
    logger.info(f"Deleting task {task_id} for user: {current_user}")
    db_task, is_admin, is_project_manager, is_project_manager_role, is_task_assignee = await get_fine_grained_access_control(
        current_user, db, task_id)

    # Allow access if any of the conditions are met
    if not (is_admin or is_project_manager or is_task_assignee or is_project_manager_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You don't have permission to delete this task."
        )

    db.delete(db_task)
    db.commit()


@router.patch("/{task_id}/assign", response_model=TaskResponse, tags=["tasks"],
              dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def update_assignee(
        task_id: str,
        assignee: TaskAssigneeUpdate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Updates the assignee of a specified task by task ID.

    Authorization: User must be either:
    - An admin (global role)
    - A project_manager (global role)
    - The user currently assigned to the task
    - A MANAGER in the specific project's project_members table

    Parameters:
    task_id: str
        The unique identifier of the task whose assignee will be updated.
    assignee: TaskAssigneeUpdate
        Data object containing the new assignee ID information.
    current_user: Dict[str, Any]
        The currently authenticated user making the request. This is retrieved
        through dependency injection.
    db: Session
        The database session for performing queries and data operations. This is
        provided through dependency injection.

    Returns:
    Task
        The updated task object after changes have been committed to the database.

    Raises:
    HTTPException
        If the task with the specified ID is not found, an HTTP 404 error
        will be raised.
        If the user doesn't have permission to update this task, an HTTP 403 error
        will be raised.
    """
    logger.info(f"Updating task {task_id} assignee for user: {current_user}")
    db_task, is_admin, is_project_manager, is_project_manager_role, is_task_assignee = await get_fine_grained_access_control(
        current_user, db, task_id)

    # Allow access if any of the conditions are met
    if not (is_admin or is_project_manager or is_task_assignee or is_project_manager_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You don't have permission to update this task's assignee."
        )

    db_task.assigned_to = assignee.assignee_id
    db.commit()
    db.refresh(db_task)
    return db_task


@router.patch("/{task_id}/status", response_model=TaskResponse, tags=["tasks"],
              dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def update_status(
        task_id: str,
        status_info: TaskUpdate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Update the status of a specified task.

    This endpoint allows updating the status of a task (e.g., "TODO", "IN_PROGRESS",
    "DONE"). Only the task status field is modified; other fields remain unchanged.

    Authorization: User must be either:
    - An admin (global role)
    - A project_manager (global role)
    - The user assigned to the task
    - A MANAGER in the specific project's project_members table

    Parameters:
        task_id (str): The unique identifier of the task whose status will be updated
        status_info (TaskUpdate): Data object containing the new status value
        current_user (Dict[str, Any]): The currently authenticated user making the request
        db (Session): The database session for performing queries and data operations

    Returns:
        TaskResponse: The updated task object after changes have been committed

    Raises:
        HTTPException 404: If the task with the specified ID is not found
        HTTPException 403: If the user doesn't have permission to update this task
    """
    logger.info(f"Updating task {task_id} status to {status_info.status} for user: {current_user}")
    db_task, is_admin, is_project_manager, is_project_manager_role, is_task_assignee = await get_fine_grained_access_control(
        current_user, db, task_id)

    # Allow access if any of the conditions are met
    if not (is_admin or is_project_manager or is_task_assignee or is_project_manager_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You don't have permission to update this task's status."
        )

    db_task.status = status_info.status
    db.commit()
    db.refresh(db_task)
    return db_task
