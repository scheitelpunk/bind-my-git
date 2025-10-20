"""
Items API router
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from starlette import status

from auth.user import get_current_user
from database.connection import get_db_session
from models.items import Item, ItemResponse, ItemCreate, ItemUpdate
from loguru import logger

from utils.helper import require_any_role, require_role

router = APIRouter()


@router.get("/", response_model=List[ItemResponse], tags=["items"],
            dependencies=[Depends(require_any_role("admin", "manager", "developer"))])
async def get_items(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Retrieve all items.

    This endpoint retrieves all items from the database.

    Parameters:
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        List[ItemResponse]: A list of all items.

    Raises:
        HTTPException: 404 if no items are found.
    """
    logger.info(f"Fetching items for user: {current_user}")

    db_items = db.query(Item).all()
    if not db_items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No items found"
        )

    logger.info(f"Retrieved {len(db_items)} items")

    return db_items


@router.get("/by-order/{order_id}", response_model=List[ItemResponse], tags=["items"],
            dependencies=[Depends(require_any_role("admin", "manager", "developer"))])
async def get_items_by_order(
        order_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Retrieve all items for a specific order.

    This endpoint retrieves all items associated with a specific order ID.

    Parameters:
        order_id: UUID of the order to retrieve items for.
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        List[ItemResponse]: A list of items for the specified order.

    Raises:
        HTTPException: 404 if no items are found.
    """
    logger.info(f"Fetching items for order {order_id}")

    # Convert order_id string to UUID
    try:
        order_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order ID format")

    db_items = db.query(Item).filter(Item.order_id == order_uuid).all()
    if not db_items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No items found for order {order_id}"
        )

    logger.info(f"Retrieved {len(db_items)} items for order {order_id}")

    return db_items


@router.get("/{item_id}", response_model=ItemResponse, tags=["items"],
            dependencies=[Depends(require_any_role("admin", "manager", "developer"))])
async def get_item(
        item_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Retrieve a specific item by ID.

    This endpoint retrieves a single item by its unique identifier.

    Parameters:
        item_id: UUID of the item to retrieve.
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        ItemResponse: The requested item.

    Raises:
        HTTPException: 404 if the item is not found.
    """
    logger.info(f"Fetching item {item_id} for user: {current_user}")

    # Convert item_id string to UUID
    try:
        item_uuid = uuid.UUID(item_id) if isinstance(item_id, str) else item_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    db_item = db.query(Item).filter(Item.id == item_uuid).first()
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    logger.info(f"Retrieved item {db_item}")

    return db_item


@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED, tags=["items"],
             dependencies=[Depends(require_role("admin"))])
async def create_item(
        item: ItemCreate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Create a new item.

    This endpoint creates a new item with the provided details.

    Parameters:
        item: ItemCreate schema containing item details.
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        ItemResponse: The created item.

    Raises:
        HTTPException: 500 if creation fails.
    """
    logger.info(f"Creating item for user: {current_user}")

    new_item = Item(
        order_id=item.order_id,
        price_per_unit=item.price_per_unit,
        units=item.units,
        description=item.description,
        comment=item.comment,
        material_number=item.material_number
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    logger.info(f"Created item {new_item.id}")

    return new_item


@router.put("/{item_id}", response_model=ItemResponse, tags=["items"], dependencies=[Depends(require_role("admin"))])
async def update_item(
        item_id: str,
        item: ItemUpdate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Update an existing item.

    This endpoint updates an item with the provided details.

    Parameters:
        item_id: UUID of the item to update.
        item: ItemUpdate schema containing updated item details.
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        ItemResponse: The updated item.

    Raises:
        HTTPException: 404 if the item is not found.
    """
    logger.info(f"Updating item: {item_id}")

    # Convert item_id string to UUID
    try:
        item_uuid = uuid.UUID(item_id) if isinstance(item_id, str) else item_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    db_item = db.query(Item).filter(Item.id == item_uuid).first()
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    # Update only provided fields
    if item.price_per_unit is not None:
        db_item.price_per_unit = item.price_per_unit
    if item.units is not None:
        db_item.units = item.units
    if item.description is not None:
        db_item.description = item.description
    if item.comment is not None:
        db_item.comment = item.comment
    if item.material_number is not None:
        db_item.material_number = item.material_number

    db.commit()
    db.refresh(db_item)

    logger.info(f"Updated item {item_id}")

    return db_item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["items"],
               dependencies=[Depends(require_role("admin"))])
async def delete_item(
        item_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Delete an item.

    This endpoint deletes an item by its unique identifier.

    Parameters:
        item_id: UUID of the item to delete.
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        None

    Raises:
        HTTPException: 404 if the item is not found.
    """
    logger.info(f"Deleting item: {item_id}")

    # Convert item_id string to UUID
    try:
        item_uuid = uuid.UUID(item_id) if isinstance(item_id, str) else item_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    db_item = db.query(Item).filter(Item.id == item_uuid).first()
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    db.delete(db_item)
    db.commit()

    logger.info(f"Deleted item {item_id}")

    return None
