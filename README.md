# SwasthiQ — Pharmacy CRM

A full-stack Pharmacy CRM web application for managing inventory, sales, and purchase orders. Built with FastAPI + PostgreSQL on the backend and React + TypeScript + Tailwind CSS on the frontend.

---

## Features

- **Dashboard** — Live stat cards (today's sales, items sold, low stock, purchase orders total), tab-based view for Sales, Purchases, and Inventory
- **Sales** — Search medicines by name/batch, add to cart, bill patient, auto-decrement stock
- **Purchases** — Direct-input form (no search needed), save as pending draft or receive immediately, merge stock by batch number, complete pending orders later
- **Inventory** — Full medicine table with status filter, CSV export, overview stats (total items, active stock, low stock, total value)
- **Status auto-calculation** — `expired` → `out_of_stock` → `low_stock` (qty < 50) → `active`
- **Batch tracking** — Each purchase batch is stored separately; sale search shows all batches

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| Backend | FastAPI, SQLAlchemy ORM, Pydantic v2 |
| Database | PostgreSQL (Neon cloud) |
| HTTP Client | Axios |
| Icons | Lucide React |

---

## Project Structure

```
swastiq/
├── backend/
│   ├── main.py            # FastAPI app, CORS, router registration
│   ├── database.py        # SQLAlchemy engine, session, Base
│   ├── models.py          # ORM models (Medicine, Sale, SaleItem, PurchaseOrder, PurchaseItem)
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── requirements.txt
│   ├── .env               # DATABASE_URL, FRONTEND_URL
│   └── routers/
│       ├── dashboard.py   # GET /api/dashboard/summary, /recent-sales
│       ├── inventory.py   # CRUD /api/inventory/medicines, /overview
│       ├── sales.py       # POST /api/sales, GET /api/sales
│       └── purchases.py   # /api/purchases (create, draft, pending, complete, delete)
└── frontend/
    ├── src/
    │   ├── api/client.ts  # Axios instance + all API functions
    │   ├── types/index.ts # TypeScript interfaces
    │   ├── pages/
    │   │   ├── Dashboard.tsx   # Main CRM dashboard
    │   │   └── Inventory.tsx   # Standalone inventory page
    │   └── components/
    │       ├── Layout.tsx
    │       ├── StatCard.tsx
    │       └── AddMedicineModal.tsx
    ├── .env               # VITE_API_URL
    └── vite.config.ts
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL database (Neon or local)

---

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your values (see Environment Variables below)

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set VITE_API_URL

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated | `http://localhost:5173` |

### Frontend — `frontend/.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` |

---

## API Reference

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Stat card metrics (sales, orders, low stock, purchase total) |
| GET | `/api/dashboard/recent-sales` | Recent sales list |

### Inventory

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory/medicines` | List medicines (search, status, category, pagination) |
| POST | `/api/inventory/medicines` | Add new medicine |
| PUT | `/api/inventory/medicines/{id}` | Update medicine |
| PATCH | `/api/inventory/medicines/{id}/status` | Override status |
| GET | `/api/inventory/overview` | Total items, active stock, low stock, total value |

### Sales

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sales` | Create sale, decrement stock |
| GET | `/api/sales` | List all sales |

### Purchases

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/purchases` | Receive stock immediately (completed) |
| POST | `/api/purchases/draft` | Save as pending draft |
| GET | `/api/purchases/pending` | List pending drafts |
| POST | `/api/purchases/{id}/complete` | Finalize draft, apply stock |
| DELETE | `/api/purchases/{id}` | Delete pending draft |
| GET | `/api/purchases` | List all purchases |

---

## Building for Production

### Frontend

```bash
cd frontend

# Set production backend URL in .env
echo "VITE_API_URL=https://your-backend.com" > .env

npm run build
# Output: frontend/dist/
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, S3, etc.).

### Backend

```bash
cd backend

# Set production values in .env
# FRONTEND_URL=https://your-frontend.com
# DATABASE_URL=postgresql://...

# Run with production server
uvicorn main:app --host 0.0.0.0 --port 8000
```

Deploy to any Python host (Render, Railway, EC2, etc.).

---

## Database Models

| Model | Key Fields |
|---|---|
| `Medicine` | name, generic_name, category, batch_no, expiry_date, quantity, cost_price, mrp, supplier, status |
| `Sale` | invoice_no, patient_name, payment_mode, total_amount, status |
| `SaleItem` | sale_id, medicine_id, quantity, unit_price |
| `PurchaseOrder` | order_no, supplier, payment_mode, total_amount, status, draft_json |
| `PurchaseItem` | purchase_id, medicine_id, medicine_name, quantity, unit_price |

---

## Medicine Status Rules

Status is auto-calculated whenever quantity or expiry date changes:

```
expiry_date < today  →  expired
quantity == 0        →  out_of_stock
quantity < 50        →  low_stock
otherwise            →  active
```

Manual override (via PATCH) is allowed only for `expired` and `out_of_stock`.
