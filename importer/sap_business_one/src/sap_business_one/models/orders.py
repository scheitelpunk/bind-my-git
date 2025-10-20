"""
Pydantic models for SAP Business One Orders (Sales Orders)
All fields are optional to handle partial data from the API.
"""
import uuid
from typing import Optional, List, Union, Any
from datetime import datetime, date, time
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
import json

from sap_business_one.database.connection import Base


# Enums for common values
class YesNo(str, Enum):
    YES = "tYES"
    NO = "tNO"


class PrintStatus(str, Enum):
    YES = "psYes"
    NO = "psNo"


class DocumentStatus(str, Enum):
    OPEN = "bost_Open"
    CLOSE = "bost_Close"


class DocumentType(str, Enum):
    ITEMS = "dDocument_Items"
    SERVICE = "dDocument_Service"


# Nested Models
class LineTaxJurisdiction(BaseModel):
    """Tax jurisdiction information for a document line"""
    model_config = ConfigDict(extra='allow')


class DocumentLineAdditionalExpense(BaseModel):
    """Additional expenses for a document line"""
    model_config = ConfigDict(extra='allow')


class WithholdingTaxLine(BaseModel):
    """Withholding tax information for a line"""
    model_config = ConfigDict(extra='allow')


class SerialNumber(BaseModel):
    """Serial number tracking"""
    model_config = ConfigDict(extra='allow')


class BatchNumber(BaseModel):
    """Batch number tracking"""
    model_config = ConfigDict(extra='allow')


class DocumentLinesBinAllocation(BaseModel):
    """Bin allocation for warehouse management"""
    model_config = ConfigDict(extra='allow')


class DocumentLine(BaseModel):
    """Individual line item in the order"""
    LineNum: Optional[int] = None
    ItemCode: Optional[str] = None
    ItemDescription: Optional[str] = None
    Quantity: Optional[float] = None
    ShipDate: Optional[str] = None
    Price: Optional[float] = None
    PriceAfterVAT: Optional[float] = None
    Currency: Optional[str] = None
    Rate: Optional[float] = None
    DiscountPercent: Optional[float] = None
    VendorNum: Optional[str] = None
    SerialNum: Optional[str] = None
    WarehouseCode: Optional[str] = None
    SalesPersonCode: Optional[int] = None
    CommisionPercent: Optional[float] = None
    TreeType: Optional[str] = None
    AccountCode: Optional[str] = None
    UseBaseUnits: Optional[str] = None
    SupplierCatNum: Optional[str] = None
    CostingCode: Optional[str] = None
    ProjectCode: Optional[str] = None
    BarCode: Optional[str] = None
    VatGroup: Optional[str] = None
#    Height1: Optional[float] = None
#    Hight1Unit: Optional[str] = None
#    Height2: Optional[float] = None
#    Height2Unit: Optional[str] = None
#    Lengh1: Optional[float] = None
#    Lengh1Unit: Optional[str] = None
#    Lengh2: Optional[float] = None
#    Lengh2Unit: Optional[str] = None
#    Weight1: Optional[float] = None
#    Weight1Unit: Optional[str] = None
#    Weight2: Optional[float] = None
#    Weight2Unit: Optional[str] = None
    Factor1: Optional[float] = None
    Factor2: Optional[float] = None
    Factor3: Optional[float] = None
    Factor4: Optional[float] = None
    BaseType: Optional[int] = None
    BaseEntry: Optional[int] = None
    BaseLine: Optional[int] = None
    Volume: Optional[float] = None
    VolumeUnit: Optional[int] = None
