import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Medicine, PurchaseOrder, PurchaseItem
from schemas import (
    PurchaseDirectCreate,
    PurchaseDraftCreate,
    PurchaseDraftOut,
    PurchaseItemDirectCreate,
    PurchaseOrderOut,
    RecentPurchaseOut,
)
from routers.inventory import _compute_status

router = APIRouter(prefix="/api/purchases", tags=["Purchases"])


def _next_order_no(db: Session) -> str:
    count = db.query(PurchaseOrder).count()
    year = datetime.utcnow().year
    return f"PO-{year}-{count + 1:04d}"


def _apply_stock(db: Session, purchase: PurchaseOrder, items: List[PurchaseItemDirectCreate]) -> None:
    """Increase medicine stock for each item; create medicine if batch not found."""
    for item in items:
        med = db.query(Medicine).filter(Medicine.batch_no == item.batch_no).first()

        if med:
            med.quantity += item.quantity
            med.cost_price = item.unit_price
            med.mrp = item.mrp
            med.supplier = item.supplier
            med.status = _compute_status(med.quantity, med.expiry_date)
        else:
            generic = item.generic_name.strip() if item.generic_name.strip() else item.medicine_name
            med = Medicine(
                name=item.medicine_name,
                generic_name=generic,
                category=item.category or "General",
                batch_no=item.batch_no,
                expiry_date=item.expiry_date,
                quantity=item.quantity,
                cost_price=item.unit_price,
                mrp=item.mrp,
                supplier=item.supplier,
                status=_compute_status(item.quantity, item.expiry_date),
            )
            db.add(med)
            db.flush()

        purchase_item = PurchaseItem(
            purchase_id=purchase.id,
            medicine_id=med.id,
            medicine_name=med.name,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        db.add(purchase_item)


# ── Save as pending draft ───────────────────────────────────────────────────

@router.post("/draft", response_model=PurchaseDraftOut, status_code=201)
def save_draft(payload: PurchaseDraftCreate, db: Session = Depends(get_db)):
    """Save purchase rows as a pending draft without touching stock."""
    total_amount = sum(item.quantity * item.unit_price for item in payload.items)
    first_supplier = payload.items[0].supplier if payload.items else "Unknown"
    order_no = _next_order_no(db)

    # Serialize items to JSON for storage
    draft_json = json.dumps([item.dict() for item in payload.items], default=str)

    purchase = PurchaseOrder(
        order_no=order_no,
        supplier=first_supplier,
        payment_mode=payload.payment_mode,
        total_amount=round(total_amount, 2),
        status="pending",
        draft_json=draft_json,
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    items_out = [PurchaseItemDirectCreate(**i) for i in json.loads(purchase.draft_json)]
    return PurchaseDraftOut(
        id=purchase.id,
        order_no=purchase.order_no,
        supplier=purchase.supplier,
        total_amount=purchase.total_amount,
        payment_mode=purchase.payment_mode,
        status=purchase.status,
        created_at=purchase.created_at,
        draft_items=items_out,
    )


# ── List pending drafts ─────────────────────────────────────────────────────

@router.get("/pending", response_model=List[PurchaseDraftOut])
def list_pending(db: Session = Depends(get_db)):
    """Return all pending purchase drafts."""
    orders = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.status == "pending")
        .order_by(PurchaseOrder.created_at.desc())
        .all()
    )
    result = []
    for p in orders:
        items_out = []
        if p.draft_json:
            try:
                items_out = [PurchaseItemDirectCreate(**i) for i in json.loads(p.draft_json)]
            except Exception:
                pass
        result.append(PurchaseDraftOut(
            id=p.id,
            order_no=p.order_no,
            supplier=p.supplier,
            total_amount=p.total_amount,
            payment_mode=p.payment_mode,
            status=p.status,
            created_at=p.created_at,
            draft_items=items_out,
        ))
    return result


# ── Complete a pending draft ────────────────────────────────────────────────

@router.delete("/{purchase_id}", status_code=204)
def delete_draft(purchase_id: int, db: Session = Depends(get_db)):
    """Delete a pending purchase draft."""
    purchase = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    if purchase.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending purchases can be deleted.")
    
    db.delete(purchase)
    db.commit()

@router.post("/{purchase_id}/complete", response_model=PurchaseOrderOut)
def complete_draft(purchase_id: int, db: Session = Depends(get_db)):
    """Finalize a pending purchase: apply stock and mark completed."""
    purchase = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    if purchase.status != "pending":
        raise HTTPException(status_code=400, detail="Purchase is already completed.")
    if not purchase.draft_json:
        raise HTTPException(status_code=400, detail="No draft data found.")

    items = [PurchaseItemDirectCreate(**i) for i in json.loads(purchase.draft_json)]
    _apply_stock(db, purchase, items)

    purchase.status = "completed"
    purchase.draft_json = None
    db.commit()
    db.refresh(purchase)
    return purchase


# ── Receive immediately (completed) ────────────────────────────────────────

@router.post("", response_model=PurchaseOrderOut, status_code=201)
def create_purchase(payload: PurchaseDirectCreate, db: Session = Depends(get_db)):
    """Receive stock immediately: apply stock and save as completed."""
    total_amount = sum(item.quantity * item.unit_price for item in payload.items)
    first_supplier = payload.items[0].supplier if payload.items else "Unknown"
    order_no = _next_order_no(db)

    purchase = PurchaseOrder(
        order_no=order_no,
        supplier=first_supplier,
        payment_mode=payload.payment_mode,
        total_amount=round(total_amount, 2),
        status="completed",
    )
    db.add(purchase)
    db.flush()

    _apply_stock(db, purchase, payload.items)

    db.commit()
    db.refresh(purchase)
    return purchase


# ── List all purchases ──────────────────────────────────────────────────────

@router.get("", response_model=List[RecentPurchaseOut])
def list_purchases(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Return recent purchases (all statuses), newest first."""
    purchases = (
        db.query(PurchaseOrder)
        .order_by(PurchaseOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for p in purchases:
        items_count = sum(i.quantity for i in p.items) if p.status == "completed" else 0
        result.append(
            RecentPurchaseOut(
                id=p.id,
                order_no=p.order_no,
                supplier=p.supplier,
                items_count=items_count,
                payment_mode=p.payment_mode,
                total_amount=p.total_amount,
                date=p.created_at,
                status=p.status,
            )
        )
    return result
