import json
from typing import Optional, Any, Coroutine

from loguru import logger

from sap_business_one.models.business_partners import BusinessPartnersList
from sap_business_one.utils.session import get_service_layer_session, SERVICE_LAYER_BASE_URL


async def search_business_partners(
        query: Optional[str] = None,
        partner_type: Optional[str] = None
) -> BusinessPartnersList | dict[str, str]:
    """
    Suche Geschäftspartner nach Name, Code oder Typ (Kunde/Lieferant).
    Handles pagination automatically by following @odata.nextLink.

    - query: Suchbegriff für CardCode oder CardName
    - partner_type: "customer" oder "supplier"
    """
    async with get_service_layer_session() as session:
        try:
            filters = []
            if query:
                filters.append(f"(contains(CardCode,'{query}') or contains(CardName,'{query}'))")
            if partner_type == "customer":
                filters.append("CardType eq 'cCustomer'")
            elif partner_type == "supplier":
                filters.append("CardType eq 'cSupplier'")
            filter_query = " and ".join(filters) if filters else None
            params = {
                "$select": "CardCode,CardName,CardType",
                "$orderby": "CardName",
            }
            if filter_query:
                params["$filter"] = filter_query

            # Collect all results across pages
            all_partners = []
            page_count = 0
            next_url = f"{SERVICE_LAYER_BASE_URL}/BusinessPartners"

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

                # Get business partners from this page
                page_data = response_data.get('value', [])
                all_partners.extend(page_data)
                logger.info(f"Page {page_count}: Found {len(page_data)} business partners (Total: {len(all_partners)})")

                #wrapped_data = {"allBusinessPartners": all_partners}
                #return BusinessPartnersList.model_validate(wrapped_data)
                # Check for next page
                next_link = response_data.get('@odata.nextLink')
                if next_link:
                    next_url = f"{SERVICE_LAYER_BASE_URL}/{next_link}"
                    logger.info(f"Next page available: {next_url}")
                else:
                    logger.info("No more pages available")
                    next_url = None

            logger.info(f"Completed pagination: {page_count} pages, {len(all_partners)} total business partners")

            # Wrap the list in the expected structure
            wrapped_data = {"allBusinessPartners": all_partners}
            return BusinessPartnersList.model_validate(wrapped_data)

        except Exception as e:
            logger.error(f"Fehler bei der Geschäftspartnersuche: {str(e)}")
            return {"error": str(e)}