#    Width1: Optional[float] = None
#    Width1Unit: Optional[str] = None
#    Width2: Optional[float] = None
#    Width2Unit: Optional[str] = None
    Address: Optional[str] = None
    TaxCode: Optional[str] = None
    TaxType: Optional[str] = None
    TaxLiable: Optional[str] = None
    PickStatus: Optional[str] = None
    PickQuantity: Optional[float] = None
    PickListIdNumber: Optional[int] = None
    OriginalItem: Optional[str] = None
    BackOrder: Optional[str] = None
    FreeText: Optional[str] = None
    ShippingMethod: Optional[int] = None
    POTargetNum: Optional[int] = None
    POTargetEntry: Optional[str] = None
    POTargetRowNum: Optional[int] = None
    CorrectionInvoiceItem: Optional[str] = None
    CorrInvAmountToStock: Optional[float] = None
    CorrInvAmountToDiffAcct: Optional[float] = None
    AppliedTax: Optional[float] = None
    AppliedTaxFC: Optional[float] = None
    AppliedTaxSC: Optional[float] = None
    WTLiable: Optional[str] = None
    DeferredTax: Optional[str] = None
    EqualizationTaxPercent: Optional[float] = None
    TotalEqualizationTax: Optional[float] = None
    TotalEqualizationTaxFC: Optional[float] = None
    TotalEqualizationTaxSC: Optional[float] = None
    NetTaxAmount: Optional[float] = None
    NetTaxAmountFC: Optional[float] = None
    NetTaxAmountSC: Optional[float] = None
    MeasureUnit: Optional[str] = None
    UnitsOfMeasurment: Optional[float] = None
    LineTotal: Optional[float] = None
    TaxPercentagePerRow: Optional[float] = None
    TaxTotal: Optional[float] = None
    ConsumerSalesForecast: Optional[str] = None
    ExciseAmount: Optional[float] = None
    TaxPerUnit: Optional[float] = None
    TotalInclTax: Optional[float] = None
    CountryOrg: Optional[str] = None
    SWW: Optional[str] = None
    TransactionType: Optional[str] = None
    DistributeExpense: Optional[str] = None
    RowTotalFC: Optional[float] = None
    RowTotalSC: Optional[float] = None
    LastBuyInmPrice: Optional[float] = None
    LastBuyDistributeSumFc: Optional[float] = None
    LastBuyDistributeSumSc: Optional[float] = None
    LastBuyDistributeSum: Optional[float] = None
    StockDistributesumForeign: Optional[float] = None
    StockDistributesumSystem: Optional[float] = None
    StockDistributesum: Optional[float] = None
    StockInmPrice: Optional[float] = None
    PickStatusEx: Optional[str] = None
    TaxBeforeDPM: Optional[float] = None
    TaxBeforeDPMFC: Optional[float] = None
    TaxBeforeDPMSC: Optional[float] = None
    CFOPCode: Optional[str] = None
    CSTCode: Optional[str] = None
    Usage: Optional[str] = None
    TaxOnly: Optional[str] = None
    VisualOrder: Optional[int] = None
    BaseOpenQuantity: Optional[float] = None
    UnitPrice: Optional[float] = None
    LineStatus: Optional[str] = None
    PackageQuantity: Optional[float] = None
    Text: Optional[str] = None
    LineType: Optional[str] = None
    COGSCostingCode: Optional[str] = None
    COGSAccountCode: Optional[str] = None
    ChangeAssemlyBoMWarehouse: Optional[str] = None
    GrossBuyPrice: Optional[float] = None
    GrossBase: Optional[int] = None
    GrossProfitTotalBasePrice: Optional[float] = None
    CostingCode2: Optional[str] = None
    CostingCode3: Optional[str] = None
    CostingCode4: Optional[str] = None
    CostingCode5: Optional[str] = None
    ItemDetails: Optional[str] = None
    LocationCode: Optional[str] = None
    ActualDeliveryDate: Optional[str] = None
    RemainingOpenQuantity: Optional[float] = None
    OpenAmount: Optional[float] = None
    OpenAmountFC: Optional[float] = None
    OpenAmountSC: Optional[float] = None
    ExLineNo: Optional[str] = None
    RequiredDate: Optional[str] = None
    RequiredQuantity: Optional[float] = None
    COGSCostingCode2: Optional[str] = None
    COGSCostingCode3: Optional[str] = None
    COGSCostingCode4: Optional[str] = None
    COGSCostingCode5: Optional[str] = None
    CSTforIPI: Optional[str] = None
    CSTforPIS: Optional[str] = None
    CSTforCOFINS: Optional[str] = None
    CreditOriginCode: Optional[str] = None
    WithoutInventoryMovement: Optional[str] = None
    AgreementNo: Optional[int] = None
    AgreementRowNumber: Optional[int] = None
    ActualBaseEntry: Optional[int] = None
    ActualBaseLine: Optional[int] = None
    DocEntry: Optional[int] = None
    Surpluses: Optional[float] = None
    DefectAndBreakup: Optional[float] = None
    Shortages: Optional[float] = None
    ConsiderQuantity: Optional[str] = None
    PartialRetirement: Optional[str] = None
    RetirementQuantity: Optional[float] = None
    RetirementAPC: Optional[float] = None
    ThirdParty: Optional[str] = None
    PoNum: Optional[str] = None
    PoItmNum: Optional[str] = None
    ExpenseType: Optional[str] = None
    ReceiptNumber: Optional[str] = None
    ExpenseOperationType: Optional[str] = None
    FederalTaxID: Optional[str] = None
    GrossProfit: Optional[float] = None
    GrossProfitFC: Optional[float] = None
    GrossProfitSC: Optional[float] = None
    PriceSource: Optional[str] = None
    StgSeqNum: Optional[int] = None
    StgEntry: Optional[int] = None
    StgDesc: Optional[str] = None
    UoMEntry: Optional[int] = None
    UoMCode: Optional[str] = None
    InventoryQuantity: Optional[float] = None
    RemainingOpenInventoryQuantity: Optional[float] = None
    ParentLineNum: Optional[int] = None
    Incoterms: Optional[int] = None
    TransportMode: Optional[int] = None
    NatureOfTransaction: Optional[int] = None
    DestinationCountryForImport: Optional[str] = None
    DestinationRegionForImport: Optional[int] = None
    OriginCountryForExport: Optional[str] = None
    OriginRegionForExport: Optional[int] = None
    ItemType: Optional[str] = None
    ChangeInventoryQuantityIndependently: Optional[str] = None
    FreeOfChargeBP: Optional[str] = None
    SACEntry: Optional[int] = None
    HSNEntry: Optional[int] = None
    GrossPrice: Optional[float] = None
    GrossTotal: Optional[float] = None
    GrossTotalFC: Optional[float] = None
    GrossTotalSC: Optional[float] = None
    NCMCode: Optional[int] = None
    NVECode: Optional[str] = None
    IndEscala: Optional[str] = None
    CtrSealQty: Optional[float] = None
    CNJPMan: Optional[str] = None
    CESTCode: Optional[int] = None
    UFFiscalBenefitCode: Optional[str] = None
    ReverseCharge: Optional[str] = None
    ShipToCode: Optional[str] = None
    ShipToDescription: Optional[str] = None
    #OwnerCode: Optional[str] = None
    ExternalCalcTaxRate: Optional[float] = None
    ExternalCalcTaxAmount: Optional[float] = None
    ExternalCalcTaxAmountFC: Optional[float] = None
    ExternalCalcTaxAmountSC: Optional[float] = None
    StandardItemIdentification: Optional[int] = None
    CommodityClassification: Optional[int] = None
    WeightOfRecycledPlastic: Optional[float] = None
    PlasticPackageExemptionReason: Optional[str] = None
    LegalText: Optional[str] = None
    Cig: Optional[str] = None
    Cup: Optional[str] = None
    OperatingProfit: Optional[float] = None
    OperatingProfitFC: Optional[float] = None
    OperatingProfitSC: Optional[float] = None
    NetIncome: Optional[float] = None
    NetIncomeFC: Optional[float] = None
    NetIncomeSC: Optional[float] = None
    CSTforIBS: Optional[str] = None
    CSTforCBS: Optional[str] = None
    CSTforIS: Optional[str] = None
    UnencumberedReason: Optional[str] = None
    CUSplit: Optional[str] = None
    ListNum: Optional[int] = None
    RecognizedTaxCode: Optional[str] = None

    # User-defined fields (U_ prefix)
    U_VPS_DTV_PRSTART: Optional[str] = None
    U_VPS_DTV_PRENDE: Optional[str] = None
    U_CKS_BasePrice: Optional[float] = None
    U_CKS_HasBasePrice: Optional[str] = None
    U_CKS_BaseQuantity: Optional[float] = None
    U_QYCPIC: Optional[str] = None
    U_QYCComitDat: Optional[str] = None
    U_QYCCfgVal: Optional[str] = None
    U_QYC_AFO: Optional[str] = None
    U_QYCPrdEntry: Optional[int] = None
    U_QYCPrdLine: Optional[int] = None
    U_QYCSalEntry: Optional[int] = None
    U_QYCSalLine: Optional[int] = None
    U_QYCSalDocNum: Optional[str] = None
    U_QYCPURENTR: Optional[int] = None
    U_QYCPurLine: Optional[int] = None
    U_QYCPurDocNum: Optional[str] = None
    U_QYC_PONR: Optional[str] = None
    U_QYCCalcShipD: Optional[str] = None
    U_QYCPrchConfReq: Optional[str] = None
    U_QYCPrchConf: Optional[str] = None
    U_QYCPrchConfN: Optional[str] = None
    U_QYCPrchConfD: Optional[str] = None
    U_QYCConfDunD: Optional[str] = None
    U_QYCOrigShipD: Optional[str] = None
    U_QYCOrigQty: Optional[float] = None
    U_QYCCapRel: Optional[str] = None
    U_QYCJobTme: Optional[float] = None
    U_QYCTimeU: Optional[str] = None
    U_QYCSrvCalls: Optional[str] = None
    U_QYCJobOrders: Optional[str] = None
    U_QYCCount: Optional[str] = None
    U_QYCTrnspD: Optional[int] = None
    U_QYCParents: Optional[str] = None
    U_QYCTransID: Optional[int] = None
    U_QYCDelDun: Optional[str] = None
    U_QYCRTrans: Optional[str] = None
    U_QYCOItemCode: Optional[str] = None
    U_QYCGRPOCLS: Optional[str] = None
    U_QYCGRPODSC: Optional[str] = None
    U_QYCCRTDISP: Optional[str] = None
    U_QYCAAPROCREQ: Optional[str] = None
    U_QYCAAPROCINFO: Optional[str] = None
    U_QYCREWORKREASON: Optional[int] = None
    U_QYCREWORKREMARK: Optional[str] = None
    U_QYCBILLTJOT: Optional[str] = None
    U_QYCBILLTJO: Optional[str] = None
    U_QYCBILLTJOL1: Optional[str] = None
    U_QYCBILLTJOL2: Optional[str] = None
    U_QYCBILLTJOL3: Optional[str] = None
    U_QYCCALC: Optional[str] = None
    U_QYCDLVPLN: Optional[str] = None
    U_QYCCARRIER: Optional[str] = None
    U_QYCTRNSCOND: Optional[str] = None
    U_QYCTRNSCONDTXT: Optional[str] = None
    U_QYCTRNSREM: Optional[str] = None
    U_QYCISFIXPRICE: Optional[str] = None
    U_QYCSHIPTOCARD: Optional[str] = None
    U_QYCTOOLCODE: Optional[str] = None
    U_QYCSHIPTODESC: Optional[str] = None
    U_QYCSHIPTODFMT: Optional[str] = None
    U_tmpQYCSHIPTOCODE: Optional[str] = None
    U_QYCSHIPTOCODE: Optional[str] = None
    U_DEU_MetaDocNum: Optional[str] = None

    # Nested collections
    LineTaxJurisdictions: Optional[List[LineTaxJurisdiction]] = None
    DocumentLineAdditionalExpenses: Optional[List[DocumentLineAdditionalExpense]] = None
    WithholdingTaxLines: Optional[List[WithholdingTaxLine]] = None
    SerialNumbers: Optional[List[SerialNumber]] = None
    BatchNumbers: Optional[List[BatchNumber]] = None
    DocumentLinesBinAllocations: Optional[List[DocumentLinesBinAllocation]] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        arbitrary_types_allowed=True
    )


