"""
Models package initialization
Rebuilds Pydantic models to resolve forward references
"""
from models.customers import Customer, CustomerBase, CustomerResponse
from models.orders import Order, OrderBase, OrderCreate, OrderUpdate, OrderResponse
from models.items import Item, ItemBase, ItemCreate, ItemUpdate, ItemResponse
from models.notifications import (
    Notification,
    NotificationBase,
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
    NotificationType,
)

# Rebuild models to resolve forward references
CustomerResponse.model_rebuild()
OrderResponse.model_rebuild()
ItemResponse.model_rebuild()
NotificationResponse.model_rebuild()

__all__ = [
    "Customer",
    "CustomerBase",
    "CustomerResponse",
    "Order",
    "OrderBase",
    "OrderCreate",
    "OrderUpdate",
    "OrderResponse",
    "Item",
    "ItemBase",
    "ItemCreate",
    "ItemUpdate",
    "ItemResponse",
    "Notification",
    "NotificationBase",
    "NotificationCreate",
    "NotificationUpdate",
    "NotificationResponse",
    "NotificationType",
]
