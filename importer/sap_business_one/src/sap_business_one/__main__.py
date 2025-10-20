import asyncio

from loguru import logger

from sap_business_one import tools  # noqa: F401
from sap_business_one.database.sync import sync_business_partners_to_customers, sync_orders, sync_items
from sap_business_one.tools import (  # noqa: F401
    business_partners,
)
from sap_business_one.tools.business_partners import search_business_partners
from sap_business_one.tools.orders import search_orders


async def main():
    logger.info(f"Starting sap_business_one importer...")
    #blub = BusinessPartners(CardType="Lieferant", CardCode="123456", CardName="Jung")

    #logger.info(f"Business partner {json.dumps(blub.model_dump(), indent=4)}")

    #bbbb = BusinessPartners.model_validate_json(json.dumps(blub.model_dump(), indent=4))
    #logger.info(f"Business partner {json.dumps(bbbb.model_dump(), indent=4)}")

    # Fetch and log business partners
    list_of_partners = await search_business_partners()
    for part in list_of_partners.allBusinessPartners:
        logger.info(f"{part.CardType} {part.CardCode} {part.CardName}")

    # Sync business partners to customers table (must be done first for FK relationships)
    #sync_business_partners_to_customers(list_of_partners.allBusinessPartners)

    # Fetch and log orders
    list_of_orders = await search_orders()
    for order in list_of_orders:
        logger.info(f"Order #{order.DocNum} {order.CardName} {order.CardCode}")

    # Sync orders to orders table (must be done before items for FK relationships)
    sync_orders(list_of_orders)

    # Sync items from order DocumentLines to items table
    sync_items(list_of_orders)


    #logger.info(f"Found {len(list_of_partners.allBusinessPartners)} business partners")

    #for partner in list_of_partners.allBusinessPartners:
    #    logger.info(f"Processing business partner {partner.CardName}")

    # Sync business partners to PostgreSQL customers table
    #synced_count = sync_business_partners_to_customers(list_of_partners)
    #logger.info(f"Synced {synced_count} business partners to database")

    return


if __name__ == "__main__":
    asyncio.run(main())