class DocExpenseTaxJurisdiction(BaseModel):
    """Tax jurisdiction for document expenses"""
    model_config = ConfigDict(extra='allow')


class DocumentAdditionalExpense(BaseModel):
    """Additional expenses at document level (e.g., freight, insurance)"""
    ExpenseCode: Optional[int] = None
    LineTotal: Optional[float] = None
    LineTotalFC: Optional[float] = None
    LineTotalSys: Optional[float] = None
    PaidToDate: Optional[float] = None
    PaidToDateFC: Optional[float] = None
    PaidToDateSys: Optional[float] = None
    Remarks: Optional[str] = None
    DistributionMethod: Optional[str] = None
    TaxLiable: Optional[str] = None
    VatGroup: Optional[str] = None
    TaxPercent: Optional[float] = None
    TaxSum: Optional[float] = None
    TaxSumFC: Optional[float] = None
    TaxSumSys: Optional[float] = None
    DeductibleTaxSum: Optional[float] = None
    DeductibleTaxSumFC: Optional[float] = None
    DeductibleTaxSumSys: Optional[float] = None
    AquisitionTax: Optional[str] = None
    TaxCode: Optional[str] = None
    TaxType: Optional[str] = None
    TaxPaid: Optional[float] = None
    TaxPaidFC: Optional[float] = None
    TaxPaidSys: Optional[float] = None
    EqualizationTaxPercent: Optional[float] = None
    EqualizationTaxSum: Optional[float] = None
    EqualizationTaxFC: Optional[float] = None
    EqualizationTaxSys: Optional[float] = None
    TaxTotalSum: Optional[float] = None
    TaxTotalSumFC: Optional[float] = None
    TaxTotalSumSys: Optional[float] = None
    BaseDocEntry: Optional[int] = None
    BaseDocLine: Optional[int] = None
    BaseDocType: Optional[int] = None
    BaseDocumentReference: Optional[str] = None
    LineNum: Optional[int] = None
    LastPurchasePrice: Optional[str] = None
    Status: Optional[str] = None
    Stock: Optional[str] = None
    TargetAbsEntry: Optional[int] = None
    TargetType: Optional[int] = None
    WTLiable: Optional[str] = None
    DistributionRule: Optional[str] = None
    Project: Optional[str] = None
    DistributionRule2: Optional[str] = None
    DistributionRule3: Optional[str] = None
    DistributionRule4: Optional[str] = None
    DistributionRule5: Optional[str] = None
    LineGross: Optional[float] = None
    LineGrossSys: Optional[float] = None
    LineGrossFC: Optional[float] = None
    ExternalCalcTaxRate: Optional[float] = None
    ExternalCalcTaxAmount: Optional[float] = None
    ExternalCalcTaxAmountFC: Optional[float] = None
    ExternalCalcTaxAmountSC: Optional[float] = None
    CUSplit: Optional[str] = None
    DocFreight: Optional[str] = None

    DocExpenseTaxJurisdictions: Optional[List[DocExpenseTaxJurisdiction]] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        arbitrary_types_allowed=True
    )


