from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator
import enum


# ── Enums ────────────────────────────────────────────────────────────────────

class MedicineStatus(str, enum.Enum):
    active = "active"
    low_stock = "low_stock"
    expired = "expired"
    out_of_stock = "out_of_stock"


class PaymentMode(str, enum.Enum):
    cash = "Cash"
    card = "Card"
    upi = "UPI"
    insurance = "Insurance"


class SaleStatus(str, enum.Enum):
    completed = "Completed"
    pending = "Pending"
    cancelled = "Cancelled"


class PurchaseOrderStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"


# ── Medicine Schemas ──────────────────────────────────────────────────────────

class MedicineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    generic_name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    batch_no: str = Field(..., min_length=1, max_length=100)
    expiry_date: date
    quantity: int = Field(..., ge=0)
    cost_price: float = Field(..., gt=0)
    mrp: float = Field(..., gt=0)
    supplier: str = Field(..., min_length=1, max_length=255)


class MedicineCreate(MedicineBase):
    pass


class MedicineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    generic_name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    batch_no: Optional[str] = Field(None, min_length=1, max_length=100)
    expiry_date: Optional[date] = None
    quantity: Optional[int] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, gt=0)
    mrp: Optional[float] = Field(None, gt=0)
    supplier: Optional[str] = Field(None, min_length=1, max_length=255)


class MedicineStatusUpdate(BaseModel):
    status: MedicineStatus


class MedicineOut(MedicineBase):
    id: int
    status: MedicineStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MedicineListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[MedicineOut]


# ── Sale Schemas ──────────────────────────────────────────────────────────────

class SaleItemCreate(BaseModel):
    medicine_id: int
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)


class SaleCreate(BaseModel):
    patient_name: str = Field(..., min_length=1, max_length=255)
    payment_mode: PaymentMode
    items: List[SaleItemCreate] = Field(..., min_items=1)


class SaleItemOut(BaseModel):
    id: int
    medicine_id: int
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class SaleOut(BaseModel):
    id: int
    invoice_no: str
    patient_name: str
    payment_mode: PaymentMode
    total_amount: float
    status: SaleStatus
    created_at: datetime
    items: List[SaleItemOut] = []

    class Config:
        from_attributes = True


class RecentSaleOut(BaseModel):
    id: int
    invoice_no: str
    patient_name: str
    items_count: int
    payment_mode: PaymentMode
    total_amount: float
    date: datetime
    status: SaleStatus

    class Config:
        from_attributes = True


# ── Purchase Order Schemas ────────────────────────────────────────────────────

class PurchaseItemCreate(BaseModel):
    medicine_id: int
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)


class PurchaseItemDirectCreate(BaseModel):
    medicine_name: str = Field(..., min_length=1, max_length=255)
    generic_name: str = Field("", max_length=255)
    category: str = Field("General", max_length=100)
    batch_no: str = Field(..., min_length=1, max_length=100)
    expiry_date: date
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    mrp: float = Field(..., gt=0)
    supplier: str = Field(..., min_length=1, max_length=255)


class PurchaseDirectCreate(BaseModel):
    payment_mode: PaymentMode = PaymentMode.cash
    items: List[PurchaseItemDirectCreate] = Field(..., min_items=1)


class PurchaseCreate(BaseModel):
    supplier: str = Field(..., min_length=1, max_length=255)
    payment_mode: PaymentMode = PaymentMode.cash
    items: List[PurchaseItemCreate] = Field(..., min_items=1)


class PurchaseItemOut(BaseModel):
    id: int
    medicine_id: int
    medicine_name: str
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class PurchaseOrderOut(BaseModel):
    id: int
    order_no: str
    supplier: str
    total_amount: float
    status: PurchaseOrderStatus
    payment_mode: PaymentMode
    created_at: datetime
    items: List[PurchaseItemOut] = []

    class Config:
        from_attributes = True


class RecentPurchaseOut(BaseModel):
    id: int
    order_no: str
    supplier: str
    items_count: int
    payment_mode: PaymentMode
    total_amount: float
    date: datetime
    status: PurchaseOrderStatus

    class Config:
        from_attributes = True


class PurchaseOrderCreate(BaseModel):
    supplier: str = Field(..., min_length=1, max_length=255)
    total_amount: float = Field(..., ge=0)
    status: PurchaseOrderStatus = PurchaseOrderStatus.pending


class PurchaseDraftCreate(BaseModel):
    payment_mode: PaymentMode = PaymentMode.cash
    items: List[PurchaseItemDirectCreate] = Field(..., min_items=1)


class PurchaseDraftOut(BaseModel):
    id: int
    order_no: str
    supplier: str
    total_amount: float
    payment_mode: PaymentMode
    status: PurchaseOrderStatus
    created_at: datetime
    draft_items: List[PurchaseItemDirectCreate] = []

    class Config:
        from_attributes = True


# ── Dashboard Schemas ─────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    today_sales: float
    today_sales_change_pct: float
    items_sold_today: int
    items_sold_orders: int
    low_stock_count: int
    purchase_orders_total: float
    purchase_orders_pending: int


class InventoryOverview(BaseModel):
    total_items: int
    active_stock: int
    low_stock: int
    total_value: float
