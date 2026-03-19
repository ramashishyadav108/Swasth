from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Medicine, MedicineStatus, Sale, SaleItem
from schemas import SaleCreate, SaleOut
from routers.inventory import _compute_status

router = APIRouter(prefix="/api/sales", tags=["Sales"])


def _next_invoice_no(db: Session) -> str:
    """Generate the next sequential invoice number."""
    count = db.query(Sale).count()
    year = datetime.utcnow().year
    return f"INV-{year}-{count + 1:04d}"


@router.post("", response_model=SaleOut, status_code=201)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    """Create a new sale, decrement stock, and auto-recalculate medicine status."""
    # Validate all medicines exist and have sufficient stock
    medicines: dict[int, Medicine] = {}
    for item in payload.items:
        med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        if not med:
            raise HTTPException(
                status_code=404,
                detail=f"Medicine with id {item.medicine_id} not found.",
            )
        if med.status == MedicineStatus.expired:
            raise HTTPException(
                status_code=400,
                detail=f"Medicine '{med.name}' is expired and cannot be sold.",
            )
        if med.quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient stock for '{med.name}'. "
                    f"Available: {med.quantity}, Requested: {item.quantity}."
                ),
            )
        medicines[item.medicine_id] = med

    # Calculate total
    total_amount = sum(item.quantity * item.unit_price for item in payload.items)
    invoice_no = _next_invoice_no(db)

    sale = Sale(
        invoice_no=invoice_no,
        patient_name=payload.patient_name,
        payment_mode=payload.payment_mode,
        total_amount=round(total_amount, 2),
    )
    db.add(sale)
    db.flush()  # get sale.id without full commit

    for item in payload.items:
        sale_item = SaleItem(
            sale_id=sale.id,
            medicine_id=item.medicine_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        db.add(sale_item)

        # Decrement stock and recalculate status
        med = medicines[item.medicine_id]
        med.quantity -= item.quantity
        med.status = _compute_status(med.quantity, med.expiry_date)

    db.commit()
    db.refresh(sale)
    return sale


@router.get("", response_model=List[SaleOut])
def list_sales(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Return a list of sales, newest first."""
    if limit > 200:
        raise HTTPException(status_code=400, detail="limit cannot exceed 200.")
    sales = (
        db.query(Sale)
        .order_by(Sale.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return sales