class ElectronicProtocol(BaseModel):
    """Electronic protocol/signature information"""
    model_config = ConfigDict(extra='allow')


class WithholdingTaxDataWTX(BaseModel):
    """Withholding tax data WTX collection"""
    model_config = ConfigDict(extra='allow')


class WithholdingTaxData(BaseModel):
    """Withholding tax data collection"""
    model_config = ConfigDict(extra='allow')


class DocumentSpecialLine(BaseModel):
    """Special lines in the document"""
    model_config = ConfigDict(extra='allow')


class TaxExtension(BaseModel):
    """Extended tax information"""
    TaxId0: Optional[str] = None
    TaxId1: Optional[str] = None
    TaxId2: Optional[str] = None
    TaxId3: Optional[str] = None
    TaxId4: Optional[str] = None
    TaxId5: Optional[str] = None
    TaxId6: Optional[str] = None
    TaxId7: Optional[str] = None
    TaxId8: Optional[str] = None
    TaxId9: Optional[str] = None
    State: Optional[str] = None
    County: Optional[str] = None
    Incoterms: Optional[str] = None
    Vehicle: Optional[str] = None
    VehicleState: Optional[str] = None
    NFRef: Optional[str] = None
    Carrier: Optional[str] = None
    PackQuantity: Optional[int] = None
    PackDescription: Optional[str] = None
    Brand: Optional[str] = None
    ShipUnitNo: Optional[str] = None
    NetWeight: Optional[float] = None
    GrossWeight: Optional[float] = None
    StreetS: Optional[str] = None
    BlockS: Optional[str] = None
    BuildingS: Optional[str] = None
    CityS: Optional[str] = None
    ZipCodeS: Optional[str] = None
    CountyS: Optional[str] = None
    StateS: Optional[str] = None
    CountryS: Optional[str] = None
    StreetB: Optional[str] = None
    BlockB: Optional[str] = None
    BuildingB: Optional[str] = None
    CityB: Optional[str] = None
    ZipCodeB: Optional[str] = None
    CountyB: Optional[str] = None
    StateB: Optional[str] = None
    CountryB: Optional[str] = None
    ImportOrExport: Optional[str] = None
    MainUsage: Optional[str] = None
    GlobalLocationNumberS: Optional[str] = None
    GlobalLocationNumberB: Optional[str] = None
    TaxId12: Optional[str] = None
    TaxId13: Optional[str] = None
    BillOfEntryNo: Optional[str] = None
    BillOfEntryDate: Optional[str] = None
    OriginalBillOfEntryNo: Optional[str] = None
    OriginalBillOfEntryDate: Optional[str] = None
    ImportOrExportType: Optional[str] = None
    PortCode: Optional[str] = None
    DocEntry: Optional[int] = None
    BoEValue: Optional[float] = None
    ClaimRefund: Optional[str] = None
    DifferentialOfTaxRate: Optional[str] = None
    IsIGSTAccount: Optional[str] = None
    TaxId14: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        arbitrary_types_allowed=True
    )


