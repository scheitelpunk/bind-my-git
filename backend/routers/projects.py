"""
Time Entries API router with overlap prevention
"""
import math
import uuid
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette import status

from auth.user import get_current_user
from database.connection import get_db_session
from models.members import ProjectMemberAdd, ProjectMember, ProjectMemberList
from models.project import Project, ProjectResponse, PaginatedResponse, ProjectCreate, ProjectUpdate
from models.task import Task, TaskResponse
from models.user import User, UserResponse
from utils.helper import lookup_user, require_any_role, is_regular_user

router = APIRouter()


@router.post("/", response_model=ProjectResponse, tags=["projects"],
             dependencies=[Depends(require_any_role("admin", "project_manager"))])
async def create_project(
        project: ProjectCreate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Create a new project.

    This endpoint creates a new project with the current user as the owner.
    The project details are validated using the ProjectCreate model.

    Parameters:
    project (ProjectCreate): The project details to create
    current_user (Dict[str, Any]): The current user's information from the token
    db (Session): The database session for executing queries

    Returns:
    ProjectResponse: The created project information

    Raises:
    HTTPException: If the user is not found in the database
    """
    db_user = await lookup_user(current_user, db)

    db_project = Project(
        id=uuid.uuid4(),
        name=project.name,
        description=project.description,
        owner_id=db_user.id,
        start_date=project.start_date,
        end_date=project.end_date,
        customer_id=project.customer_id,
        order_id=project.order_id
    )

    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    logger.info(f"Created project {db_project.id}")
    return db_project


@router.put("/{project_id}", response_model=ProjectResponse, tags=["projects"])
async def update_project(
        project_id: str,
        project: ProjectUpdate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Update an existing project.

    This endpoint updates the details of an existing project.

    Authorization: User must be either:
    - An admin or project_manager (global roles), OR
    - The project owner, OR
    - A MANAGER in the specific project's project_members table

    Parameters:
    project_id (str): The ID of the project to update
    project (ProjectUpdate): The updated project details
    current_user (Dict[str, Any]): The current user's information from the token
    db (Session): The database session for executing queries

    Returns:
    ProjectResponse: The updated project information

    Raises:
    HTTPException: If the project is not found or user is not authorized
    """
    db_project, is_admin_or_pm, is_owner, is_project_manager = await get_fine_grained_role(current_user, db, project_id)

    if not (is_admin_or_pm or is_owner or is_project_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this project. Required: admin, project_manager role, project owner, or MANAGER role in the project."
        )

    if project.name:
        db_project.name = project.name
    if project.description:
        db_project.description = project.description
    if project.start_date:
        db_project.start_date = project.start_date
    if project.end_date:
        db_project.end_date = project.end_date
    if project.status:
        db_project.status = project.status
    if project.customer_id is not None:
        db_project.customer_id = project.customer_id
    if project.order_id is not None:
        db_project.order_id = project.order_id

    db.commit()
    db.refresh(db_project)

    logger.info(f"Updated project {project_id}")
    return db_project


async def get_fine_grained_role(current_user: dict[str, Any], db: Session, project_id: str) -> tuple[
    bool, bool, Any, Any | None]:
    db_user = await lookup_user(current_user, db)

    # Convert project_id string to UUID
    try:
        project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format")

    db_project = db.query(Project).filter(Project.id == project_uuid).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check authorization: admin, project_manager, project owner, or MANAGER in this project
    from auth.user import oidc_auth

    is_admin_or_pm = (
            oidc_auth.check_role(current_user, "admin") or
            oidc_auth.check_role(current_user, "project_manager")
    )

    is_owner = db_project.owner_id == db_user.id

    # Check if user is a MANAGER in this specific project
    is_project_manager = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_uuid,
        ProjectMember.user_id == db_user.id,
        ProjectMember.role == "MANAGER"
    ).first() is not None

    return db_project, is_admin_or_pm, is_owner, is_project_manager


