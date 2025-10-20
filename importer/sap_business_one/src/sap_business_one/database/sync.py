"""
Sync functions to import SAP Business One data to PostgreSQL
"""
from typing import List
from loguru import logger

from sap_business_one.models.business_partners import BusinessPartners
from sap_business_one.models.customers import Customer
from sap_business_one.models.orders import SAPOrder, Order
from sap_business_one.models.items import Item
from sap_business_one.database.connection import get_db_session, create_tables


def sync_business_partners_to_customers(business_partners: List[BusinessPartners]) -> int:
    """
    Sync business partners from SAP to customers table in PostgreSQL.

    Checks if a customer with the same name already exists. If not, creates a new customer.
    If exists, updates the updated_at timestamp.

    :param business_partners: List of BusinessPartners from SAP
    :type business_partners: List[BusinessPartners]
    :return: Number of records synced (created or updated)
    :rtype: int
    """
    if not business_partners:
        logger.warning("No business partners to sync")
        return 0

    # Ensure tables exist
    create_tables()

    db = get_db_session()
    synced_count = 0
    created_count = 0
    updated_count = 0

    try:
        for bp in business_partners:
            # Check if customer already exists by name
            existing_customer = db.query(Customer).filter(
                Customer.customer_code == bp.CardCode
            ).first()

            if existing_customer:
                # Customer exists - update the updated_at timestamp
                # (SQLAlchemy will handle this automatically with onupdate)
                db.add(existing_customer)
                updated_count += 1
                logger.debug(f"Updated existing customer: {bp.CardName} ({bp.CardCode})")
            else:
                # Customer doesn't exist - create new
                new_customer = Customer(
                    customer_name=bp.CardName,
                    customer_code=bp.CardCode,
                    type=bp.CardType
                )
                db.add(new_customer)
                created_count += 1
                logger.debug(f"Created new customer: {bp.CardName} ({bp.CardCode})")

            synced_count += 1

        db.commit()
        logger.info(
            f"Successfully synced {synced_count} business partners to customers table "
            f"(created: {created_count}, updated: {updated_count})"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing business partners: {e}")
        raise
    finally:
        db.close()

    return synced_count


def sync_orders(sap_orders: List[SAPOrder]) -> int:
    """
    Sync orders from SAP to orders table in PostgreSQL.

    Checks if an order with the same order_id (DocEntry) already exists. If not, creates a new order.
    If exists, updates the order details and updated_at timestamp.

    :param sap_orders: List of SAPOrder from SAP
    :type sap_orders: List[SAPOrder]
    :return: Number of records synced (created or updated)
    :rtype: int
    """
    if not sap_orders:
        logger.warning("No orders to sync")
        return 0

    # Ensure tables exist
    create_tables()

    db = get_db_session()
    synced_count = 0
    created_count = 0
    updated_count = 0
    skipped_count = 0

    try:
        for sap_order in sap_orders:
            # Skip orders without DocEntry (unique identifier)
            if not sap_order.DocEntry:
                logger.warning(f"Skipping order without DocEntry: {sap_order.DocNum}")
                skipped_count += 1
                continue

            # Find customer by CardCode
            customer = None

            logger.info(f"Syncing order: {sap_order.CardCode}")

            if sap_order.CardCode:
                customer = db.query(Customer).filter(
                    Customer.customer_code == sap_order.CardCode
                ).first()

            if not customer:
                logger.warning(
                    f"Customer not found for CardCode {sap_order.CardCode}. "
                    f"Skipping order DocEntry={sap_order.DocEntry}, DocNum={sap_order.DocNum}"
                )
                skipped_count += 1
                continue

            # Convert DocEntry to string for order_id
            order_id = str(sap_order.DocEntry)

            # Check if order already exists by order_id
            existing_order = db.query(Order).filter(
                Order.order_id == order_id
            ).first()

            if existing_order:
                # Order exists - update fields
                existing_order.description = f"Order #{sap_order.DocNum} - {sap_order.CardName}"
                existing_order.comment = sap_order.Comments
                existing_order.customer_id = customer.id
                db.add(existing_order)
                updated_count += 1
                logger.debug(
                    f"Updated existing order: DocEntry={sap_order.DocEntry}, "
                    f"DocNum={sap_order.DocNum}, Customer={sap_order.CardName}"
                )
            else:
                # Order doesn't exist - create new
                new_order = Order(
                    order_id=order_id,
                    description=f"Order #{sap_order.DocNum} - {sap_order.CardName}",
                    comment=sap_order.Comments,
                    customer_id=customer.id
                )
                db.add(new_order)
                created_count += 1
                logger.debug(
                    f"Created new order: DocEntry={sap_order.DocEntry}, "
                    f"DocNum={sap_order.DocNum}, Customer={sap_order.CardName}"
                )

            synced_count += 1

        db.commit()
        logger.info(
            f"Successfully synced {synced_count} orders to orders table "
            f"(created: {created_count}, updated: {updated_count}, skipped: {skipped_count})"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing orders: {e}")
        raise
    finally:
        db.close()

    return synced_count


def sync_items(sap_orders: List[SAPOrder]) -> int:
    """
    Sync items from SAP order DocumentLines to items table in PostgreSQL.

    Checks if an item with the same order_id and line_num already exists. If not, creates a new item.
    If exists, updates the item details.

    :param sap_orders: List of SAPOrder from SAP with DocumentLines
    :type sap_orders: List[SAPOrder]
    :return: Number of items synced (created or updated)
    :rtype: int
    """
    if not sap_orders:
        logger.warning("No orders provided for item sync")
        return 0

    # Ensure tables exist
    create_tables()

    db = get_db_session()
    total_items_synced = 0
    items_created = 0
    items_updated = 0
    orders_processed = 0
    orders_skipped = 0

    try:
        for sap_order in sap_orders:
            # Skip orders without DocEntry
            if not sap_order.DocEntry:
                logger.warning(f"Skipping order without DocEntry: {sap_order.DocNum}")
                orders_skipped += 1
                continue

            # Skip orders without DocumentLines
            if not sap_order.DocumentLines or len(sap_order.DocumentLines) == 0:
                logger.debug(f"Order DocEntry={sap_order.DocEntry} has no document lines, skipping")
                orders_skipped += 1
                continue

            # Find the order in DB by order_id
            order_id = str(sap_order.DocEntry)
            order = db.query(Order).filter(Order.order_id == order_id).first()

            if not order:
                logger.warning(
                    f"Order not found in DB for order_id {order_id} (DocEntry={sap_order.DocEntry}). "
                    f"Skipping items. Make sure to sync orders before items."
                )
                orders_skipped += 1
                continue

            # Process each DocumentLine
            for doc_line in sap_order.DocumentLines:
                # Check if item already exists by order_id and line_num
                existing_item = db.query(Item).filter(
                    Item.order_id == order.id,
                    Item.line_num == doc_line.LineNum
                ).first()

                if existing_item:
                    # Item exists - update fields
                    existing_item.price_per_unit = doc_line.Price
                    existing_item.units = int(doc_line.Quantity) if doc_line.Quantity else None
                    existing_item.description = doc_line.ItemDescription
                    existing_item.comment = doc_line.FreeText
                    existing_item.material_number = doc_line.ItemCode
                    db.add(existing_item)
                    items_updated += 1
                    logger.debug(
                        f"Updated item LineNum={doc_line.LineNum} for order {order_id}"
                    )
                else:
                    # Item doesn't exist - create new
                    new_item = Item(
                        order_id=order.id,
                        line_num=doc_line.LineNum,
                        price_per_unit=doc_line.Price,
                        units=int(doc_line.Quantity) if doc_line.Quantity else None,
                        description=doc_line.ItemDescription,
                        comment=doc_line.FreeText,
                        material_number=doc_line.ItemCode
                    )
                    db.add(new_item)
                    items_created += 1
                    logger.debug(
                        f"Created item LineNum={doc_line.LineNum} for order {order_id}"
                    )

                total_items_synced += 1

            orders_processed += 1

        db.commit()
        logger.info(
            f"Successfully synced items: {total_items_synced} items total "
            f"(created: {items_created}, updated: {items_updated}) "
            f"for {orders_processed} orders (skipped: {orders_skipped})"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing items: {e}")
        raise
    finally:
        db.close()

    return total_items_synced