class AddressExtension(BaseModel):
    """Extended address information for ship-to and bill-to"""
    ShipToStreet: Optional[str] = None
    ShipToStreetNo: Optional[str] = None
    ShipToBlock: Optional[str] = None
    ShipToBuilding: Optional[str] = None
    ShipToCity: Optional[str] = None
    ShipToZipCode: Optional[str] = None
    ShipToCounty: Optional[str] = None
    ShipToState: Optional[str] = None
    ShipToCountry: Optional[str] = None
    ShipToAddressType: Optional[str] = None
    BillToStreet: Optional[str] = None
    BillToStreetNo: Optional[str] = None
    BillToBlock: Optional[str] = None
    BillToBuilding: Optional[str] = None
    BillToCity: Optional[str] = None
    BillToZipCode: Optional[str] = None
    BillToCounty: Optional[str] = None
    BillToState: Optional[str] = None
    BillToCountry: Optional[str] = None
    BillToAddressType: Optional[str] = None
    ShipToGlobalLocationNumber: Optional[str] = None
    BillToGlobalLocationNumber: Optional[str] = None
    ShipToAddress2: Optional[str] = None
    ShipToAddress3: Optional[str] = None
    BillToAddress2: Optional[str] = None
    BillToAddress3: Optional[str] = None
    PlaceOfSupply: Optional[str] = None
    PurchasePlaceOfSupply: Optional[str] = None
    DocEntry: Optional[int] = None
    GoodsIssuePlaceBP: Optional[str] = None
    GoodsIssuePlaceCNPJ: Optional[str] = None
    GoodsIssuePlaceCPF: Optional[str] = None
    GoodsIssuePlaceStreet: Optional[str] = None
    GoodsIssuePlaceStreetNo: Optional[str] = None
    GoodsIssuePlaceBuilding: Optional[str] = None
    GoodsIssuePlaceZip: Optional[str] = None
    GoodsIssuePlaceBlock: Optional[str] = None
    GoodsIssuePlaceCity: Optional[str] = None
    GoodsIssuePlaceCounty: Optional[str] = None
    GoodsIssuePlaceState: Optional[str] = None
    GoodsIssuePlaceCountry: Optional[str] = None
    GoodsIssuePlacePhone: Optional[str] = None
    GoodsIssuePlaceEMail: Optional[str] = None
    GoodsIssuePlaceDepartureDate: Optional[str] = None
    DeliveryPlaceBP: Optional[str] = None
    DeliveryPlaceCNPJ: Optional[str] = None
    DeliveryPlaceCPF: Optional[str] = None
    DeliveryPlaceStreet: Optional[str] = None
    DeliveryPlaceStreetNo: Optional[str] = None
    DeliveryPlaceBuilding: Optional[str] = None
    DeliveryPlaceZip: Optional[str] = None
    DeliveryPlaceBlock: Optional[str] = None
    DeliveryPlaceCity: Optional[str] = None
    DeliveryPlaceCounty: Optional[str] = None
    DeliveryPlaceState: Optional[str] = None
    DeliveryPlaceCountry: Optional[str] = None
    DeliveryPlacePhone: Optional[str] = None
    DeliveryPlaceEMail: Optional[str] = None
    DeliveryPlaceDepartureDate: Optional[str] = None

    # User-defined fields
    U_CKS_LeitwegIdS: Optional[str] = None
    U_CKS_LeitwegIdB: Optional[str] = None
    U_QYCTrnspDS: Optional[int] = None
    U_QYCTrnspDB: Optional[int] = None
    U_QYCLatS: Optional[str] = None
    U_QYCLatB: Optional[str] = None
    U_QYCLonS: Optional[str] = None
    U_QYCLonB: Optional[str] = None
    U_QYCGLocInvS: Optional[str] = None
    U_QYCGLocInvB: Optional[str] = None
    U_QYCGLocChkS: Optional[str] = None
    U_QYCGLocChkB: Optional[str] = None
    U_QYCVATDES: Optional[str] = None
    U_QYCVATDEB: Optional[str] = None
    U_QYCDRVINFOS: Optional[str] = None
    U_QYCDRVINFOB: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        arbitrary_types_allowed=True
    )


class DocumentReference(BaseModel):
    """References to other documents"""
    model_config = ConfigDict(extra='allow')


class DocumentAdditionalIntrastatExpense(BaseModel):
    """Additional Intrastat expenses"""
    model_config = ConfigDict(extra='allow')


class DocumentApprovalRequest(BaseModel):
    """Approval request information"""
    model_config = ConfigDict(extra='allow')


