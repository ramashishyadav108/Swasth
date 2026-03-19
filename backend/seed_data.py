"""
Seed script – populates sample medicines, sales, and purchase orders.
Run once after tables have been created:
    python seed_data.py
"""

import sys
import os
from datetime import date, datetime, timedelta, timezone

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine, Base
from models import (
    Medicine,
    MedicineStatus,
    Sale,
    SaleItem,
    PurchaseOrder,
    PurchaseOrderStatus,
    PaymentMode,
    SaleStatus,
)


def compute_status(quantity: int, expiry_date: date) -> MedicineStatus:
    today = date.today()
    if expiry_date < today:
        return MedicineStatus.expired
    if quantity == 0:
        return MedicineStatus.out_of_stock
    if quantity < 50:
        return MedicineStatus.low_stock
    return MedicineStatus.active


# ── Sample data definitions ────────────────────────────────────────────────────

MEDICINES = [
    {
        "name": "Paracetamol 650mg",
        "generic_name": "Acetaminophen",
        "category": "Analgesic",
        "batch_no": "PCM-2024-0892",
        "expiry_date": date(2026, 8, 20),
        "quantity": 500,
        "cost_price": 15.0,
        "mrp": 25.0,
        "supplier": "MedSupply Co.",
    },
    {
        "name": "Omeprazole 20mg Capsule",
        "generic_name": "Omeprazole",
        "category": "Gastric",
        "batch_no": "OMP-2024-5873",
        "expiry_date": date(2025, 11, 10),
        "quantity": 45,
        "cost_price": 65.0,
        "mrp": 95.75,
        "supplier": "HealthCare Ltd.",
    },
    {
        "name": "Aspirin 75mg",
        "generic_name": "Aspirin",
        "category": "Anticoagulant",
        "batch_no": "ASP-2023-3421",
        "expiry_date": date(2024, 9, 30),
        "quantity": 300,
        "cost_price": 20.0,
        "mrp": 45.0,
        "supplier": "GreenMed",
    },
    {
        "name": "Atorvastatin 10mg",
        "generic_name": "Atorvastatin Benzoate",
        "category": "Cardiovascular",
        "batch_no": "AME-2024-0945",
        "expiry_date": date(2025, 10, 15),
        "quantity": 0,
        "cost_price": 145.0,
        "mrp": 195.0,
        "supplier": "PharmaCorp",
    },
    # Extra medicines to make the dashboard more interesting
    {
        "name": "Metformin 500mg",
        "generic_name": "Metformin Hydrochloride",
        "category": "Antidiabetic",
        "batch_no": "MET-2024-1122",
        "expiry_date": date(2026, 12, 31),
        "quantity": 320,
        "cost_price": 30.0,
        "mrp": 55.0,
        "supplier": "MedSupply Co.",
    },
    {
        "name": "Amoxicillin 500mg",
        "generic_name": "Amoxicillin Trihydrate",
        "category": "Antibiotic",
        "batch_no": "AMX-2024-3344",
        "expiry_date": date(2026, 6, 15),
        "quantity": 200,
        "cost_price": 45.0,
        "mrp": 75.0,
        "supplier": "HealthCare Ltd.",
    },
    {
        "name": "Cetirizine 10mg",
        "generic_name": "Cetirizine Hydrochloride",
        "category": "Antihistamine",
        "batch_no": "CTZ-2024-7788",
        "expiry_date": date(2027, 3, 1),
        "quantity": 150,
        "cost_price": 12.0,
        "mrp": 22.0,
        "supplier": "GreenMed",
    },
    {
        "name": "Pantoprazole 40mg",
        "generic_name": "Pantoprazole Sodium",
        "category": "Gastric",
        "batch_no": "PNT-2024-9900",
        "expiry_date": date(2026, 4, 30),
        "quantity": 30,
        "cost_price": 55.0,
        "mrp": 90.0,
        "supplier": "PharmaCorp",
    },
]

PURCHASE_ORDERS = [
    {
        "order_no": "PO-2024-0001",
        "supplier": "MedSupply Co.",
        "total_amount": 15000.0,
        "status": PurchaseOrderStatus.completed,
    },
    {
        "order_no": "PO-2024-0002",
        "supplier": "HealthCare Ltd.",
        "total_amount": 8500.0,
        "status": PurchaseOrderStatus.pending,
    },
    {
        "order_no": "PO-2024-0003",
        "supplier": "GreenMed",
        "total_amount": 4200.0,
        "status": PurchaseOrderStatus.pending,
    },
    {
        "order_no": "PO-2024-0004",
        "supplier": "PharmaCorp",
        "total_amount": 22000.0,
        "status": PurchaseOrderStatus.completed,
    },
]


