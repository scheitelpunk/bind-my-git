"""
Orders API router
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from starlette import status

from auth.user import get_current_user
from database.connection import get_db_session
from models.orders import Order, OrderResponse, OrderCreate, OrderUpdate
from loguru import logger

from utils.helper import require_role, require_any_role

router = APIRouter()


@router.get("/", response_model=List[OrderResponse], tags=["orders"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_orders(
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Retrieve all orders.

    This endpoint retrieves all orders from the database.

    Parameters:
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        List[OrderResponse]: A list of all orders.

    Raises:
        HTTPException: 404 if no orders are found.
    """
    logger.info(f"Fetching orders for user: {current_user}")

    db_orders = db.query(Order).all()
    if not db_orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No orders found"
        )

    logger.info(f"Retrieved {len(db_orders)} orders")

    return db_orders


@router.get("/{order_id}", response_model=OrderResponse, tags=["orders"],
            dependencies=[Depends(require_any_role("admin", "project_manager", "developer"))])
async def get_order(
        order_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Retrieve a specific order by ID.

    This endpoint retrieves a single order by its unique identifier.

    Parameters:
        order_id: UUID of the order to retrieve.
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        OrderResponse: The requested order.

    Raises:
        HTTPException: 404 if the order is not found.
    """
    logger.info(f"Fetching order {order_id} for user: {current_user}")

    # Convert order_id string to UUID
    try:
        order_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order ID format")

    db_order = db.query(Order).filter(Order.id == order_uuid).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    logger.info(f"Retrieved order {db_order}")

    return db_order


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, tags=["orders"],
             dependencies=[Depends(require_role("admin"))])
async def create_order(
        order: OrderCreate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Create a new order.

    This endpoint creates a new order with the provided details.

    Parameters:
        order: OrderCreate schema containing order details.
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        OrderResponse: The created order.

    Raises:
        HTTPException: 500 if creation fails.
    """
    logger.info(f"Creating order for user: {current_user}")

    new_order = Order(
        customer_id=order.customer_id,
        order_id=order.order_id,
        description=order.description,
        comment=order.comment
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    logger.info(f"Created order {new_order.id}")

    return new_order


@router.put("/{order_id}", response_model=OrderResponse, tags=["orders"], dependencies=[Depends(require_role("admin"))])
async def update_order(
        order_id: str,
        order: OrderUpdate,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Update an existing order.

    This endpoint updates an order with the provided details.

    Parameters:
        order_id: UUID of the order to update.
        order: OrderUpdate schema containing updated order details.
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        OrderResponse: The updated order.

    Raises:
        HTTPException: 404 if the order is not found.
    """
    logger.info(f"Updating order: {order_id}")

    # Convert order_id string to UUID
    try:
        order_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order ID format")

    db_order = db.query(Order).filter(Order.id == order_uuid).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Update only provided fields
    if order.order_id is not None:
        db_order.order_id = order.order_id
    if order.description is not None:
        db_order.description = order.description
    if order.comment is not None:
        db_order.comment = order.comment

    db.commit()
    db.refresh(db_order)

    logger.info(f"Updated order {order_id}")

    return db_order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["orders"],
               dependencies=[Depends(require_role("admin"))])
async def delete_order(
        order_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db_session)):
    """Delete an order.

    This endpoint deletes an order by its unique identifier.

    Parameters:
        order_id: UUID of the order to delete.
        current_user: Dictionary containing details about the currently authenticated user.
        db: Database session object. Used to execute database queries.

    Returns:
        None

    Raises:
        HTTPException: 404 if the order is not found.
    """
    logger.info(f"Deleting order: {order_id}")

    # Convert order_id string to UUID
    try:
        order_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order ID format")

    db_order = db.query(Order).filter(Order.id == order_uuid).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    db.delete(db_order)
    db.commit()

    logger.info(f"Deleted order {order_id}")

    return None