class SAPOrder(BaseModel):
    """
    SAP Business One Sales Order (Orders) main model.
    All fields are optional to handle partial API responses.
    """
    # OData metadata
    odata_etag: Optional[str] = Field(None, alias="@odata.etag")

    # Main document fields
    DocEntry: Optional[int] = None
    DocNum: Optional[int] = None
    DocType: Optional[str] = None
    HandWritten: Optional[str] = None
    Printed: Optional[str] = None
    DocDate: Optional[str] = None
    DocDueDate: Optional[str] = None
    CardCode: Optional[str] = None
    CardName: Optional[str] = None
    Address: Optional[str] = None
    NumAtCard: Optional[str] = None
    DocTotal: Optional[float] = None
    AttachmentEntry: Optional[int] = None
    DocCurrency: Optional[str] = None
    DocRate: Optional[float] = None
    Reference1: Optional[str] = None
    Reference2: Optional[str] = None
    Comments: Optional[str] = None
    JournalMemo: Optional[str] = None
    PaymentGroupCode: Optional[int] = None
    DocTime: Optional[str] = None
    SalesPersonCode: Optional[int] = None
    TransportationCode: Optional[int] = None
    Confirmed: Optional[str] = None
    ImportFileNum: Optional[str] = None
    SummeryType: Optional[str] = None
    ContactPersonCode: Optional[int] = None
    ShowSCN: Optional[str] = None
    Series: Optional[int] = None
    TaxDate: Optional[str] = None
    PartialSupply: Optional[str] = None
    DocObjectCode: Optional[str] = None
    ShipToCode: Optional[str] = None
    Indicator: Optional[str] = None
    FederalTaxID: Optional[str] = None
    DiscountPercent: Optional[float] = None
    PaymentReference: Optional[str] = None
    CreationDate: Optional[str] = None
    UpdateDate: Optional[str] = None
    FinancialPeriod: Optional[int] = None
    UserSign: Optional[int] = None
    TransNum: Optional[int] = None
    VatSum: Optional[float] = None
    VatSumSys: Optional[float] = None
    VatSumFc: Optional[float] = None
    NetProcedure: Optional[str] = None
    DocTotalFc: Optional[float] = None
    DocTotalSys: Optional[float] = None
    Form1099: Optional[str] = None
    Box1099: Optional[str] = None
    RevisionPo: Optional[str] = None
    RequriedDate: Optional[str] = None
    CancelDate: Optional[str] = None
    BlockDunning: Optional[str] = None
    Submitted: Optional[str] = None
    Segment: Optional[int] = None
    PickStatus: Optional[str] = None
    Pick: Optional[str] = None
    PaymentMethod: Optional[str] = None
    PaymentBlock: Optional[str] = None
    PaymentBlockEntry: Optional[int] = None
    CentralBankIndicator: Optional[str] = None
    MaximumCashDiscount: Optional[str] = None
    Reserve: Optional[str] = None
    Project: Optional[str] = None
    ExemptionValidityDateFrom: Optional[str] = None
    ExemptionValidityDateTo: Optional[str] = None
    WareHouseUpdateType: Optional[str] = None
    Rounding: Optional[str] = None
    ExternalCorrectedDocNum: Optional[str] = None
    InternalCorrectedDocNum: Optional[str] = None
    NextCorrectingDocument: Optional[str] = None
    DeferredTax: Optional[str] = None
    TaxExemptionLetterNum: Optional[str] = None
    WTApplied: Optional[float] = None
    WTAppliedFC: Optional[float] = None
    BillOfExchangeReserved: Optional[str] = None
    AgentCode: Optional[str] = None
    WTAppliedSC: Optional[float] = None
    TotalEqualizationTax: Optional[float] = None
    TotalEqualizationTaxFC: Optional[float] = None
    TotalEqualizationTaxSC: Optional[float] = None
    NumberOfInstallments: Optional[int] = None
    ApplyTaxOnFirstInstallment: Optional[str] = None
    TaxOnInstallments: Optional[str] = None
    WTNonSubjectAmount: Optional[float] = None
    WTNonSubjectAmountSC: Optional[float] = None
    WTNonSubjectAmountFC: Optional[float] = None
    WTExemptedAmount: Optional[float] = None
    WTExemptedAmountSC: Optional[float] = None
    WTExemptedAmountFC: Optional[float] = None
    BaseAmount: Optional[float] = None
    BaseAmountSC: Optional[float] = None
    BaseAmountFC: Optional[float] = None
    WTAmount: Optional[float] = None
    WTAmountSC: Optional[float] = None
    WTAmountFC: Optional[float] = None
    VatDate: Optional[str] = None
    DocumentsOwner: Optional[int] = None
    FolioPrefixString: Optional[str] = None
    FolioNumber: Optional[int] = None
    DocumentSubType: Optional[str] = None
    BPChannelCode: Optional[str] = None
    BPChannelContact: Optional[int] = None
    Address2: Optional[str] = None
    DocumentStatus: Optional[str] = None
    PeriodIndicator: Optional[str] = None
    PayToCode: Optional[str] = None
    ManualNumber: Optional[str] = None
    UseShpdGoodsAct: Optional[str] = None
    IsPayToBank: Optional[str] = None
    PayToBankCountry: Optional[str] = None
    PayToBankCode: Optional[str] = None
    PayToBankAccountNo: Optional[str] = None
    PayToBankBranch: Optional[str] = None
    BPL_IDAssignedToInvoice: Optional[int] = None
    DownPayment: Optional[float] = None
    ReserveInvoice: Optional[str] = None
    LanguageCode: Optional[int] = None
    TrackingNumber: Optional[str] = None
    PickRemark: Optional[str] = None
    ClosingDate: Optional[str] = None
    SequenceCode: Optional[int] = None
    SequenceSerial: Optional[int] = None
    SeriesString: Optional[str] = None
    SubSeriesString: Optional[str] = None
    SequenceModel: Optional[str] = None
    UseCorrectionVATGroup: Optional[str] = None
    TotalDiscount: Optional[float] = None
    DownPaymentAmount: Optional[float] = None
    DownPaymentPercentage: Optional[float] = None
    DownPaymentType: Optional[str] = None
    DownPaymentAmountSC: Optional[float] = None
    DownPaymentAmountFC: Optional[float] = None
    VatPercent: Optional[float] = None
    ServiceGrossProfitPercent: Optional[float] = None
    OpeningRemarks: Optional[str] = None
    ClosingRemarks: Optional[str] = None
    RoundingDiffAmount: Optional[float] = None
    RoundingDiffAmountFC: Optional[float] = None
    RoundingDiffAmountSC: Optional[float] = None
    Cancelled: Optional[str] = None
    SignatureInputMessage: Optional[str] = None
    SignatureDigest: Optional[str] = None
    CertificationNumber: Optional[str] = None
    PrivateKeyVersion: Optional[int] = None
    ControlAccount: Optional[str] = None
    InsuranceOperation347: Optional[str] = None
    ArchiveNonremovableSalesQuotation: Optional[str] = None
    GTSChecker: Optional[int] = None
    GTSPayee: Optional[int] = None
    ExtraMonth: Optional[int] = None
    ExtraDays: Optional[int] = None
    CashDiscountDateOffset: Optional[int] = None
    StartFrom: Optional[str] = None
    NTSApproved: Optional[str] = None
    ETaxWebSite: Optional[int] = None
    ETaxNumber: Optional[str] = None
    NTSApprovedNumber: Optional[str] = None
    EDocGenerationType: Optional[str] = None
    EDocSeries: Optional[int] = None
    EDocNum: Optional[str] = None
    EDocExportFormat: Optional[int] = None
    EDocStatus: Optional[str] = None
    EDocErrorCode: Optional[str] = None
    EDocErrorMessage: Optional[str] = None
    DownPaymentStatus: Optional[str] = None
    GroupSeries: Optional[int] = None
    GroupNumber: Optional[int] = None
    GroupHandWritten: Optional[str] = None
    ReopenOriginalDocument: Optional[str] = None
    ReopenManuallyClosedOrCanceledDocument: Optional[str] = None
    CreateOnlineQuotation: Optional[str] = None
    POSEquipmentNumber: Optional[str] = None
    POSManufacturerSerialNumber: Optional[str] = None
    POSCashierNumber: Optional[str] = None
    ApplyCurrentVATRatesForDownPaymentsToDraw: Optional[str] = None
    ClosingOption: Optional[str] = None
    SpecifiedClosingDate: Optional[str] = None
    OpenForLandedCosts: Optional[str] = None
    AuthorizationStatus: Optional[str] = None
    TotalDiscountFC: Optional[float] = None
    TotalDiscountSC: Optional[float] = None
    RelevantToGTS: Optional[str] = None
    BPLName: Optional[str] = None
    VATRegNum: Optional[str] = None
    AnnualInvoiceDeclarationReference: Optional[int] = None
    Supplier: Optional[str] = None
    Releaser: Optional[int] = None
    Receiver: Optional[int] = None
    BlanketAgreementNumber: Optional[int] = None
    IsAlteration: Optional[str] = None
    CancelStatus: Optional[str] = None
    AssetValueDate: Optional[str] = None
    DocumentDelivery: Optional[str] = None
    AuthorizationCode: Optional[str] = None
    StartDeliveryDate: Optional[str] = None
    StartDeliveryTime: Optional[str] = None
    EndDeliveryDate: Optional[str] = None
    EndDeliveryTime: Optional[str] = None
    VehiclePlate: Optional[str] = None
    ATDocumentType: Optional[str] = None
    ElecCommStatus: Optional[str] = None
    ElecCommMessage: Optional[str] = None
    ReuseDocumentNum: Optional[str] = None
    ReuseNotaFiscalNum: Optional[str] = None
    PrintSEPADirect: Optional[str] = None
    FiscalDocNum: Optional[str] = None
    POSDailySummaryNo: Optional[int] = None
    POSReceiptNo: Optional[int] = None
    PointOfIssueCode: Optional[str] = None
    Letter: Optional[str] = None
    FolioNumberFrom: Optional[int] = None
    FolioNumberTo: Optional[int] = None
    InterimType: Optional[str] = None
    RelatedType: Optional[int] = None
    RelatedEntry: Optional[int] = None
    SAPPassport: Optional[str] = None
    DocumentTaxID: Optional[str] = None
    DateOfReportingControlStatementVAT: Optional[str] = None
    ReportingSectionControlStatementVAT: Optional[str] = None
    ExcludeFromTaxReportControlStatementVAT: Optional[str] = None
    POS_CashRegister: Optional[str] = None
    UpdateTime: Optional[str] = None
    CreateQRCodeFrom: Optional[str] = None
    PriceMode: Optional[str] = None
    ShipFrom: Optional[str] = None
    CommissionTrade: Optional[str] = None
    CommissionTradeReturn: Optional[str] = None
    UseBillToAddrToDetermineTax: Optional[str] = None
    Cig: Optional[str] = None
    Cup: Optional[str] = None
    FatherCard: Optional[str] = None
    FatherType: Optional[str] = None
    ShipState: Optional[str] = None
    ShipPlace: Optional[str] = None
    CustOffice: Optional[str] = None
    FCI: Optional[str] = None
    AddLegIn: Optional[str] = None
    LegTextF: Optional[str] = None
    DANFELgTxt: Optional[str] = None
    IndFinal: Optional[str] = None
    DataVersion: Optional[int] = None
    LastPageFolioNumber: Optional[int] = None
    InventoryStatus: Optional[str] = None
    PlasticPackagingTaxRelevant: Optional[str] = None
    NotRelevantForMonthlyInvoice: Optional[str] = None
    EndAt: Optional[str] = None

    # User-defined fields (U_ prefix)
    U_VPS_DTV_PRSTART: Optional[str] = None
    U_VPS_DTV_PRENDE: Optional[str] = None
    U_VPS_DTV_REF: Optional[str] = None
    U_VPS_FAV: Optional[str] = None
    U_VPS_FAV_TEXT: Optional[str] = None
    U_CKSDMSID: Optional[str] = None
    U_CKSDMSFILEID: Optional[str] = None
    U_CKSDMSPRINTGUID: Optional[str] = None
    U_CKS_AdrDocRef: Optional[str] = None
    U_CKS_AdcSearch1: Optional[str] = None
    U_CKS_AdcSearch2: Optional[str] = None
    U_CKS_Send_eINV: Optional[str] = None
    U_CKS_BarcodeID: Optional[str] = None
    U_CKS_Gen_eINV: Optional[str] = None
    U_SMTPStat: Optional[str] = None
    U_COR_BW_FromDate: Optional[str] = None
    U_COR_BW_ToDate: Optional[str] = None
    U_QYCFRBES: Optional[str] = None
    U_QYCFRVG: Optional[int] = None
    U_QYCPrchConfReq: Optional[str] = None
    U_QYCPrchConf: Optional[str] = None
    U_QYCPDCempID: Optional[int] = None
    U_QYCDocSrc: Optional[str] = None
    U_QYCPrntTyp: Optional[str] = None
    U_QYCJobOrdr: Optional[str] = None
    U_QYCBillTo: Optional[str] = None
    U_QYCCARRIER: Optional[str] = None
    U_QYCTRNSCOND: Optional[str] = None
    U_QYCTRNSCONDTXT: Optional[str] = None
    U_QYCTRNSREM: Optional[str] = None
    U_QYCFINCUST: Optional[str] = None
    U_candis_document_url: Optional[str] = None
    U_candis_entity_id: Optional[str] = None
    U_DEU_CustPrch: Optional[str] = None
    U_DEU_LZTage: Optional[int] = None

    # Nested collections
    Document_ApprovalRequests: Optional[List[DocumentApprovalRequest]] = None
    DocumentLines: Optional[List[DocumentLine]] = None
    ElectronicProtocols: Optional[List[ElectronicProtocol]] = None
    DocumentAdditionalExpenses: Optional[List[DocumentAdditionalExpense]] = None
    WithholdingTaxDataWTXCollection: Optional[List[WithholdingTaxDataWTX]] = None
    WithholdingTaxDataCollection: Optional[List[WithholdingTaxData]] = None
    DocumentSpecialLines: Optional[List[DocumentSpecialLine]] = None
    # TaxExtension: Optional[TaxExtension] = None
    # AddressExtension: Optional[AddressExtension] = None
    DocumentReferences: Optional[List[DocumentReference]] = None
    DocumentAdditionalIntrastatExpenses: Optional[List[DocumentAdditionalIntrastatExpense]] = None

    model_config = ConfigDict(
        populate_by_name=True,  # Allow using aliases
        use_enum_values=True,
        from_attributes=True,  # Allow ORM mode
        arbitrary_types_allowed=True
    )