@router.get("/", response_model=PaginatedResponse[ProjectResponse], tags=["projects"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_projects(
        status: Optional[str] = Query(None, description="Filter by task status"),
        search: Optional[str] = Query(None, description="Search by project name or description"),
        current_user: Dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db_session),
        page: int = 0,
        size: int = 100):
    """Retrieve a paginated list of projects.

    This endpoint retrieves projects with pagination based on the provided page
    and size parameters. The data returned includes the list of projects and
    metadata such as total elements, total pages, and navigation information.

    For users with only the 'developer' role, only projects where they are a member
    or owner are returned. Admins and project managers see all projects.

    Parameters:
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.
        page: Integer specifying the current page number. Defaults to 0.
        size: Integer specifying the number of results per page. Defaults to 100.
        status: Optional filter by project status.
        search: Optional search term to filter by project name or description.

    Returns:
        PaginatedResponse[ProjectResponse]: A paginated response containing the
        projects' data and metadata.

    Raises:
        None
    """
    # Get the current user from the database
    db_user = await lookup_user(current_user, db)

    # Calculate offset from page and size
    skip = page * size

    # Build base query
    if await is_regular_user(current_user):

        logger.info(f"apply limitation for regular user filter")

        # Filter to only show projects where user is owner or member
        query = (
            db.query(Project)
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
        # Admin and project_manager see all projects
        query = db.query(Project)

    # Apply filters
    if status:
        query = query.filter(Project.status == status)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Project.name.ilike(search_pattern),
                Project.description.ilike(search_pattern)
            )
        )

    # Get total count for pagination metadata (after filters)
    total_count = query.count()

    # Get the projects for current page
    projects = query.offset(skip).limit(size).all()

    # Calculate pagination metadata
    total_pages = math.ceil(total_count / size) if size > 0 else 0
    has_next = page < (total_pages - 1) if total_pages > 0 else False
    has_previous = page > 0

    logger.info(f"Retrieved {len(projects)} projects for page {page}")

    return PaginatedResponse(
        data=projects,
        page=page,
        size=size,
        totalElements=total_count,
        totalPages=total_pages,
        hasNext=has_next,
        hasPrevious=has_previous
    )


