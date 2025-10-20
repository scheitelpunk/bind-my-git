"""
Time Tracking API router for managing time entries

This module provides endpoints for tracking time spent on tasks,
including starting/stopping timers, querying time entries, and
generating time summaries.
"""
import datetime
import uuid
from typing import Dict, Any, Optional
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi import Query
from loguru import logger
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.user import get_current_user
from database.connection import get_db_session
from models.task import Task, TimeEntry, TimeEntryResponse
from utils.helper import lookup_user, require_any_role


class ProjectBreakdown(BaseModel):
    project_id: uuid.UUID
    projectName: str
    hours: float


class TimeSummaryResponse(BaseModel):
    total_hours: float
    totalEntries: int
    averageHoursPerDay: float
    project_breakdown: List[ProjectBreakdown]


from models.time_tracking import TimeTracking

router = APIRouter()


@router.post("/start", response_model=TimeTracking, tags=["time-tracking"],
             dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def start_time_entry(
        task_info: TimeTracking,
        description: str = None,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Start a new time entry for the current user.

    This endpoint creates a new time tracking entry and marks it as running.
    It validates that no other time entry is currently active for the user,
    as only one timer can run at a time per user.

    Arguments:
        task_info (TimeTracking): Time tracking information including task_id and description
        description (str): Optional description of the work being done
        current_user (Dict[str, Any]): The current authenticated user
        db (Session): Database session

    Returns:
        TimeTracking: The created time entry with start time set and is_running=True

    Raises:
        HTTPException 404: If the specified task is not found
        HTTPException 400: If another time entry is already running for this user
    """
    logger.info(f"Starting time entry for user: {current_user} on task: {task_info}")
    db_user = await lookup_user(current_user, db)

    logger.info(f"querying for task")
    real_task_info = db.query(Task).filter(Task.id == task_info.task_id).first()
    if not real_task_info:
        raise HTTPException(status_code=404, detail="Task not found")

    logger.info(f"querying for time entry")

    # Check for active time entries
    active_entry = db.query(TimeEntry).filter(
        TimeEntry.user_id == db_user.id,
        TimeEntry.is_running == True
    ).first()

    if active_entry:
        raise HTTPException(
            status_code=400,
            detail="Another time entry is already running"
        )

    logger.info(f"creating time entry")

    new_entry = TimeEntry(
        task_id=task_info.task_id,
        user_id=db_user.id,
        start_time=datetime.datetime.now(),
        project_id=real_task_info.project_id,
        description=task_info.description,
        is_running=True
    )

    logger.info(f"adding entry")

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return new_entry


@router.post("/stop", response_model=TimeEntryResponse, tags=["time-tracking"],
             dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def stop_active_time_entry(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Stop the currently active time entry for the current user.

    This endpoint stops the running time entry by setting the end time to the
    current timestamp and marking it as not running. The duration is automatically
    calculated based on the start and end times.

    Arguments:
        current_user (Dict[str, Any]): The current authenticated user
        db (Session): Database session

    Returns:
        TimeEntryResponse: Updated time entry with end time set and is_running=False

    Raises:
        HTTPException 404: If no active time entry is found for this user
    """
    logger.info(f"Stopping active time entry for user: {current_user}")
    db_user = await lookup_user(current_user, db)

    active_entry = db.query(TimeEntry).filter(
        TimeEntry.user_id == db_user.id,
        TimeEntry.is_running == True
    ).first()

    if not active_entry:
        raise HTTPException(status_code=404, detail="No active time entry found")

    active_entry.end_time = datetime.datetime.now()
    active_entry.is_running = False
    db.commit()

    return active_entry


@router.get("/active", response_model=Optional[TimeTracking], tags=["time-tracking"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_active_time_entries(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Get the active time entry for the current user.

    This endpoint retrieves the currently running time entry for the authenticated user.
    A time entry is considered active if it has is_running set to True. Only one time
    entry can be active at a time per user.

    Arguments:
        current_user (Dict[str, Any]): The current authenticated user
        db (Session): Database session

    Returns:
        Optional[TimeTracking]: The active time entry if one exists, None otherwise

    Raises:
        HTTPException 404: If the user is not found in the database
    """
    logger.info(f"Fetching active time entries for user: {current_user}")
    db_user = await lookup_user(current_user, db)

    logger.info(f"Retrieved user: {db_user}")
    logger.info(f"Retrieved user_id: {db_user.id}")

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    active_entries = db.query(TimeEntry).filter(
        TimeEntry.user_id == db_user.id,
        TimeEntry.is_running == True
    ).all()

    logger.info(f"Active time entries: {active_entries}")

    for entry in active_entries:
        return TimeTracking(id=entry.id, task_id=entry.task_id, start_time=entry.start_time, task=entry.task,
                            description=entry.description
                            )

    return None


@router.get("/my", response_model=List[TimeEntryResponse], tags=["time-tracking"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_my_time_entries(
        start_date: datetime.date = Query(None, description="Start date for filtering time entries"),
        end_date: datetime.date = Query(None, description="End date for filtering time entries"),
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Get time entries for the current user within specified date range.

    This endpoint retrieves all time entries belonging to the authenticated user,
    optionally filtered by a date range. Results include both completed and
    running time entries.

    Arguments:
        start_date (datetime.date): Optional start date for filtering (inclusive)
        end_date (datetime.date): Optional end date for filtering (inclusive)
        current_user (Dict[str, Any]): The current authenticated user
        db (Session): Database session

    Returns:
        List[TimeEntryResponse]: List of time entries within the date range

    Raises:
        HTTPException 404: If the user is not found in the database
    """
    logger.info(f"Fetching time entries for user: {current_user} between {start_date} and {end_date}")
    db_user = await lookup_user(current_user, db)

    query = db.query(TimeEntry).filter(TimeEntry.user_id == db_user.id)

    if start_date:
        query = query.filter(TimeEntry.start_time >= start_date)
    if end_date:
        query = query.filter(TimeEntry.start_time <= end_date)

    entries = query.all()
    return entries


@router.get("/summary", response_model=TimeSummaryResponse, tags=["time-tracking"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_time_summary(
        start_time: Optional[str] = Query(None, description="Start date for filtering time entries"),
        end_time: Optional[str] = Query(None, description="End date for filtering time entries"),
        project_id: Optional[uuid.UUID] = Query(None, description="Filter by project ID"),
        user_id: Optional[uuid.UUID] = Query(None, description="Filter by user ID"),
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Get time tracking summary statistics.

    Arguments:
        start_time (str): Start date for filtering (ISO format)
        end_time (str): End date for filtering (ISO format)
        project_id (str): Optional project ID filter
        user_id (str): Optional user ID filter
        current_user (Dict[str, Any]): The current authenticated user
        db (Session): Database session

    Returns:
        TimeSummaryResponse: Summary statistics including total hours, entries count,
                           average hours per day and project breakdown
    """
    logger.info(f"Fetching time summary for filters: dateFrom={start_time}, dateTo={end_time}, "
                f"projectId={project_id}, userId={user_id}")

    # Get current user's entries by default
    db_user = await lookup_user(current_user, db)

    query = db.query(TimeEntry).filter(TimeEntry.user_id == db_user.id)

    # Apply date filters using string dates
    if start_time:
        from sqlalchemy import func
        query = query.filter(func.date(TimeEntry.start_time) >= start_time)
    if end_time:
        from sqlalchemy import func
        query = query.filter(func.date(TimeEntry.start_time) <= end_time)
    if project_id:
        query = query.filter(TimeEntry.project_id == project_id)
    if user_id:
        query = query.filter(TimeEntry.user_id == user_id)

    entries = query.all()

    # Calculate total hours from completed entries
    total_hours = sum((entry.end_time - entry.start_time).total_seconds() / 3600
                      for entry in entries if entry.end_time and entry.start_time)

    # Build project breakdown
    project_stats = {}
    for entry in entries:
        if entry.end_time and entry.start_time and entry.project:
            hours = (entry.end_time - entry.start_time).total_seconds() / 3600
            if entry.project.id not in project_stats:
                project_stats[entry.project.id] = {
                    "project_id": entry.project.id,
                    "projectName": entry.project.name,
                    "hours": 0
                }
            project_stats[entry.project.id]["hours"] += hours

    # Calculate date span for average
    if start_time and end_time:
        from datetime import datetime as dt
        start = dt.fromisoformat(start_time.replace('Z', '+00:00'))
        end = dt.fromisoformat(end_time.replace('Z', '+00:00'))
        days_span = max((end - start).days + 1, 1)
    else:
        days_span = 1

    project_breakdown = [
        ProjectBreakdown(
            project_id=stats["project_id"],
            projectName=stats["projectName"],
            hours=round(stats["hours"], 2)
        )
        for stats in project_stats.values()
    ]

    return TimeSummaryResponse(
        total_hours=round(total_hours, 2),
        totalEntries=len(entries),
        averageHoursPerDay=round(total_hours / days_span, 2),
        project_breakdown=project_breakdown
    )
