"""
Time Entries API Router

This module provides RESTful API endpoints for managing time tracking entries.
It includes functionality for:
- Starting and stopping time entries
- Preventing overlapping time entries
- Querying time entries with various filters
- Generating time entry summaries
- Managing billable and external time tracking

All endpoints require authentication and automatically associate entries with
the authenticated user. Access control is enforced at the project level.
"""

import uuid
from datetime import date
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query
from loguru import logger
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

from auth.user import get_current_user
from database.connection import get_db_session
from models.project import Project
from models.task import TimeEntry, TimeEntryCreate, TimeEntryUpdate, TimeEntryStop, TimeEntryResponse, \
    TimeEntrySummary
from models.user import User
from utils.helper import lookup_user, lookup_task, require_any_role

router = APIRouter()


@router.post("/", response_model=TimeEntryResponse,
             dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def start_time_entry(
        time_entry: TimeEntryCreate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Start a new time entry or create a completed time entry.

    This endpoint creates a new time tracking entry for the authenticated user.
    It performs several validation checks:
    - Verifies the task exists and user has access to it
    - Ensures no other time entry is currently running for the user
    - Prevents overlapping time entries

    Args:
        time_entry (TimeEntryCreate): Time entry data including task_id, start_time,
            optional end_time, description, and billable/external flags
        current_user (Dict[str, Any]): Authenticated user from JWT token
        db (Session): Database session dependency

    Returns:
        TimeEntryResponse: The created time entry with all fields populated

    Raises:
        HTTPException 404: If user or task is not found
        HTTPException 403: If user doesn't have access to the project
        HTTPException 400: If another entry is running or times overlap with existing entries
    """
    db_user = await lookup_user(current_user, db)

    # Verify task exists and user has access to it
    task = await lookup_task(str(time_entry.task_id), db)

    # Check if user has access to the project through membership or ownership
    project_member = db.query(Project).join(Project.members).filter(
        Project.id == task.project_id,
        User.id == db_user.id
    ).first()

    if not project_member and task.project.owner_id != db_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this project"
        )

    # Check for running time entries - only one entry can run at a time per user
    running_entry = db.query(TimeEntry).filter(
        TimeEntry.user_id == db_user.id,
        TimeEntry.is_running == True
    ).first()

    if running_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Another time entry is currently running. Stop it first."
        )

    # Check for overlapping time entries to maintain data integrity
    # Overlap occurs if the new entry's start time falls within an existing entry's time range
    start_time = time_entry.start_time
    overlapping_entry = db.query(TimeEntry).filter(
        TimeEntry.user_id == db_user.id,
        TimeEntry.id != time_entry.task_id,  # Different entry
        or_(
            # New entry starts during existing entry
            and_(
                TimeEntry.start_time <= start_time,
                or_(
                    TimeEntry.end_time.is_(None),
                    TimeEntry.end_time > start_time
                )
            )
        )
    ).first()

    if overlapping_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time entry overlaps with existing entry"
        )

    if time_entry.end_time:
        # Create new time entry
        db_time_entry = TimeEntry(
            user_id=db_user.id,
            task_id=time_entry.task_id,
            project_id=task.project_id,
            description=time_entry.description,
            start_time=start_time,
            end_time=time_entry.end_time,
            is_running=False,
            external=time_entry.external,
            billable=time_entry.billable
        )
    else:
        # Create new time entry
        db_time_entry = TimeEntry(
            user_id=db_user.id,
            task_id=time_entry.task_id,
            project_id=task.project_id,
            description=time_entry.description,
            start_time=start_time,
            is_running=True,
            external=time_entry.external,
            billable=time_entry.billable
        )

    db.add(db_time_entry)
    db.commit()
    db.refresh(db_time_entry)

    return db_time_entry


@router.put("/{entry_id}", response_model=TimeEntryResponse,
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def update_time_entry(
        entry_id: str,
        time_entry: TimeEntryUpdate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Update an existing time entry.

    Allows modification of time entry fields including description, timestamps,
    and billable/external status. Validates that updates don't create overlapping
    time periods and ensures end time is after start time.

    Args:
        entry_id (str): UUID of the time entry to update
        time_entry (TimeEntryUpdate): Updated fields (all optional)
        current_user (Dict[str, Any]): Authenticated user from JWT token
        db (Session): Database session dependency

    Returns:
        TimeEntryResponse: The updated time entry with recalculated duration

    Raises:
        HTTPException 404: If user or time entry is not found
        HTTPException 400: If end time is before start time or update creates overlaps
    """
    db_user = await lookup_user(current_user, db)

    # Convert entry_id string to UUID
    try:
        entry_uuid = uuid.UUID(entry_id) if isinstance(entry_id, str) else entry_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid entry ID format")

    # Get time entry
    db_time_entry = db.query(TimeEntry).filter(
        TimeEntry.id == entry_uuid,
        TimeEntry.user_id == db_user.id
    ).first()

    if not db_time_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )

    # Check for overlapping entries if updating times
    # This ensures data integrity when modifying time boundaries
    if time_entry.start_time or time_entry.end_time:
        start_time = time_entry.start_time or db_time_entry.start_time
        end_time = time_entry.end_time or db_time_entry.end_time

        if end_time and start_time >= end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time"
            )

        overlapping_entry = db.query(TimeEntry).filter(
            TimeEntry.user_id == db_user.id,
            TimeEntry.id != entry_uuid,
            or_(
                and_(
                    TimeEntry.start_time <= start_time,
                    or_(
                        TimeEntry.end_time.is_(None),
                        TimeEntry.end_time > start_time
                    )
                ),
                and_(
                    TimeEntry.start_time < end_time,
                    TimeEntry.end_time > end_time
                ) if end_time else False
            )
        ).first()

        if overlapping_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time entry overlaps with existing entry"
            )

    # Update fields selectively (only non-None values are updated)
    if time_entry.description is not None:
        db_time_entry.description = time_entry.description
    if time_entry.start_time is not None:
        db_time_entry.start_time = time_entry.start_time
    if time_entry.end_time is not None:
        db_time_entry.end_time = time_entry.end_time
        db_time_entry.is_running = False
        # Recalculate duration in minutes when end time is set
        db_time_entry.duration_minutes = int(
            (time_entry.end_time - db_time_entry.start_time).total_seconds() / 60
        )
    if time_entry.external is not None:
        db_time_entry.external = time_entry.external
    if time_entry.billable is not None:
        db_time_entry.billable = time_entry.billable

    db.commit()
    db.refresh(db_time_entry)

    return db_time_entry


