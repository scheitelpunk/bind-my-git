import json
from typing import Optional, Any, Coroutine, List

from loguru import logger

from sap_business_one.models.business_partners import BusinessPartnersList
from sap_business_one.models.orders import parse_sap_orders, parse_sap_order
from sap_business_one.utils.session import get_service_layer_session, SERVICE_LAYER_BASE_URL
from sap_business_one.models.orders import SAPOrder


async def search_orders(
        query: Optional[str] = None,
        partner_type: Optional[str] = None
) -> List[SAPOrder] | dict[str, str]:
    """
    """
    async with get_service_layer_session() as session:
        try:
            params = {
                "$select": "DocNum, DocEntry, CardName, Comments, DocumentLines",
            }
            # Collect all results across pages
            all_occurences = []
            page_count = 0
            next_url = f"{SERVICE_LAYER_BASE_URL}/Orders"

            # Loop through all pages following @odata.nextLink
            while next_url:
                page_count += 1
                logger.info(f"Fetching page {page_count}...")

                # First page uses params, subsequent pages use the nextLink URL directly
                if page_count == 1:
                    response = await session.get(next_url, params=params)
                else:
                    # nextLink is relative, construct full URL
                    from urllib.parse import unquote
                    logger.info(f"Fetching page {next_url}  ---- {params}")
                    response = await session.get(next_url)

                response.raise_for_status()
                response_data = response.json()

                # Get orders from this page
                my_orders = parse_sap_orders(response_data.get('value'))
                all_occurences.extend(my_orders)

                # Check for next page
                next_link = response_data.get('@odata.nextLink')
                if next_link:
                    next_url = f"{SERVICE_LAYER_BASE_URL}/{next_link}"
                    logger.info(f"Next page available: {next_url}")
                else:
                    logger.info("No more pages available")
                    next_url = None

            logger.info(f"Completed pagination: {page_count} pages, {len(all_occurences)} total orders")
            return all_occurences

        except Exception as e:
            logger.error(f"Fehler bei der Geschäftspartnersuche: {str(e)}")
            return {"error": str(e)}
