from datetime import date, datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Enum,
    func,
)
from sqlalchemy.orm import relationship
import enum

from database import Base


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


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    batch_no = Column(String(100), nullable=False, unique=True)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    cost_price = Column(Float, nullable=False)
    mrp = Column(Float, nullable=False)
    supplier = Column(String(255), nullable=False)
    status = Column(
        Enum(MedicineStatus),
        nullable=False,
        default=MedicineStatus.active,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    sale_items = relationship("SaleItem", back_populates="medicine")

    def recalculate_status(self) -> MedicineStatus:
        """Auto-calculate status based on quantity and expiry date."""
        today = date.today()
        if self.expiry_date and self.expiry_date < today:
            return MedicineStatus.expired
        if self.quantity == 0:
            return MedicineStatus.out_of_stock
        if self.quantity < 50:
            return MedicineStatus.low_stock
        return MedicineStatus.active


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String(50), nullable=False, unique=True, index=True)
    patient_name = Column(String(255), nullable=False)
    payment_mode = Column(
        Enum(PaymentMode), nullable=False, default=PaymentMode.cash
    )
    total_amount = Column(Float, nullable=False, default=0.0)
    status = Column(
        Enum(SaleStatus), nullable=False, default=SaleStatus.completed
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    sale = relationship("Sale", back_populates="items")
    medicine = relationship("Medicine", back_populates="sale_items")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), nullable=False, unique=True, index=True)
    supplier = Column(String(255), nullable=False)
    total_amount = Column(Float, nullable=False, default=0.0)
    payment_mode = Column(Enum(PaymentMode), nullable=False, default=PaymentMode.cash)
    status = Column(
        Enum(PurchaseOrderStatus),
        nullable=False,
        default=PurchaseOrderStatus.completed,
    )
    draft_json = Column(String, nullable=True)  # JSON string for pending draft rows
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    medicine_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    purchase = relationship("PurchaseOrder", back_populates="items")
    medicine = relationship("Medicine")