@router.put("/{entry_id}/stop", response_model=TimeEntryResponse,
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def stop_time_entry(
        entry_id: str,
        stop_data: TimeEntryStop,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Stop a currently running time entry.

    This endpoint finalizes a running time entry by setting its end time and
    calculating the total duration. Once stopped, the entry is no longer
    considered running.

    Args:
        entry_id (str): UUID of the time entry to stop
        stop_data (TimeEntryStop): Contains the end_time for the entry
        current_user (Dict[str, Any]): Authenticated user from JWT token
        db (Session): Database session dependency

    Returns:
        TimeEntryResponse: The stopped time entry with calculated duration

    Raises:
        HTTPException 404: If user or time entry is not found
        HTTPException 400: If entry is not running or end time is before start time
    """
    db_user = await lookup_user(current_user, db)

    # Convert entry_id string to UUID
    try:
        entry_uuid = uuid.UUID(entry_id) if isinstance(entry_id, str) else entry_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid entry ID format")

    # Get time entry
    time_entry = db.query(TimeEntry).filter(
        TimeEntry.id == entry_uuid,
        TimeEntry.user_id == db_user.id
    ).first()

    if not time_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )

    if not time_entry.is_running:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time entry is not running"
        )

    if stop_data.end_time <= time_entry.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )

    # Update time entry - mark as stopped and calculate duration
    time_entry.end_time = stop_data.end_time
    time_entry.is_running = False
    # Calculate duration in minutes (rounded down to nearest minute)
    time_entry.duration_minutes = int(
        (stop_data.end_time - time_entry.start_time).total_seconds() / 60
    )

    db.commit()
    db.refresh(time_entry)

    return time_entry


@router.get("/", response_model=List[TimeEntryResponse],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_time_entries(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        task_id: Optional[str] = Query(None),
        project_id: Optional[str] = Query(None),
        start_date: Optional[date] = Query(None),
        end_date: Optional[date] = Query(None),
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Get paginated time entries for the current user with optional filters.

    Returns a list of time entries ordered by start time (most recent first).
    Supports filtering by task, project, and date range. Results are paginated
    for performance.

    Args:
        skip (int): Number of records to skip for pagination (default: 0)
        limit (int): Maximum number of records to return (default: 100, max: 1000)
        task_id (str, optional): Filter by specific task UUID
        project_id (str, optional): Filter by specific project UUID
        start_date (date, optional): Filter entries starting on or after this date
        end_date (date, optional): Filter entries starting on or before this date
        current_user (Dict[str, Any]): Authenticated user from JWT token
        db (Session): Database session dependency

    Returns:
        List[TimeEntryResponse]: List of time entries matching the criteria

    Raises:
        HTTPException 404: If user is not found
    """
    db_user = await lookup_user(current_user, db)

    # Base query - only user's own entries
    query = db.query(TimeEntry).filter(TimeEntry.user_id == db_user.id)

    # Apply optional filters dynamically
    if task_id:
        query = query.filter(TimeEntry.task_id == task_id)

    if project_id:
        query = query.filter(TimeEntry.project_id == project_id)

    if start_date:
        # Filter by date portion of start_time
        query = query.filter(func.date(TimeEntry.start_time) >= start_date)

    if end_date:
        query = query.filter(func.date(TimeEntry.start_time) <= end_date)

    # Order by start time descending (most recent first)
    query = query.order_by(TimeEntry.start_time.desc())

    time_entries = query.offset(skip).limit(limit).all()
    return time_entries


@router.get("/running", response_model=Optional[TimeEntryResponse],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_running_time_entry(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Get the currently running time entry for the authenticated user.

    Returns the active time entry if one is running, or None if no entry
    is currently active. Only one time entry can be running at a time per user.

    Args:
        current_user (Dict[str, Any]): Authenticated user from JWT token
        db (Session): Database session dependency

    Returns:
        Optional[TimeEntryResponse]: The running time entry or None

    Raises:
        HTTPException 404: If user is not found
    """
    db_user = await lookup_user(current_user, db)

    running_entry = db.query(TimeEntry).filter(
        TimeEntry.user_id == db_user.id,
        TimeEntry.is_running == True
    ).first()

    return running_entry


@router.get("/active", response_model=Optional[TimeEntryResponse],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_active_time_entry(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Get the currently active/running time entry for the authenticated user.

    This is an alias endpoint for /running with identical functionality.
    Returns the active time entry if one is running, or None if no entry
    is currently active.

    Args:
        current_user (Dict[str, Any]): Authenticated user from JWT token
        db (Session): Database session dependency

    Returns:
        Optional[TimeEntryResponse]: The running time entry or None

    Raises:
        HTTPException 404: If user is not found
    """
    db_user = await lookup_user(current_user, db)

    running_entry = db.query(TimeEntry).filter(
        TimeEntry.user_id == db_user.id,
        TimeEntry.is_running == True
    ).first()

    return running_entry


@router.get("/summary", response_model=List[TimeEntrySummary],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_time_summary(
        start_date: Optional[date] = Query(None),
        end_date: Optional[date] = Query(None),
        project_id: Optional[str] = Query(None),
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Get aggregated time entry summary grouped by date.

    Provides daily summaries of completed time entries including total minutes,
    total hours, and entry counts. Running entries are excluded from the summary.
    Useful for generating timesheets and reports.

    Args:
        start_date (date, optional): Filter summaries from this date onwards
        end_date (date, optional): Filter summaries up to this date
        project_id (str, optional): Filter by specific project UUID
        current_user (Dict[str, Any]): Authenticated user from JWT token
        db (Session): Database session dependency

    Returns:
        List[TimeEntrySummary]: Daily summaries with date, total_minutes,
            total_hours, and entries_count

    Raises:
        HTTPException 404: If user is not found
    """
    db_user = await lookup_user(current_user, db)

    # Aggregate query: group by date and sum durations
    query = db.query(
        func.date(TimeEntry.start_time).label('date'),
        func.sum(TimeEntry.duration_minutes).label('total_minutes'),
        func.count(TimeEntry.id).label('entries_count')
    ).filter(
        TimeEntry.user_id == db_user.id,
        TimeEntry.end_time.isnot(None)  # Only completed entries (exclude running)
    )

    if project_id:
        query = query.filter(TimeEntry.project_id == project_id)

    if start_date:
        query = query.filter(func.date(TimeEntry.start_time) >= start_date)

    if end_date:
        query = query.filter(func.date(TimeEntry.start_time) <= end_date)

    summary = query.group_by(func.date(TimeEntry.start_time)).all()

    return [
        TimeEntrySummary(
            date=str(row.date),
            total_minutes=row.total_minutes or 0,
            total_hours=round((row.total_minutes or 0) / 60, 2),
            entries_count=row.entries_count
        )
        for row in summary
    ]


@router.delete("/{entry_id}", dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def delete_time_entry(
        entry_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Delete a time entry permanently.

    Removes a time entry from the database. Users can only delete their own
    time entries. This operation is irreversible.

    Args:
        entry_id (str): UUID of the time entry to delete
        current_user (Dict[str, Any]): Authenticated user from JWT token
        db (Session): Database session dependency

    Returns:
        dict: Success message confirming deletion

    Raises:
        HTTPException 404: If user or time entry is not found
    """
    db_user = await lookup_user(current_user, db)

    # Convert entry_id string to UUID
    try:
        entry_uuid = uuid.UUID(entry_id) if isinstance(entry_id, str) else entry_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid entry ID format")

    # Get time entry
    time_entry = db.query(TimeEntry).filter(
        TimeEntry.id == entry_uuid,
        TimeEntry.user_id == db_user.id
    ).first()

    if not time_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )

    db.delete(time_entry)
    db.commit()

    return {"message": "Time entry deleted successfully"}


@router.get("/my", response_model=List[TimeEntryResponse], tags=["time-tracking"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_my_time_entries(
        dateFrom: Optional[str] = Query(None, description="Start date for filtering (ISO date string)"),
        dateTo: Optional[str] = Query(None, description="End date for filtering (ISO date string)"),
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Fetch user-specific time entries based on provided date range.

    This endpoint retrieves time entries for the currently authenticated user
    within the specified date range. The user's identity is verified using
    the authentication token, and appropriate database queries are performed
    to fetch the matching time entries.

    Arguments:
        dateFrom (str, optional): The starting date to filter time entries (ISO format).
        dateTo (str, optional): The ending date to filter time entries (ISO format).
        current_user (Dict[str, Any], optional): The current authenticated user obtained
            from the dependency.
        db (Session, optional): The database session injected as a dependency.

    Returns:
        List[TimeEntryResponse]: List of time entry records matching the criteria.

    Raises:
        HTTPException: If authentication fails or the user is not found in the database.
    """
    logger.info(f"Fetching time entries for user: {current_user} between {dateFrom} and {dateTo}")
    db_user = await lookup_user(current_user, db)

    query = db.query(TimeEntry).filter(TimeEntry.user_id == db_user.id)

    if dateFrom:
        query = query.filter(func.date(TimeEntry.start_time) >= dateFrom)
    if dateTo:
        query = query.filter(func.date(TimeEntry.start_time) <= dateTo)

    entries = query.order_by(TimeEntry.start_time.desc()).all()
    return entries
