from datetime import date, datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session

from database import get_db
from models import Medicine, MedicineStatus, Sale, SaleItem, PurchaseOrder, PurchaseOrderStatus
from schemas import DashboardSummary, RecentSaleOut

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Return key metrics for the dashboard summary cards.
    - today_sales: total sale amount for today
    - today_sales_change_pct: percentage change vs yesterday
    - items_sold_today: number of individual line items sold today
    - items_sold_orders: number of distinct sales (orders) today
    - low_stock_count: medicines currently flagged low_stock
    - purchase_orders_total: all purchase orders
    - purchase_orders_pending: pending purchase orders
    """
    today = date.today()
    yesterday = today - timedelta(days=1)

    # Today's sales aggregate
    today_result = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0.0))
        .filter(cast(Sale.created_at, Date) == today)
        .scalar()
    )
    today_sales: float = float(today_result)

    # Yesterday's sales aggregate
    yesterday_result = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0.0))
        .filter(cast(Sale.created_at, Date) == yesterday)
        .scalar()
    )
    yesterday_sales: float = float(yesterday_result)

    if yesterday_sales > 0:
        change_pct = ((today_sales - yesterday_sales) / yesterday_sales) * 100
    else:
        change_pct = 0.0 if today_sales == 0 else 100.0

    # Items sold today (sum of quantities from SaleItems whose sale is today)
    items_sold_today_result = (
        db.query(func.coalesce(func.sum(SaleItem.quantity), 0))
        .join(Sale, SaleItem.sale_id == Sale.id)
        .filter(cast(Sale.created_at, Date) == today)
        .scalar()
    )
    items_sold_today: int = int(items_sold_today_result)

    # Number of orders placed today
    items_sold_orders: int = (
        db.query(func.count(Sale.id))
        .filter(cast(Sale.created_at, Date) == today)
        .scalar()
    )

    # Low stock count
    low_stock_count: int = (
        db.query(func.count(Medicine.id))
        .filter(Medicine.status == MedicineStatus.low_stock)
        .scalar()
    )

    # Purchase orders — total value and pending count
    purchase_orders_total_result = (
        db.query(func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0)).scalar()
    )
    purchase_orders_total: float = float(purchase_orders_total_result)
    purchase_orders_pending: int = (
        db.query(func.count(PurchaseOrder.id))
        .filter(PurchaseOrder.status == PurchaseOrderStatus.pending)
        .scalar()
    )

    return DashboardSummary(
        today_sales=round(today_sales, 2),
        today_sales_change_pct=round(change_pct, 2),
        items_sold_today=items_sold_today,
        items_sold_orders=items_sold_orders,
        low_stock_count=low_stock_count,
        purchase_orders_total=purchase_orders_total,
        purchase_orders_pending=purchase_orders_pending,
    )


@router.get("/recent-sales", response_model=List[RecentSaleOut])
def get_recent_sales(limit: int = 10, db: Session = Depends(get_db)):
    """Return the most recent sales with computed items_count."""
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")

    sales = (
        db.query(Sale)
        .order_by(Sale.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for sale in sales:
        items_count = sum(item.quantity for item in sale.items)
        result.append(
            RecentSaleOut(
                id=sale.id,
                invoice_no=sale.invoice_no,
                patient_name=sale.patient_name,
                items_count=items_count,
                payment_mode=sale.payment_mode,
                total_amount=sale.total_amount,
                date=sale.created_at,
                status=sale.status,
            )
        )
    return result
