"""
Customers API router for managing customer records
"""
import math
import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any, Optional

from starlette import status

from auth.user import get_current_user
from database.connection import get_db_session
from models.customers import CustomerResponse
from models.customers import Customer
from loguru import logger

from utils.helper import require_any_role

router = APIRouter()


@router.get("/{customer_id}", response_model=CustomerResponse, tags=["customers"],
            dependencies=[Depends(require_any_role("admin", "manager", "developer"))])
async def get_customer(
        customer_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db_session)):
    """
    Fetch a single customer by ID.

    This endpoint retrieves a customer record from the database based on the provided
    customer identifier. The request is authenticated and requires that the current user
    has one of the roles: admin, manager, or developer. If the specified customer does not
    exist, an HTTP 404 error is raised. Upon successful retrieval, the customer data is
    returned as a `CustomerResponse` model.

    Parameters
    ----------
    customer_id : str
        The unique identifier of the customer to retrieve.
    current_user : Dict[str, Any]
        Information about the authenticated user obtained via dependency injection.
    db : Session
        Database session used for querying customer records.

    Returns
    -------
    CustomerResponse
        A Pydantic model containing the retrieved customer's details.
    """

    logger.info(f"Fetching customer {customer_id} for user: {current_user}")

    # Convert customer_id string to UUID
    try:
        customer_uuid = uuid.UUID(customer_id) if isinstance(customer_id, str) else customer_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")

    db_customer = db.query(Customer).filter(Customer.id == customer_uuid).first()
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    logger.info(f"Retrieved customer {db_customer}")

    return db_customer


@router.get("/", response_model=List[CustomerResponse], tags=["customers"],
            dependencies=[Depends(require_any_role("admin", "manager", "developer"))])
async def get_customer_list(
        current_user: Dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db_session)):
    """
    Retrieve a list of all customers.

    This endpoint retrieves all customer records from the database. The request
    is authenticated and requires that the current user has one of the roles:
    admin, manager, or developer.

    Parameters:
        current_user (Dict[str, Any]): Dictionary containing details about the authenticated user
        db (Session): Database session object used to execute database queries

    Returns:
        List[CustomerResponse]: A list of all customers in the system

    Raises:
        HTTPException 404: If no customers are found in the database
    """

    logger.info(f"Fetching customer list for user: {current_user}")

    db_customers = db.query(Customer).all()
    if not db_customers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No customers found"
        )

    logger.info(f"Retrieved {len(db_customers)} customers")

    return db_customers
