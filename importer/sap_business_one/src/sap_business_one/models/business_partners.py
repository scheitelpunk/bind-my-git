from typing import List, Optional

from pydantic import BaseModel


class BusinessPartners(BaseModel):
    """Base comment schema"""
    CardName: str
    CardCode: str
    CardType: str
    odata: Optional[str] = None


class BusinessPartnersList(BaseModel):
    """Base comment schema"""
    allBusinessPartners: List[BusinessPartners]