# Helper functions for parsing
def parse_sap_order(data: Union[str, dict]) -> SAPOrder:
    """
    Parse a single SAP order from JSON string or dictionary.

    Args:
        data: JSON string or dictionary containing a single order

    Returns:
        SAPOrder: Parsed order object

    Example:
        >>> order_json = '{"DocNum": 10001, "CardName": "Customer"}'
        >>> order = parse_sap_order(order_json)
        >>> print(order.DocNum)
        10001
    """
    if isinstance(data, str):
        data = json.loads(data)
    return SAPOrder(**data)


def parse_sap_orders(data: Union[str, list]) -> List[SAPOrder]:
    """
    Parse multiple SAP orders from JSON string or list of dictionaries.

    Args:
        data: JSON string containing an array or list of order dictionaries

    Returns:
        List[SAPOrder]: List of parsed order objects

    Example:
        >>> orders_json = '[{"DocNum": 10001}, {"DocNum": 10002}]'
        >>> orders = parse_sap_orders(orders_json)
        >>> print(len(orders))
        2
        >>> print(orders[0].DocNum)
        10001
    """
    if isinstance(data, str):
        data = json.loads(data)

    if not isinstance(data, list):
        raise ValueError("Expected a list of orders, got a single object. Use parse_sap_order() instead.")

    return [SAPOrder(**order) for order in data]


class Order(Base):
    """Order model"""
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    order_id = Column(String(255), nullable=True)
    description = Column(String(255), nullable=True)
    comment = Column(String, nullable=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey('customers.id'), nullable=False)

    #customer = relationship("Customer", back_populates="orders")
    #items = relationship("Item", back_populates="order")