@router.get(f"/my", response_model=List[ProjectResponse], tags=["projects"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_my_projects(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session), skip: int = 0,
        limit: int = 100
):
    """
    List projects available to the current user (owner or member).

    This endpoint retrieves a list of projects associated with the
    current user, either as the owner or a member. It utilizes the
    current user information extracted from the Keycloak token and
    queries the database for the corresponding user and their related
    projects. The resulting projects are paginated with specified skip
    and limit values.

    Parameters:
    current_user (Dict[str, Any]): The current user's information, extracted from the token.
    db (Session): The database session used for querying data.
    skip (int): The number of projects to skip in the result set (default is 0).
    limit (int): The maximum number of projects to return (default is 100).

    Returns:
    List[ProjectResponse]: A list of project objects available to the current user.

    Raises:
    None
    """
    logger.info(current_user)
    """List projects available to the current user (owner or member)"""
    db_user = await lookup_user(current_user, db)

    # Query projects where the user is the owner or a member
    projects = (
        db.query(Project)
        .outerjoin(Project.user_member_view)
        .filter(
            or_(
                Project.owner_id == db_user.id,
                User.id == db_user.id
            )
        )
        .distinct()
        .offset(skip).limit(limit)
        .all()
    )

    logger.info(f"Projects {projects}")
    return projects


# Projects endpoints
@router.get("/{project_id}", response_model=ProjectResponse, tags=["projects"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_project(
        project_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Retrieve a project by its ID.

    This endpoint retrieves the details of a specific project. The user must
    either be the owner or a member of the project to access it.

    Parameters:
    project_id (str): The ID of the project to retrieve
    current_user (Dict[str, Any]): The current user's information from the token
    db (Session): The database session for executing queries

    Returns:
    ProjectResponse: The project information

    Raises:
    HTTPException: If the project is not found or user is not authorized
    """
    db_user = await lookup_user(current_user, db)

    # Convert project_id string to UUID
    try:
        project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format")

    db_project = db.query(Project).filter(Project.id == project_uuid).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if user is owner or member (compare by ID to handle mocked objects)
    is_owner = db_project.owner_id == db_user.id
    is_member = any(member.id == db_user.id for member in db_project.user_member_view)

    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this project")

    logger.info(f"Retrieved project {project_id}")
    return db_project


@router.delete("/{project_id}", status_code=204, tags=["projects"],
               dependencies=[Depends(require_any_role("admin", "project_manager"))])
async def delete_project(
        project_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Delete an existing project.

    This endpoint deletes a project. Only the project owner can delete the project.

    Parameters:
    project_id (str): The ID of the project to delete
    current_user (Dict[str, Any]): The current user's information from the token
    db (Session): The database session for executing queries

    Returns:
    None

    Raises:
    HTTPException: If the project is not found or user is not authorized
    """
    db_user = await lookup_user(current_user, db)

    # Convert project_id string to UUID
    try:
        project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format")

    db_project = db.query(Project).filter(Project.id == project_uuid).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    if db_project.owner_id != db_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")

    db.delete(db_project)
    db.commit()

    logger.info(f"Deleted project {project_id}")
    return None


@router.get("/{project_id}/tasks", response_model=PaginatedResponse[TaskResponse], tags=["projects"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_project_tasks(
        project_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session),
        page: int = 0,
        size: int = 100
):
    """
    Retrieve all tasks for a specific project with pagination.

    This endpoint retrieves tasks associated with a specific project. The user must
    either be the owner or a member of the project to access its tasks.

    Parameters:
    project_id (str): The ID of the project to get tasks for
    current_user (Dict[str, Any]): The current user's information from the token
    db (Session): The database session for executing queries
    page (int): The page number for pagination (default: 0)
    size (int): The number of items per page (default: 100)

    Returns:
    PaginatedResponse[TaskResponse]: Paginated list of tasks for the project

    Raises:
    HTTPException: If the project is not found or user is not authorized
    """
    db_user = await lookup_user(current_user, db)

    # Convert project_id string to UUID
    try:
        project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format")

    db_project = db.query(Project).filter(Project.id == project_uuid).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if user is owner or member (compare by ID to handle mocked objects)
    is_owner = db_project.owner_id == db_user.id
    is_member = any(member.id == db_user.id for member in db_project.user_member_view)

    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this project's tasks")

    # Calculate offset from page and size
    skip = page * size

    # Get total count for pagination metadata
    total_count = db.query(Task).filter(Task.project_id == project_uuid).count()

    # Get the tasks for current page
    tasks = db.query(Task).filter(Task.project_id == project_uuid).offset(skip).limit(size).all()

    # Calculate pagination metadata
    total_pages = math.ceil(total_count / size) if size > 0 else 0
    has_next = page < (total_pages - 1) if total_pages > 0 else False
    has_previous = page > 0

    logger.info(f"Retrieved {len(tasks)} tasks for project {project_id}")

    return PaginatedResponse(
        data=tasks,
        page=page,
        size=size,
        totalElements=total_count,
        totalPages=total_pages,
        hasNext=has_next,
        hasPrevious=has_previous
    )


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["members"])
async def remove_project_member(
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Removes a member from a specified project.

    This function allows removing a user from a project's member list. It verifies
    the existence of the project and user, ensures that the user is
    a member of the project, and then removes the user from the member
    list of the project.

    Authorization: User must be either:
    - An admin or project_manager (global roles), OR
    - A MANAGER in the specific project's project_members table

    Parameters:
        project_id (uuid.UUID): The ID of the project to remove member from.
        user_id (uuid.UUID): The ID of the user to be removed.
        current_user (Dict[str, Any]): Information about the currently logged-in
        user, provided by dependency injection via the `get_current_user` function.
        db (Session): The database session instance, provided by dependency
        injection via the `get_db_session` function.

    Raises:
        HTTPException: If the project with the specified ID does not exist.
        HTTPException: If the user with the specified ID does not exist.
        HTTPException: If the user is not a member of the specified project.
        HTTPException: If the user is not authorized to remove members from the project.

    Returns:
        None
    """

    logger.info(f"Removing {user_id} from project {project_id}")

    db_project, is_admin_or_pm, is_owner, is_project_manager = await get_fine_grained_role(current_user, db,
                                                                                           str(project_id))

    if not (is_admin_or_pm or is_project_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to remove members from this project. Required: admin, project_manager role, or MANAGER role in the project."
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user not in project.user_member_view:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a member of this project"
        )

    project.user_member_view.remove(user)
    db.commit()


@router.get("/{project_id}/members", response_model=ProjectMemberList, tags=["members"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_project_members(
        project_id: uuid.UUID,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Retrieve a list of members associated with a specific project. The endpoint provides
    detailed information about each member, including their personal data and associated roles.
    Requires appropriate authorization to access project information.

    Parameters:
        project_id (uuid.UUID): A unique identifier for the project whose members are to
            be retrieved.
        current_user (Dict[str, Any]): The authenticated user making the request.
        db (Session): Database session dependency for querying the data.

    Raises:
        HTTPException: Raised with a 404 status code if the project does not exist or has
            no associated members.

    Returns:
        ProjectMemberList: A list of project members, with each entry providing detailed
            user information and associated roles.
    """
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    if not members:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    return ProjectMemberList(users=[
        UserResponse(
            id=member.user.id,
            email=member.user.email,
            first_name=member.user.first_name,
            last_name=member.user.last_name,
            is_active=member.user.is_active,
            keycloak_id=member.user.keycloak_id,
            created_at=member.user.created_at,
            updated_at=member.user.updated_at,
            roles=member.user.roles
        ) for member in members
    ])


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED, tags=["members"])
async def add_project_member(
        project_id: uuid.UUID,
        member: ProjectMemberAdd,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)
):
    """
    Adds a member to a specified project.

    This function allows adding a user to a project's member list. It verifies
    the existence of the project and user, ensures that the user is not
    already a member of the project, and then appends the user to the member
    list of the project. Upon successful addition, an appropriate success
    message is returned.

    Authorization: User must be either:
    - An admin or project_manager (global roles), OR
    - A MANAGER in the specific project's project_members table

    Parameters:
        member (ProjectMemberAdd): Information about the member to be added,
        including `project_id` and `user_id`.

        current_user (Dict[str, Any]): Information about the currently logged-in
        user, provided by dependency injection via the `get_current_user` function.

        db (Session): The database session instance, provided by dependency
        injection via the `get_db_session` function.

    Raises:
        HTTPException: If the project with the specified ID does not exist, an HTTP
        status 404 is raised.

        HTTPException: If the user with the specified ID does not exist, an HTTP
        status 404 is raised.

        HTTPException: If the user is already a member of the specified project,
        an HTTP status 400 is raised.

        HTTPException: If the user is not authorized to add members to the project,
        an HTTP status 403 is raised.

    Returns:
        dict: A dictionary containing a success message.
    """
    db_project, is_admin_or_pm, is_owner, is_project_manager = await get_fine_grained_role(current_user, db, project_id)

    if not (is_admin_or_pm or is_project_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add members to this project. Required: admin, project_manager role, or MANAGER role in the project."
        )

    project = db.query(Project).filter(Project.id == member.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    user = db.query(User).filter(User.id == member.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if already a member using ProjectMember table
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user.id
    ).first()

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )

    # Create ProjectMember record and add directly to session
    db_member = ProjectMember(
        project_id=project.id,
        user_id=user.id,
        role=member.role
    )

    db.add(db_member)  # Add to session, NOT project.members.append()
    db.commit()

    return {"message": "Member added successfully"}