def seed_medicines(db) -> dict:
    """Insert medicines and return a name→id map."""
    id_map = {}
    for m in MEDICINES:
        existing = db.query(Medicine).filter(Medicine.batch_no == m["batch_no"]).first()
        if existing:
            print(f"  [SKIP] Medicine batch {m['batch_no']} already exists.")
            id_map[m["name"]] = existing.id
            continue

        status = compute_status(m["quantity"], m["expiry_date"])
        med = Medicine(status=status, **m)
        db.add(med)
        db.flush()
        id_map[m["name"]] = med.id
        print(f"  [OK]   Added medicine: {m['name']} (status={status.value})")

    db.commit()
    return id_map


def seed_purchase_orders(db):
    for po in PURCHASE_ORDERS:
        existing = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.order_no == po["order_no"])
            .first()
        )
        if existing:
            print(f"  [SKIP] Purchase order {po['order_no']} already exists.")
            continue
        obj = PurchaseOrder(**po)
        db.add(obj)
        print(f"  [OK]   Added purchase order: {po['order_no']}")
    db.commit()


def seed_sales(db, medicine_id_map: dict):
    """
    Seed three sample sales matching the reference UI.
    Sales use fixed invoice numbers so re-running is idempotent.
    """
    sample_sales = [
        {
            "invoice_no": "INV-2024-1234",
            "patient_name": "Rajesh Kumar",
            "payment_mode": PaymentMode.card,
            "total_amount": 340.0,
            "status": SaleStatus.completed,
            "items": [
                {"name": "Paracetamol 650mg", "quantity": 2, "unit_price": 25.0},
                {"name": "Cetirizine 10mg", "quantity": 1, "unit_price": 22.0},
            ],
        },
        {
            "invoice_no": "INV-2024-1235",
            "patient_name": "Sarah Smith",
            "payment_mode": PaymentMode.cash,
            "total_amount": 145.0,
            "status": SaleStatus.completed,
            "items": [
                {"name": "Metformin 500mg", "quantity": 1, "unit_price": 55.0},
                {"name": "Cetirizine 10mg", "quantity": 1, "unit_price": 22.0},
            ],
        },
        {
            "invoice_no": "INV-2024-1236",
            "patient_name": "Michael Johnson",
            "payment_mode": PaymentMode.upi,
            "total_amount": 625.0,
            "status": SaleStatus.completed,
            "items": [
                {"name": "Amoxicillin 500mg", "quantity": 2, "unit_price": 75.0},
                {"name": "Metformin 500mg", "quantity": 2, "unit_price": 55.0},
                {"name": "Paracetamol 650mg", "quantity": 1, "unit_price": 25.0},
            ],
        },
    ]

    for s in sample_sales:
        existing = db.query(Sale).filter(Sale.invoice_no == s["invoice_no"]).first()
        if existing:
            print(f"  [SKIP] Sale {s['invoice_no']} already exists.")
            continue

        sale = Sale(
            invoice_no=s["invoice_no"],
            patient_name=s["patient_name"],
            payment_mode=s["payment_mode"],
            total_amount=s["total_amount"],
            status=s["status"],
        )
        db.add(sale)
        db.flush()

        for item in s["items"]:
            med_id = medicine_id_map.get(item["name"])
            if not med_id:
                print(f"  [WARN] Medicine '{item['name']}' not found, skipping item.")
                continue
            si = SaleItem(
                sale_id=sale.id,
                medicine_id=med_id,
                quantity=item["quantity"],
                unit_price=item["unit_price"],
            )
            db.add(si)

        print(f"  [OK]   Added sale: {s['invoice_no']} ({s['patient_name']})")

    db.commit()


def main():
    print("Creating tables (if not already present)...")
    Base.metadata.create_all(bind=engine)
    print("Tables ready.\n")

    db = SessionLocal()
    try:
        print("Seeding medicines...")
        medicine_id_map = seed_medicines(db)
        print()

        print("Seeding purchase orders...")
        seed_purchase_orders(db)
        print()

        print("Seeding sales...")
        seed_sales(db, medicine_id_map)
        print()

        print("Seed completed successfully.")
    except Exception as exc:
        db.rollback()
        print(f"ERROR during seeding: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
