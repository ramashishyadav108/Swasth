from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Medicine, MedicineStatus
from schemas import (
    MedicineCreate,
    MedicineUpdate,
    MedicineStatusUpdate,
    MedicineOut,
    MedicineListResponse,
    InventoryOverview,
)

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


def _compute_status(quantity: int, expiry_date: date) -> MedicineStatus:
    """Centralised status calculation rule."""
    today = date.today()
    if expiry_date < today:
        return MedicineStatus.expired
    if quantity == 0:
        return MedicineStatus.out_of_stock
    if quantity < 50:
        return MedicineStatus.low_stock
    return MedicineStatus.active


# ── List / Search ──────────────────────────────────────────────────────────────

@router.get("/medicines", response_model=MedicineListResponse)
def list_medicines(
    search: Optional[str] = Query(None, description="Search by name or generic name"),
    status: Optional[MedicineStatus] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """Return a paginated, filterable list of medicines."""
    query = db.query(Medicine)

    if search:
        like = f"%{search}%"
        query = query.filter(
            (Medicine.name.ilike(like)) | (Medicine.generic_name.ilike(like))
        )
    if status:
        query = query.filter(Medicine.status == status)
    if category:
        query = query.filter(Medicine.category.ilike(f"%{category}%"))

    total = query.count()
    items = (
        query.order_by(Medicine.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return MedicineListResponse(total=total, page=page, page_size=page_size, items=items)


# ── Create ─────────────────────────────────────────────────────────────────────

@router.post("/medicines", response_model=MedicineOut, status_code=201)
def create_medicine(payload: MedicineCreate, db: Session = Depends(get_db)):
    """Add a new medicine to inventory."""
    # Check for duplicate batch number
    existing = db.query(Medicine).filter(Medicine.batch_no == payload.batch_no).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Medicine with batch_no '{payload.batch_no}' already exists.",
        )

    status = _compute_status(payload.quantity, payload.expiry_date)

    medicine = Medicine(
        name=payload.name,
        generic_name=payload.generic_name,
        category=payload.category,
        batch_no=payload.batch_no,
        expiry_date=payload.expiry_date,
        quantity=payload.quantity,
        cost_price=payload.cost_price,
        mrp=payload.mrp,
        supplier=payload.supplier,
        status=status,
    )
    db.add(medicine)
    db.commit()
    db.refresh(medicine)
    return medicine


# ── Update ─────────────────────────────────────────────────────────────────────

@router.put("/medicines/{medicine_id}", response_model=MedicineOut)
def update_medicine(
    medicine_id: int, payload: MedicineUpdate, db: Session = Depends(get_db)
):
    """Update an existing medicine. Status is always recalculated."""
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found.")

    update_data = payload.dict(exclude_unset=True)

    # Check batch uniqueness if being changed
    if "batch_no" in update_data and update_data["batch_no"] != medicine.batch_no:
        conflict = (
            db.query(Medicine)
            .filter(Medicine.batch_no == update_data["batch_no"])
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=409,
                detail=f"Batch number '{update_data['batch_no']}' is already in use.",
            )

    for field, value in update_data.items():
        setattr(medicine, field, value)

    # Always recalculate status after any update
    medicine.status = _compute_status(medicine.quantity, medicine.expiry_date)

    db.commit()
    db.refresh(medicine)
    return medicine


# ── Status Patch ───────────────────────────────────────────────────────────────

@router.patch("/medicines/{medicine_id}/status", response_model=MedicineOut)
def update_medicine_status(
    medicine_id: int,
    payload: MedicineStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Manually override the status to 'expired' or 'out_of_stock'.
    The business rule only allows manual override for these two terminal states.
    """
    allowed_overrides = {MedicineStatus.expired, MedicineStatus.out_of_stock}
    if payload.status not in allowed_overrides:
        raise HTTPException(
            status_code=400,
            detail="Manual status override is only allowed for 'expired' or 'out_of_stock'.",
        )

    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found.")

    medicine.status = payload.status
    db.commit()
    db.refresh(medicine)
    return medicine


# ── Overview ───────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=InventoryOverview)
def inventory_overview(db: Session = Depends(get_db)):
    """Return high-level inventory statistics."""
    total_items: int = db.query(func.count(Medicine.id)).scalar()

    active_stock: int = (
        db.query(func.count(Medicine.id))
        .filter(Medicine.status == MedicineStatus.active)
        .scalar()
    )

    low_stock: int = (
        db.query(func.count(Medicine.id))
        .filter(Medicine.status == MedicineStatus.low_stock)
        .scalar()
    )

    # Total inventory value = sum(quantity * cost_price) for non-expired, non-out-of-stock
    total_value_result = (
        db.query(func.coalesce(func.sum(Medicine.quantity * Medicine.cost_price), 0.0))
        .filter(
            Medicine.status.in_([MedicineStatus.active, MedicineStatus.low_stock])
        )
        .scalar()
    )
    total_value: float = float(total_value_result)

    return InventoryOverview(
        total_items=total_items,
        active_stock=active_stock,
        low_stock=low_stock,
        total_value=round(total_value, 2),
    )
